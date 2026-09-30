<?php

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

// Shared by the read and write halves so they can never resolve a
// different block for the same TagBlocks id.
class PostBlockFinder
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const REF_KEY = 'extendifyBlockRef';

    // Stamps survive splices and reorders, so ids stay resolvable while a
    // batch reshapes the tree. serialize_blocks ignores the extra key.
    public static function stamp(array $blocks): array
    {
        $seq = 0;
        $walk = function (array $list) use (&$walk, &$seq) {
            foreach ($list as $i => $block) {
                if (empty($block['blockName'])) {
                    continue;
                }

                // Untagged at render time — skip whole, uncounted, to match.
                if (in_array($block['blockName'], TagBlocks::$ignored, true)) {
                    continue;
                }

                // Numbered off the post it renders from, never this one.
                if (isset(TagBlocks::$refContainers[$block['blockName']])) {
                    continue;
                }

                $seq++;
                $list[$i][self::REF_KEY] = $seq;
                if (!empty($block['innerBlocks'])) {
                    $list[$i]['innerBlocks'] = $walk($block['innerBlocks']);
                }
            }
            return $list;
        };
        return $walk($blocks);
    }

    // Path elements alternate index / 'innerBlocks' / index …
    public static function pathByRef(array $blocks, int $ref)
    {
        foreach ($blocks as $i => $block) {
            if (($block[self::REF_KEY] ?? null) === $ref) {
                return [$i];
            }
            if (!empty($block['innerBlocks']) && is_array($block['innerBlocks'])) {
                $childPath = self::pathByRef($block['innerBlocks'], $ref);
                if ($childPath !== null) {
                    return array_merge([$i, 'innerBlocks'], $childPath);
                }
            }
        }
        return null;
    }

    public static function find(array $blocks, int $targetId)
    {
        $path = self::pathByRef(self::stamp($blocks), $targetId);
        if ($path === null) {
            return null;
        }

        $node = $blocks;
        foreach ($path as $key) {
            $node = $node[$key];
        }
        return ['block' => $node, 'path' => $path];
    }
}
