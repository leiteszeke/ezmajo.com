<?php

namespace Extendify\Agent\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\PostBlockFinder;
use Extendify\Agent\TemplatePartBlockFinder;

// Ops splice in request order against one stamped parse, so earlier ops never
// invalidate later ids; untouched blocks round-trip byte-for-byte.
class UpdateBlocksController
{
    // Labels match the words the apply helpers use for a missing id.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const ID_FIELDS = [
        'blockId' => 'block id',
        'anchorId' => 'anchor block',
        'targetId' => 'target block',
    ];

    // Keyed by the model-facing container word; the placeholder paragraph
    // marks the wrapped block's slot.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const WRAP_TEMPLATES = [
        'core/column' => '<!-- wp:columns --><div class="wp-block-columns">'
            . '<!-- wp:column --><div class="wp-block-column">'
            . '<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->'
            . '</div><!-- /wp:column -->'
            . '</div><!-- /wp:columns -->',
        'core/group' => '<!-- wp:group {"layout":{"type":"constrained"}} -->'
            . '<div class="wp-block-group">'
            . '<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->'
            . '</div><!-- /wp:group -->',
    ];

    /**
     * Apply a batch of block operations to a post.
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function updateBlocks(\WP_REST_Request $request)
    {
        $params = $request->get_json_params();
        $params = is_array($params) ? $params : [];

        $partSlug = (string) ($params['partSlug'] ?? '');
        $inTemplatePart = $partSlug !== '';

        if ($inTemplatePart) {
            $post = self::resolveTemplatePart($partSlug);
            if (\is_wp_error($post)) {
                return new \WP_REST_Response(['error' => $post->get_error_message()], 404);
            }
            if (!\current_user_can('edit_theme_options')) {
                return new \WP_REST_Response(['error' => 'Forbidden for this template part'], 403);
            }
            $blocks = TemplatePartBlockFinder::stamp(\parse_blocks($post->post_content));
        } else {
            $postId = (int) ($params['postId'] ?? 0);
            $post = $postId ? \get_post($postId) : null;
            if (!$post) {
                return new \WP_REST_Response(['error' => 'Post not found'], 404);
            }
            if (!\current_user_can('edit_post', $post->ID)) {
                return new \WP_REST_Response(['error' => 'Forbidden for this post'], 403);
            }
            $blocks = PostBlockFinder::stamp(\parse_blocks($post->post_content));
        }

        $operations = isset($params['operations']) && is_array($params['operations'])
            ? $params['operations']
            : [];
        if (!$operations) {
            return new \WP_REST_Response(['error' => 'operations required'], 400);
        }

        $trees = [$post->ID => self::newTree($post, $blocks)];

        $applied = [];
        $refused = [];
        foreach ($operations as $operation) {
            $operation = is_array($operation) ? $operation : [];
            $op = (string) ($operation['op'] ?? '');
            $reportKey = $op === 'add' ? 'anchorId' : 'blockId';
            $reportId = $operation[$reportKey] ?? null;

            $routed = self::route($operation, $trees, $post);
            if (\is_wp_error($routed)) {
                $refused[] = [$reportKey => $reportId, 'reason' => $routed->get_error_message()];
                continue;
            }
            $owner = $routed['owner'];
            $operation = $routed['operation'];
            $blockId = (int) ($operation['blockId'] ?? 0);

            if ($op === 'add') {
                $reason = self::applyAdd(
                    $trees[$owner]['blocks'],
                    (int) ($operation['anchorId'] ?? 0),
                    $operation,
                    $trees[$owner]['wrappers']
                );
            } elseif ($op === 'wrap') {
                $reason = self::applyWrap(
                    $trees[$owner]['blocks'],
                    $blockId,
                    $operation,
                    $trees[$owner]['wrappers']
                );
            } elseif (in_array($op, ['edit', 'delete', 'move'], true)) {
                $reason = self::applyOperation($trees[$owner]['blocks'], $op, $blockId, $operation);
            } else {
                $reason = 'unknown op';
            }

            if ($reason !== null) {
                $refused[] = [$reportKey => $reportId, 'reason' => $reason];
                continue;
            }
            $trees[$owner]['dirty'] = true;
            $applied[] = ['op' => $op, $reportKey => $reportId, 'owner' => $owner];
        }

        $failed = [];
        foreach ($trees as $tree) {
            if (!$tree['dirty']) {
                continue;
            }
            $update = \wp_update_post([
                'ID' => $tree['post']->ID,
                'post_content' => \wp_slash(\serialize_blocks($tree['blocks'])),
            ], true);
            if (\is_wp_error($update)) {
                $failed[$tree['post']->ID] = $update->get_error_message();
            }
        }

        // An earlier post is already written, so a failed save reports itself.
        foreach ($applied as $index => $entry) {
            if (!isset($failed[$entry['owner']])) {
                continue;
            }
            $refused[] = [
                'blockId' => $entry['blockId'] ?? ($entry['anchorId'] ?? null),
                'reason' => $failed[$entry['owner']],
            ];
            unset($applied[$index]);
        }

        return new \WP_REST_Response([
            'applied' => array_values(array_map(function ($entry) {
                unset($entry['owner']);
                return $entry;
            }, $applied)),
            'refused' => $refused,
        ], 200);
    }

    // A composite id names another post, and a splice can't reach across two of
    // them — so an operation whose ids disagree on the owner has nowhere to land.
    private static function route(array $operation, array &$trees, \WP_Post $container)
    {
        $owner = null;
        foreach (self::ID_FIELDS as $field => $label) {
            if (!isset($operation[$field])) {
                continue;
            }
            $resolved = TemplatePartBlockFinder::owningPost($operation[$field], $container);
            if ($resolved === null) {
                return new \WP_Error('not_found', "{$label} not found in this post");
            }
            $postId = $resolved['post']->ID;
            if ($owner !== null && $owner !== $postId) {
                return new \WP_Error('spans_posts', 'one operation cannot span two posts');
            }
            if (!isset($trees[$postId])) {
                if (!\current_user_can('edit_post', $postId)) {
                    return new \WP_Error('forbidden', 'Forbidden for the post that owns this block');
                }
                $trees[$postId] = self::newTree(
                    $resolved['post'],
                    TemplatePartBlockFinder::stamp(\parse_blocks($resolved['post']->post_content))
                );
            }
            $owner = $postId;
            $operation[$field] = $resolved['blockId'];
        }

        return ['owner' => $owner ?? $container->ID, 'operation' => $operation];
    }

    // `wrappers` is per-post: an add can only join a container this same batch
    // created in the same post.
    private static function newTree(\WP_Post $post, array $blocks): array
    {
        return ['post' => $post, 'blocks' => $blocks, 'wrappers' => [], 'dirty' => false];
    }

    // Resolve via WP's own resolver so the save lands on the post WP renders
    // from; no wp_id means an uncustomized theme-file part with nothing to
    // save to. Mirrors QuickEdit's SaveController::resolveSourcePost.
    private static function resolveTemplatePart(string $slug)
    {
        $stylesheet = \wp_get_theme()->get_stylesheet();
        $template = \get_block_template("{$stylesheet}//{$slug}", 'wp_template_part');
        if (!$template) {
            return new \WP_Error('not_found', 'Template part not found');
        }
        $post = empty($template->wp_id) ? null : \get_post($template->wp_id);
        if ($post) {
            return $post;
        }
        return self::forkThemeTemplatePart($template, $stylesheet, $slug);
    }

    // An untouched part has no post, so the first edit has to mint one.
    private static function forkThemeTemplatePart($template, string $stylesheet, string $slug)
    {
        $postId = \wp_insert_post([
            'post_type' => 'wp_template_part',
            'post_name' => $slug,
            'post_title' => empty($template->title) ? $slug : $template->title,
            'post_content' => $template->content,
            'post_status' => 'publish',
        ], true);
        if (\is_wp_error($postId)) {
            return $postId;
        }

        // Absent the theme term, get_block_template never resolves the fork again.
        \wp_set_object_terms($postId, $stylesheet, 'wp_theme');
        if (!empty($template->area)) {
            \wp_set_object_terms($postId, $template->area, 'wp_template_part_area');
        }

        $post = \get_post($postId);
        return $post ? $post : new \WP_Error('not_found', 'Template part not found');
    }

    // Returns null when the op spliced in, or the refusal reason.
    private static function applyOperation(array &$blocks, string $op, int $blockId, array $operation)
    {
        if ($op === 'edit') {
            $newBlock = self::parseSingleBlock((string) ($operation['block'] ?? ''));
            if (!$newBlock) {
                return 'block must parse to exactly one block';
            }
            $path = PostBlockFinder::pathByRef($blocks, $blockId);
            if ($path === null) {
                return 'block id not found in this post';
            }
            $newBlock = self::carryStamps(self::blockAtPath($blocks, $path), $newBlock);
            $blocks = self::spliceAtPath($blocks, $path, $newBlock);
            return null;
        }

        if ($op === 'delete') {
            $path = PostBlockFinder::pathByRef($blocks, $blockId);
            if ($path === null) {
                return 'block id not found in this post';
            }
            $blocks = self::spliceAtPath($blocks, $path, null);
            return null;
        }

        $position = (string) ($operation['position'] ?? '');
        if (!in_array($position, ['before', 'after'], true)) {
            return "position must be 'before' or 'after'";
        }
        $targetId = (int) ($operation['targetId'] ?? 0);
        if ($targetId === $blockId) {
            return 'cannot move a block relative to itself';
        }
        $sourcePath = PostBlockFinder::pathByRef($blocks, $blockId);
        if ($sourcePath === null) {
            return 'block id not found in this post';
        }
        $targetPath = PostBlockFinder::pathByRef($blocks, $targetId);
        if ($targetPath === null) {
            return 'target block not found in this post';
        }
        if (array_slice($targetPath, 0, count($sourcePath)) === $sourcePath) {
            return 'target is inside the moved block';
        }

        $moved = self::blockAtPath($blocks, $sourcePath);
        $blocks = self::spliceAtPath($blocks, $sourcePath, null);
        // Extraction shifted indexes; the stamp still finds the target.
        $targetPath = PostBlockFinder::pathByRef($blocks, $targetId);
        $blocks = self::insertAtPath($blocks, $targetPath, $moved, $position);
        return null;
    }

    // Returns null when the block spliced in next to its anchor, or the refusal reason.
    private static function applyAdd(array &$blocks, int $anchorId, array $operation, array &$sharedWrappers)
    {
        $position = (string) ($operation['position'] ?? '');
        if (!in_array($position, ['before', 'after'], true)) {
            return "position must be 'before' or 'after'";
        }
        $newBlock = self::parseSingleBlock((string) ($operation['block'] ?? ''));
        if (!$newBlock) {
            return 'block must parse to exactly one block';
        }
        $anchorPath = PostBlockFinder::pathByRef($blocks, $anchorId);
        if ($anchorPath === null) {
            return 'anchor block not found in this post';
        }
        // A bare column is only valid as a core/columns child, so its anchor
        // decides the splice here — the code owns the wrapper, never the model.
        if (($newBlock['blockName'] ?? '') === 'core/column') {
            return self::spliceColumn($blocks, $anchorPath, $newBlock, $position, $anchorId, $sharedWrappers);
        }
        $blocks = self::insertAtPath($blocks, $anchorPath, $newBlock, $position);
        return null;
    }

    // A pre-existing section never absorbs an add — the only wrapper an add
    // joins is one this same batch created.
    private static function spliceColumn(
        array &$blocks,
        array $anchorPath,
        array $newBlock,
        string $position,
        int $anchorId,
        array &$sharedWrappers
    ) {
        if ((self::blockAtPath($blocks, $anchorPath)['blockName'] ?? '') === 'core/column') {
            $blocks = self::insertAtPath($blocks, $anchorPath, $newBlock, $position);
            return null;
        }

        $key = $anchorId . ':' . $position;
        if (isset($sharedWrappers[$key])) {
            $wrapperPath = PostBlockFinder::pathByRef($blocks, $sharedWrappers[$key]);
            $wrapper = self::blockAtPath($blocks, $wrapperPath);
            $lastChild = array_merge($wrapperPath, ['innerBlocks', count($wrapper['innerBlocks']) - 1]);
            $blocks = self::insertAtPath($blocks, $lastChild, $newBlock, 'after');
            return null;
        }

        $wrapper = self::parseSingleBlock(
            '<!-- wp:columns --><div class="wp-block-columns">'
            . '<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->'
            . '</div><!-- /wp:columns -->'
        );
        $wrapper['innerBlocks'][0] = $newBlock;
        // Render stamps are positive, so a negative ref can't collide.
        $wrapper[PostBlockFinder::REF_KEY] = -(count($sharedWrappers) + 1);
        $sharedWrappers[$key] = $wrapper[PostBlockFinder::REF_KEY];
        $blocks = self::insertAtPath($blocks, $anchorPath, $wrapper, $position);
        return null;
    }

    // Returns null when the container spliced in around the block, or the
    // refusal reason. The wrapped subtree is reused verbatim — bytes and id
    // stamps survive, so later ops in the batch can still anchor to it.
    private static function applyWrap(array &$blocks, int $blockId, array $operation, array &$sharedWrappers)
    {
        $container = (string) ($operation['container'] ?? '');
        if (!isset(self::WRAP_TEMPLATES[$container])) {
            return 'unknown container';
        }
        $path = PostBlockFinder::pathByRef($blocks, $blockId);
        if ($path === null) {
            return 'block id not found in this post';
        }
        $block = self::blockAtPath($blocks, $path);
        // Pulling a column out of core/columns leaves the parent unserializable.
        if (($block['blockName'] ?? '') === 'core/column') {
            return 'a column cannot be wrapped';
        }
        $isColumn = $container === 'core/column';
        if ($isColumn && self::joinWrapShell($blocks, $path, $block, $blockId, $sharedWrappers)) {
            return null;
        }
        $wrapper = self::parseSingleBlock(self::WRAP_TEMPLATES[$container]);
        if ($container === 'core/column') {
            $wrapper['innerBlocks'][0]['innerBlocks'][0] = $block;
            // "Wrap this in a column and add another beside it": a later
            // column add anchored to the wrapped block joins this wrapper.
            $wrapper[PostBlockFinder::REF_KEY] = -(count($sharedWrappers) + 1);
            $sharedWrappers[$blockId . ':after'] = $wrapper[PostBlockFinder::REF_KEY];
            $sharedWrappers[$blockId . ':before'] = $wrapper[PostBlockFinder::REF_KEY];
            $sharedWrappers['wrap-shell'] = $wrapper[PostBlockFinder::REF_KEY];
        } else {
            $wrapper['innerBlocks'][0] = $block;
        }
        $blocks = self::spliceAtPath($blocks, $path, $wrapper);
        return null;
    }

    // Two column wraps in one batch mean side by side — join the first shell.
    private static function joinWrapShell(
        array &$blocks,
        array $path,
        array $block,
        int $blockId,
        array &$sharedWrappers
    ) {
        if (!isset($sharedWrappers['wrap-shell'])) {
            return false;
        }
        $shellRef = $sharedWrappers['wrap-shell'];
        $shellPath = PostBlockFinder::pathByRef($blocks, $shellRef);
        // A shell inside the wrapped block would leave with it — start fresh.
        if ($shellPath === null || array_slice($shellPath, 0, count($path)) === $path) {
            return false;
        }
        $blocks = self::spliceAtPath($blocks, $path, null);
        $shellPath = PostBlockFinder::pathByRef($blocks, $shellRef);
        $shell = self::blockAtPath($blocks, $shellPath);
        $column = self::parseSingleBlock(
            '<!-- wp:column --><div class="wp-block-column">'
            . '<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->'
            . '</div><!-- /wp:column -->'
        );
        $column['innerBlocks'][0] = $block;
        $lastChild = array_merge($shellPath, ['innerBlocks', count($shell['innerBlocks']) - 1]);
        $blocks = self::insertAtPath($blocks, $lastChild, $column, 'after');
        $sharedWrappers[$blockId . ':after'] = $shellRef;
        $sharedWrappers[$blockId . ':before'] = $shellRef;
        return true;
    }

    private static function blockAtPath(array $blocks, array $path)
    {
        $node = $blocks;
        foreach ($path as $key) {
            $node = $node[$key];
        }
        return $node;
    }

    // Position can't tell an untouched child from a swapped one.
    private static function carryStamps(array $old, array $new): array
    {
        if (isset($old[PostBlockFinder::REF_KEY])) {
            $new[PostBlockFinder::REF_KEY] = $old[PostBlockFinder::REF_KEY];
        }
        $oldInner = isset($old['innerBlocks']) && is_array($old['innerBlocks'])
            ? $old['innerBlocks']
            : [];
        $newInner = isset($new['innerBlocks']) && is_array($new['innerBlocks'])
            ? $new['innerBlocks']
            : [];
        foreach ($newInner as $i => $child) {
            if (!isset($oldInner[$i]) || !is_array($oldInner[$i]) || !is_array($child)) {
                continue;
            }
            if (\serialize_blocks([$oldInner[$i]]) !== \serialize_blocks([$child])) {
                continue;
            }
            $newInner[$i] = self::carryStamps($oldInner[$i], $child);
        }
        if ($newInner) {
            $new['innerBlocks'] = $newInner;
        }
        return $new;
    }

    private static function parseSingleBlock(string $markup)
    {
        $parsed = array_values(array_filter(
            \parse_blocks($markup),
            static function ($block) {
                return is_array($block) && !empty($block['blockName']);
            }
        ));
        return count($parsed) === 1 ? $parsed[0] : null;
    }

    // Path elements alternate index / 'innerBlocks' / …; null deletes.
    private static function spliceAtPath(array $list, array $path, $newBlock): array
    {
        $head = ($path[0] ?? null);
        if (!is_int($head) || !isset($list[$head])) {
            return $list;
        }

        $rest = array_slice($path, 1);
        if (!$rest) {
            if ($newBlock === null) {
                array_splice($list, $head, 1);
            } else {
                $list[$head] = $newBlock;
            }
            return $list;
        }

        if ($rest[0] !== 'innerBlocks') {
            return $list;
        }

        $childPath = array_slice($rest, 1);
        $inner = isset($list[$head]['innerBlocks']) && is_array($list[$head]['innerBlocks'])
            ? $list[$head]['innerBlocks']
            : [];

        // Drop the child's innerContent placeholder too, or serialize_blocks
        // misaligns the remaining children.
        if ($newBlock === null && count($childPath) === 1) {
            $innerContent = isset($list[$head]['innerContent']) && is_array($list[$head]['innerContent'])
                ? $list[$head]['innerContent']
                : [];
            $list[$head]['innerContent'] = self::withoutNthPlaceholder($innerContent, $childPath[0]);
        }

        $list[$head]['innerBlocks'] = self::spliceAtPath($inner, $childPath, $newBlock);
        return $list;
    }

    private static function withoutNthPlaceholder(array $innerContent, int $n): array
    {
        $seen = -1;
        foreach ($innerContent as $i => $chunk) {
            if (is_string($chunk)) {
                continue;
            }
            $seen++;
            if ($seen === $n) {
                array_splice($innerContent, $i, 1);
                break;
            }
        }
        return $innerContent;
    }

    private static function insertAtPath(array $list, array $path, array $block, string $position): array
    {
        $head = ($path[0] ?? null);
        if (!is_int($head) || !isset($list[$head])) {
            return $list;
        }

        $rest = array_slice($path, 1);
        if (!$rest) {
            array_splice($list, $head + ($position === 'after' ? 1 : 0), 0, [$block]);
            return $list;
        }

        if ($rest[0] !== 'innerBlocks') {
            return $list;
        }

        $childPath = array_slice($rest, 1);
        // Mirror the delete case: a new child needs its innerContent
        // placeholder too, or serialize_blocks misaligns the children.
        if (count($childPath) === 1) {
            $innerContent = isset($list[$head]['innerContent']) && is_array($list[$head]['innerContent'])
                ? $list[$head]['innerContent']
                : [];
            $list[$head]['innerContent'] = self::withPlaceholderAt(
                $innerContent,
                $childPath[0] + ($position === 'after' ? 1 : 0)
            );
        }

        $inner = isset($list[$head]['innerBlocks']) && is_array($list[$head]['innerBlocks'])
            ? $list[$head]['innerBlocks']
            : [];
        $list[$head]['innerBlocks'] = self::insertAtPath($inner, $childPath, $block, $position);
        return $list;
    }

    // Inserts a null so it becomes the nth placeholder; past the last one it
    // lands right after it, before any trailing closing markup.
    private static function withPlaceholderAt(array $innerContent, int $n): array
    {
        $seen = -1;
        foreach ($innerContent as $i => $chunk) {
            if (is_string($chunk)) {
                continue;
            }
            $seen++;
            if ($seen === $n) {
                array_splice($innerContent, $i, 0, [null]);
                return $innerContent;
            }
        }
        for ($i = count($innerContent) - 1; $i >= 0; $i--) {
            if (!is_string($innerContent[$i])) {
                array_splice($innerContent, $i + 1, 0, [null]);
                return $innerContent;
            }
        }
        $innerContent[] = null;
        return $innerContent;
    }
}
