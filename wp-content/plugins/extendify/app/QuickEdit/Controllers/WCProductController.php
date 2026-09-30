<?php

namespace Extendify\QuickEdit\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// Bypasses SaveController; product data lives on the product object,
// not in post_content. Image = featured image (set_post_thumbnail).
class WCProductController
{
    public static function init()
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes()
    {
        register_rest_route('extendify/v1', '/quick-edit/product', [
            [
                'methods'             => 'GET',
                'permission_callback' => [self::class, 'permissionCallback'],
                'callback'            => [self::class, 'handle'],
            ],
            [
                'methods'             => 'POST',
                'permission_callback' => [self::class, 'permissionCallback'],
                'callback'            => [self::class, 'handle'],
            ],
        ]);
    }

    public static function permissionCallback(): bool
    {
        // Per-product check runs in handle() once we have the product_id.
        return current_user_can(Config::$requiredCapability);
    }

    public static function handle(\WP_REST_Request $req)
    {
        $pid = (int) $req->get_param('product_id');
        if ($pid <= 0) {
            return new \WP_REST_Response(['error' => 'product_id required'], 400);
        }
        if (get_post_type($pid) !== 'product') {
            return new \WP_REST_Response(['error' => 'not a product'], 400);
        }
        if (!current_user_can('edit_post', $pid)) {
            return new \WP_REST_Response(['error' => 'cannot edit this product'], 403);
        }
        if (!function_exists('wc_get_product')) {
            return new \WP_REST_Response(['error' => 'WooCommerce not active'], 500);
        }

        if ($req->get_method() === 'GET') {
            $post = get_post($pid);
            $product = wc_get_product($pid);
            $thumb = (int) get_post_thumbnail_id($pid);
            $thumbUrl = $thumb ? wp_get_attachment_image_url($thumb, 'medium') : '';
            return new \WP_REST_Response([
                'name'              => $post ? $post->post_title : '',
                'short_description' => $post ? $post->post_excerpt : '',
                'description'       => $post ? $post->post_content : '',
                'regular_price'     => $product ? (string) $product->get_regular_price() : '',
                'sale_price'        => $product ? (string) $product->get_sale_price() : '',
                'image_id'          => $thumb,
                'image_url'         => $thumbUrl ?: '',
            ]);
        }

        $field = (string) $req->get_param('field');
        $value = $req->get_param('value');

        if ($field === 'name') {
            $res = wp_update_post([
                'ID'         => $pid,
                'post_title' => wp_slash(sanitize_text_field((string) $value)),
            ], true);
            if (is_wp_error($res)) {
                return new \WP_REST_Response(['error' => $res->get_error_message()], 500);
            }
        } elseif ($field === 'short_description') {
            $res = wp_update_post([
                'ID'           => $pid,
                'post_excerpt' => wp_slash(wp_kses_post((string) $value)),
            ], true);
            if (is_wp_error($res)) {
                return new \WP_REST_Response(['error' => $res->get_error_message()], 500);
            }
        } elseif ($field === 'description') {
            $res = wp_update_post([
                'ID'           => $pid,
                'post_content' => wp_slash(wp_kses_post((string) $value)),
            ], true);
            if (is_wp_error($res)) {
                return new \WP_REST_Response(['error' => $res->get_error_message()], 500);
            }
        } elseif ($field === 'price') {
            if (!is_array($value)) {
                return new \WP_REST_Response(
                    ['error' => 'price expects {regular, sale}'],
                    400
                );
            }
            $product = wc_get_product($pid);
            if (!$product) {
                return new \WP_REST_Response(['error' => 'product not found'], 404);
            }
            $regular = isset($value['regular']) ? wc_format_decimal($value['regular']) : '';
            $sale = isset($value['sale']) && $value['sale'] !== ''
                ? wc_format_decimal($value['sale'])
                : '';
            $product->set_regular_price($regular);
            $product->set_sale_price($sale);
            // _price is the displayed price; set_regular/set_sale don't auto-sync it.
            if ($sale !== '' && (float) $sale < (float) $regular) {
                $product->set_price($sale);
            } else {
                $product->set_price($regular);
            }
            $product->save();
        } elseif ($field === 'image') {
            $attId = (int) $value;
            if ($attId <= 0) {
                return new \WP_REST_Response(['error' => 'attachment_id required'], 400);
            }
            if (!wp_attachment_is_image($attId)) {
                return new \WP_REST_Response(['error' => 'not an image attachment'], 400);
            }
            set_post_thumbnail($pid, $attId);
        } else {
            return new \WP_REST_Response(
                ['error' => 'unknown field: ' . $field],
                400
            );
        }
        return new \WP_REST_Response(['ok' => true]);
    }
}
