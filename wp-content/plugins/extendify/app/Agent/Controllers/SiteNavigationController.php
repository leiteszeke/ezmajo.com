<?php

/**
 * Site Navigation Controller
 */

namespace Extendify\Agent\Controllers;

/**
 * Site Navigation Controller
 */
class SiteNavigationController
{
    /**
     * Initialize the controller to add filters and actions.
     *
     * @return void
     */
    public static function init()
    {
        \add_filter('render_block', function ($block_content, $block) {
            if ($block['blockName'] === 'core/navigation' && array_key_exists('ref', $block['attrs'])) {
                // Add the id of the menu to the menu itself
                $block_content = str_replace(
                    '<nav',
                    '<nav data-extendify-menu-id="' . $block['attrs']['ref'] . '"',
                    $block_content
                );
            }
            return $block_content;
        }, 10, 2);
    }

    /**
     * Get a list of published navigation items from the site.
     *
     * @param \WP_REST_Request $request The REST API request
     * @return \WP_REST_Response.
     */
    public static function getSiteNavigation($request): \WP_REST_Response
    {
        $navigation = get_posts([
            'numberposts' => -1,
            'post_status' => 'publish',
            'post_type' => 'wp_navigation',
            'include' => $request->get_param('only') ? explode(',', $request->get_param('only')) : []
        ]);

        return new \WP_REST_Response(array_map(function ($item) {
            return [
                "id" => $item->ID,
                "name" => $item->post_title,
                "content" => $item->post_content
            ];
        }, $navigation), 200);
    }

    /**
     * Render the navigation menu content based on the provided menu ID.
     *
     * @param \WP_REST_Request $request The REST API request
     * @return string The rendered navigation menu content.
     */
    public static function renderNavigationMenu($request)
    {
        if (!$request->get_param('content')) {
            return '';
        }

        add_filter('render_block_core/navigation', function ($content, $block) {
            if (empty($block['attrs']['extendifyMenuId'])) {
                return $content;
            }
            $menu_id = $block['attrs']['extendifyMenuId'];

            return str_replace(
                'data-extendify-menu-id=""',
                'data-extendify-menu-id="' . esc_attr($menu_id) . '"',
                $content
            );
        }, 10, 2);


        $nav_block = [
            "blockName" => "core/navigation",
            "attrs" => [
                "icon" => "menu",
                "overlayBackgroundColor" => "background",
                "overlayTextColor" => "foreground",
                "extendifyMenuId" => 5,
            ],
            "innerBlocks" => parse_blocks($request->get_param('content')),
            "innerHTML" => "",
            "innerContent" => []
        ];

        return render_block($nav_block);
    }
}
