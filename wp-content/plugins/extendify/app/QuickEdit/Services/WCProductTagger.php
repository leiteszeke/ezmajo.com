<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// Independent of TagBlocks: product blocks inside a product-collection
// are in TagBlocks::$ignored (the loop iteration would blow up block-id
// counting), so we can't piggyback on the agent's tagger.
class WCProductTagger
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_ID = 'data-extendify-quick-edit-product-id';
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR_FIELD = 'data-extendify-quick-edit-product-field';

    // blockName => WCProductController field key. Both image blocks
    // resolve to `image` (featured image); editing extra gallery slots
    // isn't in v1. The long description (`description` field, post_content)
    // is tagged via the woocommerce_product_tabs filter below — no
    // single block renders just the description, so we wrap the tab
    // panel instead of going through render_block.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const FIELDS_BY_BLOCK = [
        'core/post-title'                       => 'name',
        'core/post-excerpt'                     => 'short_description',
        'woocommerce/product-summary'           => 'short_description',
        'woocommerce/product-price'             => 'price',
        'woocommerce/product-image'             => 'image',
        'woocommerce/product-image-gallery'     => 'image',
    ];

    public static function init()
    {
        add_filter('render_block', [self::class, 'tag'], 11, 3);
        // The long description renders inside WC's tabs panel via
        // `woocommerce_product_description_tab` — not via any block we
        // can hook with `render_block`. Wrap the tab's callback output
        // with our PRODUCT_ID + FIELD attrs so a click anywhere in the
        // panel resolves to product:description on the live page.
        // FSE templates that use the `woocommerce/product-details`
        // block delegate to the same tab callbacks, so this covers
        // both classic and block-based product templates.
        add_filter('woocommerce_product_tabs', [self::class, 'wrapDescriptionTab'], 99);
    }

    /**
     * @param string|mixed $html
     * @param array $block
     * @param object|null $blockObj WP_Block instance (may be null on older WP)
     */
    public static function tag($html, $block, $blockObj = null)
    {
        if (is_admin() || !is_string($html) || $html === '') {
            return $html;
        }
        if (!is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return $html;
        }
        if (!function_exists('wc_get_product')) {
            return $html;
        }
        $name = $block['blockName'] ?? '';
        $field = self::FIELDS_BY_BLOCK[$name] ?? null;
        if (!$field) {
            return $html;
        }
        $pid = self::productIdFromBlock($blockObj);
        if (!$pid || get_post_type($pid) !== 'product') {
            return $html;
        }
        if (!current_user_can('edit_post', $pid)) {
            return $html;
        }
        $tp = new \WP_HTML_Tag_Processor($html);
        if (!$tp->next_tag()) {
            return $html;
        }
        if ($tp->get_attribute(self::ATTR_ID) !== null) {
            return $html;
        }
        $tp->set_attribute(self::ATTR_ID, (string) $pid);
        $tp->set_attribute(self::ATTR_FIELD, $field);
        return $tp->get_updated_html();
    }

    // Inside a product-template loop, WP_Block->context['postId'] is the looped
    // product; on a single-product page, the queried object is the product.
    private static function productIdFromBlock($blockObj): int
    {
        if (is_object($blockObj) && !empty($blockObj->context['postId'])) {
            return (int) $blockObj->context['postId'];
        }
        if (function_exists('is_product') && is_product()) {
            return (int) get_queried_object_id();
        }
        return 0;
    }

    /**
     * @param array $tabs
     */
    public static function wrapDescriptionTab($tabs)
    {
        if (!is_array($tabs) || !isset($tabs['description']) || !is_array($tabs['description'])) {
            return $tabs;
        }
        if (is_admin() || !is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return $tabs;
        }
        $orig = $tabs['description']['callback'] ?? null;
        if (!is_callable($orig)) {
            return $tabs;
        }
        $tabs['description']['callback'] = function () use ($orig) {
            $pid = (int) get_the_ID();
            if (!$pid || get_post_type($pid) !== 'product' || !current_user_can('edit_post', $pid)) {
                call_user_func($orig);
                return;
            }
            printf(
                '<div %1$s="%3$s" %2$s="description">',
                esc_attr(self::ATTR_ID),
                esc_attr(self::ATTR_FIELD),
                esc_attr((string) $pid)
            );
            call_user_func($orig);
            echo '</div>';
        };
        return $tabs;
    }
}
