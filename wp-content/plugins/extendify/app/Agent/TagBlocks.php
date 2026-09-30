<?php

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

class TagBlocks
{
    // Counting a loop's per-item copies or a cart's drawer spends ids the save
    // walk can't resolve.
    // Public so SaveController + WPController can share the same list.
    public static $ignored = [
        'core/query',
        'core/post-template',
        'core/post-content',
        'core/comments',
        'core/comment-template',
        'woocommerce/product-collection',
        'woocommerce/product-template',
        'woocommerce/mini-cart',
        'woocommerce/cart',
        'woocommerce/checkout',
    ];

    // Shared with PostBlockFinder so the save walk skips what this declined to count.
    public static $refContainers = [
        'core/block' => 'wp_block',
    ];

    // TagTemplateParts numbers the interior from 1 under the part's own slug.
    private static function partPrefix(array $block): string
    {
        return 'part:' . (string) ($block['attrs']['slug'] ?? '') . ':';
    }

    private static function isTemplatePart(array $block): bool
    {
        return ($block['blockName'] ?? '') === 'core/template-part';
    }

    // Blocks whose interior belongs to another post's id space.
    private static function scopePrefix(array $block): string
    {
        if (TemplatePartBlockFinder::isRefNav($block)) {
            return TemplatePartBlockFinder::refPrefix('navigation', $block);
        }
        return self::isTemplatePart($block) ? self::partPrefix($block) : '';
    }

    // `prefix` names the post an id belongs to; empty means this post.
    // A `foreign` frame is numbered by another tagger, so nothing in it counts.
    // A `ref` frame's ids are only ever resolved by TemplatePartBlockFinder.
    private static function newFrame(
        string $prefix = '',
        bool $foreign = false,
        bool $ref = false
    ): array {
        return [
            'seq'          => 0,
            'id_stack'     => [],
            'pushed_stack' => [],
            'skip_depth'   => 0, // >0 while inside an ignored subtree
            'prefix'       => $prefix,
            'foreign'      => $foreign,
            'ref'          => $ref,
        ];
    }

    // Diverging from TemplatePartBlockFinder here drifts every later id.
    private static function counts(array $frame, string $name, array $block): bool
    {
        if ($frame['skip_depth'] !== 0) {
            return false;
        }
        if (empty($frame['ref'])) {
            return !in_array($name, self::$ignored, true);
        }
        return !self::isTemplatePart($block);
    }

    public static function init()
    {
        \add_filter('the_content', [self::class, 'enterScope'], 0);
        \add_filter('the_content', [self::class, 'leaveScope'], PHP_INT_MAX);

        \add_filter('pre_render_block', [self::class, 'pre'], 10, 2);
        \add_filter('render_block', [self::class, 'post'], 10, 2);
    }

    public static function enterScope($content)
    {
        if (is_admin()) {
            return $content;
        }

        if (empty($GLOBALS['extendify_agent_scope'])) {
            $GLOBALS['extendify_agent_scope'] = [
                'depth'  => 0,
                'frames' => [],
            ];
        }
        $GLOBALS['extendify_agent_scope']['depth']++;
        $GLOBALS['extendify_agent_scope']['frames'][] = self::newFrame();
        return $content;
    }

    public static function leaveScope($content)
    {
        if (is_admin()) {
            return $content;
        }
        $S =& $GLOBALS['extendify_agent_scope'];
        if (!empty($S['depth'])) {
            $S['depth']--;
            array_pop($S['frames']);
        }
        return $content;
    }

