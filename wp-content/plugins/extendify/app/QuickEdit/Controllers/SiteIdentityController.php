<?php

namespace Extendify\QuickEdit\Controllers;

defined('ABSPATH') || die('No direct access.');

// Bypasses SaveController because title/tagline/logo live in wp_options,
// not post_content. logo_id = 0 deletes the option (Customizer parity).
class SiteIdentityController
{
    public static function init()
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes()
    {
        register_rest_route('extendify/v1', '/quick-edit/site-identity', [
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
        // Site-wide settings — manage_options rather than edit_posts.
        return current_user_can('manage_options');
    }

    public static function handle(\WP_REST_Request $req)
    {
        if ($req->get_method() === 'GET') {
            $logoId = (int) get_option('site_logo');
            $logoUrl = $logoId ? wp_get_attachment_image_url($logoId, 'medium') : '';
            // WP's sanitize_option filter esc_html()s blogname/blogdescription
            // before storage, so the DB literally contains entities like
            // `&#039;`. React sets `value` as a property (no markup parsing,
            // no entity decoding), so the input would show `&#039;` instead of
            // `'`. update_option re-applies esc_html on save, so the round-trip
            // is consistent.
            return new \WP_REST_Response([
                'title'    => wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES),
                'tagline'  => wp_specialchars_decode(get_bloginfo('description'), ENT_QUOTES),
                'logo_id'  => $logoId,
                'logo_url' => $logoUrl ?: '',
            ]);
        }

        $params = $req->get_json_params();
        if (!is_array($params)) {
            $params = [];
        }
        if (isset($params['title'])) {
            update_option('blogname', sanitize_text_field($params['title']));
        }
        if (isset($params['tagline'])) {
            update_option('blogdescription', sanitize_text_field($params['tagline']));
        }
        if (array_key_exists('logo_id', $params)) {
            $lid = (int) $params['logo_id'];
            if ($lid) {
                update_option('site_logo', $lid);
            } else {
                delete_option('site_logo');
            }
        }
        return new \WP_REST_Response(['ok' => true]);
    }
}
