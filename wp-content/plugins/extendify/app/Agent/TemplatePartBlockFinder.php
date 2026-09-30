<?php

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

// Resolves a block inside a template-part by the same preorder numbering
// TagTemplateParts assigns at render time, so a client blockId (read off a
// data-extendify-part-block-id attribute) maps back to the parsed block.
// Shared by SaveController (write) and WPController::getBlockCode (read) so the
// two halves can never resolve a different block for the same id.
class TemplatePartBlockFinder
{
    // These resolve by ref; template parts by slug.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const REF_POST_TYPES = [
        'block' => 'wp_block',
        'navigation' => 'wp_navigation',
    ];

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const COMPOSITE_ID_PATTERN = '/^(block|navigation):(\d+):(\d+)$/';

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const REF_BLOCKS = [
        'core/block' => 'block',
        'core/navigation' => 'navigation',
    ];

    // Both taggers emit this; this class parses it back.
    public static function refPrefix(string $type, array $block): string
    {
        return $type . ':' . (int) ($block['attrs']['ref'] ?? 0) . ':';
    }

    // An inline navigation keeps its items in the containing post.
    public static function isRefNav(array $block): bool
    {
        return ($block['blockName'] ?? '') === 'core/navigation'
            && !empty($block['attrs']['ref']);
    }

    // These live in their own post, so the id has to name that post.
    public static function parseCompositeId($blockId)
    {
        if (!preg_match(self::COMPOSITE_ID_PATTERN, (string) $blockId, $matches)) {
            return null;
        }
        return [
            'postType' => self::REF_POST_TYPES[$matches[1]],
            'ref' => (int) $matches[2],
            'seq' => (int) $matches[3],
        ];
    }

    public static function owningPost($blockId, \WP_Post $container)
    {
        $composite = self::parseCompositeId($blockId);
        if ($composite === null) {
            return preg_match('/^\d+$/', (string) $blockId) && (int) $blockId > 0
                ? ['post' => $container, 'blockId' => (int) $blockId]
                : null;
        }
        $post = \get_post($composite['ref']);
        if (!$post || $post->post_type !== $composite['postType']) {
            return null;
        }
        if (!self::rendersRef($container, $composite['ref'])) {
            return null;
        }
        return ['post' => $post, 'blockId' => $composite['seq']];
    }

    // Without this, any wp_block on the site is writable from any page.
    public static function rendersRef(\WP_Post $container, int $ref): bool
    {
        return self::contentRendersRef($container->post_content, $ref);
    }

    // An untouched theme-file part has no post, so containment reads its markup.
    public static function contentRendersRef(string $content, int $ref): bool
    {
        $seen = [];
        return self::reachesRef(\parse_blocks($content), $ref, $seen);
    }

    private static function reachesRef(array $blocks, int $ref, array &$seen): bool
    {
        foreach ($blocks as $block) {
            if (!is_array($block)) {
                continue;
            }
            $name = $block['blockName'] ?? '';
            if (isset(self::REF_BLOCKS[$name])) {
                $blockRef = (int) ($block['attrs']['ref'] ?? 0);
                if ($blockRef === $ref) {
                    return true;
                }
                if ($blockRef && self::reachesInside("ref:{$blockRef}", $ref, $seen)) {
                    return true;
                }
            }
            if ($name === 'core/template-part' && !empty($block['attrs']['slug'])) {
                $slug = (string) $block['attrs']['slug'];
                if (self::reachesInside("part:{$slug}", $ref, $seen)) {
                    return true;
                }
            }
            if (!empty($block['innerBlocks']) && self::reachesRef($block['innerBlocks'], $ref, $seen)) {
                return true;
            }
        }
        return false;
    }

    // A pattern can reference itself, directly or through a part.
    private static function reachesInside(string $key, int $ref, array &$seen): bool
    {
        if (isset($seen[$key])) {
            return false;
        }
        $seen[$key] = true;
        $content = self::contentFor($key);
        return $content === null
            ? false
            : self::reachesRef(\parse_blocks($content), $ref, $seen);
    }

    private static function contentFor(string $key)
    {
        list($kind, $value) = explode(':', $key, 2);
        if ($kind === 'ref') {
            $post = \get_post((int) $value);
            return $post ? $post->post_content : null;
        }
        $template = \get_block_template(
            \wp_get_theme()->get_stylesheet() . '//' . $value,
            'wp_template_part'
        );
        return $template ? $template->content : null;
    }

    // Lets the render-time tagger number a ref'd post the way find() walks it.
    public static function outline(array $blocks): array
    {
        $max = 0;
        $visited = [];
        self::find($blocks, 0, $max, $visited);
        return $visited;
    }

    // Their content belongs to another post's id space.
    private static function opensOwnScope(string $name): bool
    {
        return in_array($name, ['core/template-part', 'core/block'], true);
    }

    // Diverging from TagTemplateParts' numbering here drifts every later id.
    public static function find(
        array $blocks,
        int $targetId,
        int &$maxCounter = 0,
        array &$visited = []
    ) {
        $counter = 0;
        $found   = null;

        $walk = function (array &$list, array $pathSoFar)
 use (&$walk, &$counter, &$found, $targetId, &$visited) {
            foreach ($list as $i => &$block) {
                if ($found !== null) {
                    return;
                }
                $name = $block['blockName'] ?? '';
                if ($name === '') {
                    if (!empty($block['innerBlocks'])) {
                        $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']));
                    }
                    continue;
                }
                if (self::opensOwnScope($name)) {
                    continue;
                }
                $counter++;
                $visited[] = ['c' => $counter, 'n' => $name];
                if ($counter === $targetId) {
                    $found = ['block' => $block, 'path' => array_merge($pathSoFar, [$i])];
                    return;
                }
                // The tagger skips their render-injected subtree.
                if (in_array($name, TagTemplateParts::$ignored, true)) {
                    continue;
                }
                if (!empty($block['innerBlocks'])) {
                    $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']));
                }
            }
            unset($block);
        };
        $walk($blocks, []);
        $maxCounter = $counter;

        return $found;
    }

    // Stamps in find()'s order so a splice resolves the id the client read.
    public static function stamp(array $blocks): array
    {
        $seq = 0;
        return self::stampWalk($blocks, $seq);
    }

    private static function stampWalk(array $list, int &$seq): array
    {
        foreach ($list as $i => $block) {
            $name = $block['blockName'] ?? '';
            if ($name === '') {
                if (!empty($block['innerBlocks'])) {
                    $list[$i]['innerBlocks'] = self::stampWalk($block['innerBlocks'], $seq);
                }
                continue;
            }
            if (self::opensOwnScope($name)) {
                continue;
            }
            $seq++;
            $list[$i][PostBlockFinder::REF_KEY] = $seq;
            if (in_array($name, TagTemplateParts::$ignored, true)) {
                continue;
            }
            if (!empty($block['innerBlocks'])) {
                $list[$i]['innerBlocks'] = self::stampWalk($block['innerBlocks'], $seq);
            }
        }
        return $list;
    }
}
