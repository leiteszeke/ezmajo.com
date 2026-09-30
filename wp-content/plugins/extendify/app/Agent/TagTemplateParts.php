<?php

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

// Preorder numbering, per template-part scope.
class TagTemplateParts
{
    // Dynamic self-rendering blocks: their rendered output contains blocks that
    // aren't in the parsed tree (a mini-cart drawer, a loop's per-item copies),
    // so counting that output inflates every later id beyond what the static
    // TemplatePartBlockFinder can resolve. Each is counted as one opaque leaf
    // here and its rendered subtree skipped; the finder shares this list and
    // treats them as leaves too (counted, not descended into).
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

    private static $frames = [];
    // Entries keyed by block-name; see onRenderBlock for why a plain stack lost
    // tags on nav items 5+.
    private static $blockStack = [];

    public static function init()
    {
        add_action('template_redirect', [self::class, 'reset']);
        add_filter('render_block_data', [self::class, 'onRenderBlockData'], 10, 2);
        add_filter('render_block', [self::class, 'onRenderBlock'], 10, 2);
    }

    public static function reset()
    {
        self::$frames = [];
        self::$blockStack = [];
    }

    private static function isTemplatePart(array $b): bool
    {
        return (($b['blockName'] ?? '') === 'core/template-part');
    }

    private static function isSyncedPattern(array $b): bool
    {
        return (($b['blockName'] ?? '') === 'core/block');
    }

    private static function inFrame(string $prefix): bool
    {
        return (self::currentFrame()['prefix'] ?? '') === $prefix;
    }

    // A prefix opens an id space that belongs to another post; `nav` marks the
    // one whose items are stamped from the finished html instead of counted.
    private static function newFrame(
        string $label,
        string $slug,
        string $prefix = '',
        bool $nav = false
    ): array {
        return [
            'label' => $label,
            'slug' => $slug,
            'prefix' => $prefix,
            'nav' => $nav,
            'seq' => 0,
            'skip_depth' => 0,
        ];
    }

    private static function currentFrame()
    {
        return self::$frames ? self::$frames[count(self::$frames) - 1] : null;
    }

    private static function setCurrentFrame(array $frame)
    {
        self::$frames[count(self::$frames) - 1] = $frame;
    }

    private static function labelForPart(array $b): string
    {
        if (!empty($b['attrs']['area'])) {
            return (string) $b['attrs']['area'];
        }
        if (!empty($b['attrs']['slug'])) {
            return (string) $b['attrs']['slug'];
        }
        return 'template-part';
    }

    public static function onRenderBlockData(array $block, array $source): array
    {
        $name = $block['blockName'] ?? '';
        if ($name === '') {
            return $block;
        }

        if (self::isTemplatePart($block)) {
            self::$frames[] = self::newFrame(
                self::labelForPart($block),
                $block['attrs']['slug'] ?? ''
            );
            $block['attrs']['__extendify_scope_open'] = 1;
            return $block;
        }

        if (empty(self::$frames)) {
            return $block;
        }

        $frame = self::currentFrame();
        if (!$frame) {
            return $block;
        }

        // The pattern's blocks render inline; counting them here would inflate
        // every later id in the part.
        if (self::isSyncedPattern($block) && ($frame['skip_depth'] ?? 0) === 0) {
            self::$frames[] = self::newFrame(
                $frame['label'],
                $frame['slug'] ?? '',
                TemplatePartBlockFinder::refPrefix('block', $block)
            );
            return $block;
        }

        // A ref nav's items are numbered off its post once it has rendered, so
        // nothing inside its frame is counted here.
        if (($frame['nav'] ?? false)) {
            return $block;
        }

        // render_block_data runs top-down (before a block's own render), so an
        // ignored block is counted here as a leaf and the skip is raised *after*
        // — its descendants then render with skip_depth > 0 and are not counted.
        if (($frame['skip_depth'] ?? 0) === 0) {
            $frame['seq']++;
            self::$blockStack[] = [
                'name' => $name,
                'id' => ($frame['prefix'] ?? '') . $frame['seq'],
                'label' => $frame['label'],
                'slug' => $frame['slug'] ?? '',
            ];
        }
        if (in_array($name, self::$ignored, true)) {
            $frame['skip_depth'] = ($frame['skip_depth'] ?? 0) + 1;
        }
        self::setCurrentFrame($frame);

        if (TemplatePartBlockFinder::isRefNav($block)) {
            self::$frames[] = self::newFrame(
                $frame['label'],
                $frame['slug'] ?? '',
                TemplatePartBlockFinder::refPrefix('navigation', $block),
                true
            );
        }

        return $block;
    }

