<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// Surfaces the wp_navigation ref + per-item index so the front-end can
// route nav-item edits to WPNavigationController. Without this, nav items
// inside ref-based navigations 409 on save (the parsed core/navigation has
// empty innerBlocks; items live in a separate wp_navigation CPT).
class NavRefTagger
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_REF = 'data-extendify-quick-edit-nav-ref';
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_ITEM_INDEX = 'data-extendify-quick-edit-nav-item-index';

    // Stack so nested navigations (submenus) get their own counter.
    private static $navStack = [];

    public static function init()
    {
        add_action('template_redirect', [self::class, 'reset']);
        add_filter('pre_render_block', [self::class, 'onPreRenderBlock'], 10, 2);
        // Priority 9 runs before TagTemplateParts (10) so the agent's first-tag
        // matcher isn't thrown off by our attr on the nav wrapper.
        add_filter('render_block', [self::class, 'onRenderBlock'], 9, 2);
    }

    public static function reset()
    {
        self::$navStack = [];
    }

    public static function onRenderBlock(string $html, array $block): string
    {
        if (is_admin() || !is_string($html) || $html === '') {
            return $html;
        }
        if (!is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return $html;
        }

        $name = $block['blockName'] ?? '';

        if ($name === 'core/navigation') {
            $ref = (int) ($block['attrs']['ref'] ?? 0);
            $html = self::tagFirstElement(
                $html,
                self::ATTR_REF,
                $ref > 0 ? (string) $ref : ''
            );
            // Pop after tagging; inner items have all rendered by now.
            if (!empty(self::$navStack)) {
                array_pop(self::$navStack);
            }
            return $html;
        }

        if ($name === 'core/navigation-link' || $name === 'core/navigation-submenu') {
            if (empty(self::$navStack)) {
                return $html;
            }
            $top = count(self::$navStack) - 1;
            $idx = self::$navStack[$top]['counter'];
            self::$navStack[$top]['counter']++;
            $html = self::tagFirstElement($html, self::ATTR_ITEM_INDEX, (string) $idx);
            return $html;
        }

        return $html;
    }

    // Push the frame BEFORE the navigation's render_callback runs so
    // inner items can find it on render_block.
    public static function onPreRenderBlock($pre, array $parsed_block)
    {
        if (($parsed_block['blockName'] ?? '') !== 'core/navigation') {
            return $pre;
        }
        $ref = (int) ($parsed_block['attrs']['ref'] ?? 0);
        self::$navStack[] = [
            'ref' => $ref,
            'counter' => 0,
        ];
        return $pre; // never short-circuit
    }

    private static function tagFirstElement(string $html, string $attr, string $value): string
    {
        if ($value === '') {
            return $html;
        }
        $tp = new \WP_HTML_Tag_Processor($html);
        if ($tp->next_tag()) {
            if ($tp->get_attribute($attr) !== null) {
                return $html;
            }
            $tp->set_attribute($attr, $value);
            return $tp->get_updated_html();
        }
        return $html;
    }
}