    public static function pre($pre, $parsed_block)
    {
        if (is_admin() || !is_array($parsed_block) || empty($parsed_block['blockName'])) {
            return $pre;
        }

        $S = $GLOBALS['extendify_agent_scope'] ?? null;
        if (!$S || ($S['depth'] ?? 0) !== 1 || empty($S['frames'])) {
            return $pre;
        } // only outer the_content

        $i = count($S['frames']) - 1;
        $frame = $S['frames'][$i];

        $name = $parsed_block['blockName'];

        // Another tagger owns this interior's numbering.
        if (!empty($frame['foreign'])) {
            $frame['pushed_stack'][] = ['counts' => false, 'name' => $name];
            $GLOBALS['extendify_agent_scope']['frames'][$i] = $frame;
            return $pre;
        }

        // The pattern's blocks render inline but live in another post, so they
        // are numbered off that post instead of counted here.
        if (isset(self::$refContainers[$name]) && $frame['skip_depth'] === 0) {
            $GLOBALS['extendify_agent_scope']['frames'][] = self::newFrame(
                TemplatePartBlockFinder::refPrefix('block', $parsed_block),
                false,
                true
            );
            return $pre;
        }

        $counts = self::counts($frame, $name, $parsed_block);
        if ($counts) {
            $frame['seq']++;
            $frame['id_stack'][] = $frame['prefix'] . $frame['seq'];
        }
        $frame['pushed_stack'][] = ['counts' => $counts, 'name' => $name];

        // Raised after counting so a counted leaf still hides its rendered subtree.
        if (in_array($name, self::$ignored, true)) {
            $frame['skip_depth']++;
        }

        $GLOBALS['extendify_agent_scope']['frames'][$i] = $frame;

        // Pops from the interior must not reach the page's stack.
        $scope = self::scopePrefix($parsed_block);
        if ($scope !== '' && $frame['skip_depth'] === 0) {
            $GLOBALS['extendify_agent_scope']['frames'][] = self::newFrame($scope, true);
        }

        return $pre;
    }

    public static function post($content, $parsed_block)
    {
        $S = $GLOBALS['extendify_agent_scope'] ?? null;
        if (!$S || empty($S['frames'])) {
            return $content;
        }

        $i = count($S['frames']) - 1;
        $frame = $S['frames'][$i];

        $name = is_array($parsed_block) ? ($parsed_block['blockName'] ?? null) : null;

        // core/block renders through a nested WP_Block::render, so this fires twice.
        if ($name !== null && isset(self::$refContainers[$name])) {
            if ($frame['prefix'] === TemplatePartBlockFinder::refPrefix('block', $parsed_block)) {
                array_pop($GLOBALS['extendify_agent_scope']['frames']);
                return $content;
            }
        }

        $scope = is_array($parsed_block) ? self::scopePrefix($parsed_block) : '';
        if ($scope !== '' && $frame['prefix'] === $scope) {
            array_pop($GLOBALS['extendify_agent_scope']['frames']);
            $i = count($GLOBALS['extendify_agent_scope']['frames']) - 1;
            $frame = $GLOBALS['extendify_agent_scope']['frames'][$i];
        }
        $navPrefix = (is_array($parsed_block) && TemplatePartBlockFinder::isRefNav($parsed_block))
            ? TemplatePartBlockFinder::refPrefix('navigation', $parsed_block)
            : '';

        // A loop item's wrapper hits render_block alone, so popping spends the
        // container's id on the item.
        $top = $frame['pushed_stack'] ? $frame['pushed_stack'][count($frame['pushed_stack']) - 1] : null;
        if ($top === null || $top['name'] !== $name) {
            return $content;
        }

        array_pop($frame['pushed_stack']);
        $pushed = $top['counts'];
        $id     = ($pushed && !empty($frame['id_stack'])) ? array_pop($frame['id_stack']) : null;

        // Inject only when: outer scope, we counted this block, html present, not admin
        if (!is_admin() && ($S['depth'] ?? 0) === 1 && $pushed && $id && $content && $name) {
            $tp = new \WP_HTML_Tag_Processor($content);
            $value = (string) $id;

            // Move cursor to the first start tag in the fragment
            if ($tp->next_tag()) {
                $tp->set_attribute('data-extendify-agent-block-id', $value);
                $content = $tp->get_updated_html();
            }
        }

        if ($navPrefix && $content) {
            $content = TagTemplateParts::stampNavItems(
                $content,
                $navPrefix,
                (int) $parsed_block['attrs']['ref'],
                'data-extendify-agent-block-id'
            );
        }

        // If this block ends an ignored subtree, exit skip mode
        if ($name && in_array($name, self::$ignored, true) && $frame['skip_depth'] > 0) {
            $frame['skip_depth']--;
        }

        $GLOBALS['extendify_agent_scope']['frames'][$i] = $frame;
        return $content;
    }
}