    // A page-list renders pages that aren't blocks, so a menu holding one is
    // left unstamped rather than wrongly numbered.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const STAMPABLE_NAV_ITEMS = ['core/navigation-link', 'core/navigation-submenu'];

    public static function stampNavItems(
        string $html,
        string $prefix,
        int $ref,
        string $idAttr,
        array $extra = []
    ): string {
        $navPost = \get_post($ref);
        if (!$navPost || $navPost->post_type !== 'wp_navigation') {
            return $html;
        }

        $outline = TemplatePartBlockFinder::outline(parse_blocks($navPost->post_content));
        foreach ($outline as $entry) {
            if (!in_array($entry['n'], self::STAMPABLE_NAV_ITEMS, true)) {
                return $html;
            }
        }

        $tp = new \WP_HTML_Tag_Processor($html);
        $index = 0;
        while ($tp->next_tag('LI') && isset($outline[$index])) {
            $class = (string) $tp->get_attribute('class');
            if (strpos($class, 'wp-block-navigation-item') === false) {
                continue;
            }
            $tp->set_attribute($idAttr, $prefix . $outline[$index]['c']);
            foreach ($extra as $attr => $value) {
                $tp->set_attribute($attr, $value);
            }
            $index++;
        }

        return $tp->get_updated_html();
    }

    public static function onRenderBlock(string $html, array $block): string
    {
        $name = $block['blockName'] ?? '';
        if ($name === '') {
            return $html;
        }

        if (self::isTemplatePart($block) && !empty($block['attrs']['__extendify_scope_open'])) {
            array_pop(self::$frames);
            return $html;
        }

        if (empty(self::$frames)) {
            return $html;
        }

        // Popping on the second pass would take the part's own frame.
        if (self::isSyncedPattern($block)) {
            if (self::inFrame(TemplatePartBlockFinder::refPrefix('block', $block))) {
                array_pop(self::$frames);
            }
            return $html;
        }

        // A ref nav's items get stamped from the finished html, not counted here.
        $navPrefix = TemplatePartBlockFinder::isRefNav($block)
            ? TemplatePartBlockFinder::refPrefix('navigation', $block)
            : '';
        if ($navPrefix && self::inFrame($navPrefix)) {
            array_pop(self::$frames);
        } elseif (self::currentFrame()['nav'] ?? false) {
            return $html;
        }

        $frame = self::currentFrame();
        $skip = $frame['skip_depth'] ?? 0;

        // render_block runs bottom-up, so only the outermost ignored block was
        // counted and only it may be stamped.
        if (in_array($name, self::$ignored, true)) {
            $frame['skip_depth'] = max(0, $skip - 1);
            self::setCurrentFrame($frame);
            if ($skip > 1) {
                return $html;
            }
        } elseif ($skip > 0) {
            return $html;
        }

        // core/navigation fires render_block with no render_block_data, so a
        // straight pop eats an outer block's entry.
        $info = null;
        $infoIndex = -1;
        for ($i = count(self::$blockStack) - 1; $i >= 0; $i--) {
            if (self::$blockStack[$i]['name'] === $name) {
                $info = self::$blockStack[$i];
                $infoIndex = $i;
                break;
            }
        }
        if ($info !== null) {
            array_splice(self::$blockStack, $infoIndex, 1);
        } else {
            $frame = self::currentFrame();
            if ($frame) {
                $frame['seq']++;
                self::setCurrentFrame($frame);
                $info = [
                    'name'  => $name,
                    'id'    => ($frame['prefix'] ?? '') . $frame['seq'],
                    'label' => $frame['label'],
                    'slug'  => $frame['slug'] ?? '',
                ];
            }
        }

        if ($info && $html) {
            $tp = new \WP_HTML_Tag_Processor($html);
            if ($tp->next_tag()) {
                $tp->set_attribute('data-extendify-part-block-id', (string) $info['id']);
                $tp->set_attribute('data-extendify-part', $info['label']);
                if (!empty($info['slug'])) {
                    $tp->set_attribute('data-extendify-part-slug', $info['slug']);
                }
                $html = $tp->get_updated_html();
            }
        }
        if ($navPrefix && $info) {
            $extra = ['data-extendify-part' => $info['label']];
            if (!empty($info['slug'])) {
                $extra['data-extendify-part-slug'] = $info['slug'];
            }
            $html = self::stampNavItems(
                $html,
                $navPrefix,
                (int) $block['attrs']['ref'],
                'data-extendify-part-block-id',
                $extra
            );
        }
        return $html;
    }
}
