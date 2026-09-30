<?php

namespace Extendify\QuickEdit\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\QuickEdit\Schemas\Registry;
use Extendify\QuickEdit\Services\BlockFingerprint;

// Ref-based navigations (core/navigation with `ref`) keep their items in
// a separate wp_navigation post that SaveController's findBlock walk
// can't reach. This endpoint takes a (navPostId, itemIndex) addressed
// by NavRefTagger and applies the schema patch directly.
class WPNavigationController
{
    public static function init()
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes()
    {
        register_rest_route('extendify/v1', '/quick-edit/wp-navigation', [
            'methods'             => 'POST',
            'permission_callback' => [self::class, 'permissionCallback'],
            'callback'            => [self::class, 'handle'],
        ]);
    }

    public static function permissionCallback(): bool
    {
        return current_user_can(Config::$requiredCapability);
    }

    public static function handle(\WP_REST_Request $req)
    {
        $body = $req->get_json_params() ?: [];
        $navPostId = (int) ($body['navPostId'] ?? 0);
        $itemIndex = (int) ($body['itemIndex'] ?? -1);
        $blockType = (string) ($body['blockType'] ?? '');
        $patches = is_array($body['patches'] ?? null) ? $body['patches'] : [];

        if ($navPostId <= 0 || $itemIndex < 0 || $blockType === '' || !$patches) {
            return new \WP_REST_Response(
                ['error' => 'navPostId, itemIndex, blockType, patches required'],
                400
            );
        }
        if (!in_array($blockType, ['core/navigation-link', 'core/navigation-submenu'], true)) {
            return new \WP_REST_Response(
                ['error' => 'unsupported blockType for wp-navigation save'],
                400
            );
        }

        $navPost = get_post($navPostId);
        if (!$navPost || $navPost->post_type !== 'wp_navigation') {
            return new \WP_REST_Response(['error' => 'wp_navigation post not found'], 404);
        }
        if (!current_user_can('edit_post', $navPostId)) {
            return new \WP_REST_Response(['error' => 'forbidden for this navigation'], 403);
        }

        $schema = Registry::get($blockType);
        if (!$schema) {
            return new \WP_REST_Response(
                ['error' => 'no schema for blockType', 'blockType' => $blockType],
                400
            );
        }

        $blocks = parse_blocks($navPost->post_content);

        $found = self::findNthNavItem($blocks, $itemIndex);
        if ($found === null) {
            return new \WP_REST_Response(
                ['error' => 'nav item not found at index', 'itemIndex' => $itemIndex],
                404
            );
        }

        $target = $found['block'];
        if (($target['blockName'] ?? '') !== $blockType) {
            return new \WP_REST_Response([
                'error' => 'block type mismatch',
                'expected' => $blockType,
                'actual' => $target['blockName'] ?? null,
            ], 409);
        }

        // Positional itemIndex can address a different same-type item when the
        // render-time and parse-time orderings of a nested menu diverge; refuse
        // when the resolved item doesn't carry the clicked item's fingerprint.
        $fingerprint = is_array($body['fingerprint'] ?? null) ? $body['fingerprint'] : [];
        if ($fingerprint && !BlockFingerprint::matches($target, $fingerprint)) {
            return new \WP_REST_Response([
                'error'     => 'block fingerprint mismatch',
                'itemIndex' => $itemIndex,
            ], 409);
        }

        foreach ($patches as $patch) {
            if (!is_array($patch)) {
                continue;
            }
            $fieldKey = (string) ($patch['fieldKey'] ?? '');
            if ($fieldKey === '') {
                continue;
            }
            $target = $schema->apply($target, $fieldKey, $patch['value'] ?? null);
        }

        $blocks = self::replaceAtPath($blocks, $found['path'], $target);
        $newContent = serialize_blocks($blocks);

        $update = wp_update_post([
            'ID'           => $navPostId,
            'post_content' => wp_slash($newContent),
        ], true);
        if (is_wp_error($update)) {
            return new \WP_REST_Response(['error' => $update->get_error_message()], 500);
        }

        return new \WP_REST_Response(['ok' => true]);
    }

    // Pre-order, counting only navigation-link/-submenu so the index
    // matches NavRefTagger's render-time counter.
    private static function findNthNavItem(array $blocks, int $targetIndex)
    {
        $counter = 0;
        $found = null;

        $walk = function (array $list, array $pathSoFar) use (&$walk, &$counter, &$found, $targetIndex) {
            foreach ($list as $i => $block) {
                $name = $block['blockName'] ?? '';
                $isItem = $name === 'core/navigation-link' || $name === 'core/navigation-submenu';
                if ($isItem) {
                    if ($counter === $targetIndex) {
                        $found = ['block' => $block, 'path' => array_merge($pathSoFar, [$i])];
                        return;
                    }
                    $counter++;
                }
                if (!empty($block['innerBlocks'])) {
                    $walk($block['innerBlocks'], array_merge($pathSoFar, [$i, 'innerBlocks']));
                    if ($found !== null) {
                        return;
                    }
                }
            }
        };
        $walk($blocks, []);

        return $found;
    }

    // Mirrors SaveController::replaceBlockAtPath.
    private static function replaceAtPath(array $blocks, array $path, array $newBlock): array
    {
        if (empty($path)) {
            return $blocks;
        }
        $head = $path[0];
        $rest = array_slice($path, 1);
        if (!is_int($head) || !isset($blocks[$head])) {
            return $blocks;
        }
        if (empty($rest)) {
            $blocks[$head] = $newBlock;
            return $blocks;
        }
        if ($rest[0] === 'innerBlocks') {
            $blocks[$head]['innerBlocks'] = self::replaceAtPath(
                $blocks[$head]['innerBlocks'] ?? [],
                array_slice($rest, 1),
                $newBlock
            );
        }
        return $blocks;
    }
}
