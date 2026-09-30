<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

// Routes Quick Edit clicks on site-title/tagline/logo to SiteIdentityModal
// instead of the BlockTextEditor (those values live in wp_options).
class IdentityTagger
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR = 'data-extendify-quick-edit-identity';

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const KIND_BY_BLOCK = [
        'core/site-title'   => 'title',
        'core/site-tagline' => 'tagline',
        'core/site-logo'    => 'logo',
    ];

    public static function init()
    {
        add_filter('render_block', [self::class, 'tag'], 12, 2);
    }

    public static function tag($html, $block)
    {
        if (is_admin() || !is_string($html) || $html === '') {
            return $html;
        }
        // Don't bloat anonymous-viewer HTML with markers they can't act on.
        if (!is_user_logged_in() || !current_user_can('manage_options')) {
            return $html;
        }
        $name = $block['blockName'] ?? '';
        $kind = self::KIND_BY_BLOCK[$name] ?? null;
        if (!$kind) {
            return $html;
        }
        $tp = new \WP_HTML_Tag_Processor($html);
        if (!$tp->next_tag()) {
            return $html;
        }
        // Some pipelines re-fire render_block; avoid double-tagging.
        if ($tp->get_attribute(self::ATTR) !== null) {
            return $html;
        }
        $tp->set_attribute(self::ATTR, $kind);
        return $tp->get_updated_html();
    }
}
