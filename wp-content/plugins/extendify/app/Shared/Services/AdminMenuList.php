<?php

namespace Extendify\Shared\Services;

class AdminMenuList
{
    public static $transient = 'extendify_admin_pages_menu';

    public static function init()
    {
        \add_action("admin_menu", [self::class, "populate"], 999);
        \add_action('upgrader_process_complete', [self::class, 'remove']);

        // Upgrader process completed does not fire on activating/deactivating a plugin,
        // so we need to regenerate the menu after activate/deactivate the plugin
        \add_action('activate_plugin', [self::class, 'remove']);
        \add_action('deactivate_plugin', [self::class, 'remove']);
    }

    /**
     * Retrieves all WordPress admin page slugs (menu and submenu items).
     * Results are cached for performance.
     *
     * @return void
     */
    public static function populate()
    {
        global $menu, $submenu;

        if (get_transient(self::$transient) !== false || !is_array($menu) || !is_array($submenu)) {
            return;
        }

        $adminUrl = admin_url();
        $allPages = [];

        foreach ($menu as $menuItem) {
            if (empty($menuItem[0]) || !isset($menuItem[2])) {
                continue;
            }
            $allPages[] = $menuItem[2];
        }

        foreach ($submenu as $parent => $submenuItems) {
            if (!isset($parent) || strpos($parent, '.php') === false) {
                $parent = 'admin.php';
            }

            $subItems = array_map(function ($item) use ($parent) {
                return strpos($item, '.php') === false ? sprintf('%s?page=%s', $parent, $item) : $item;
            }, array_column($submenuItems, 2));

            array_push($allPages, ...$subItems);
        }

        $allPages = array_values(array_filter($allPages, function ($page) {
            return strpos($page, 'http') === false;
        }));

        foreach ($allPages as &$page) {
            $page = str_replace($adminUrl, '', $page);

            if (strpos($page, '.php') === false) {
                $page = 'admin.php?page=' . $page;
            }
        }
        unset($page);

        set_transient(self::$transient, $allPages);
    }

    public static function remove($plugin)
    {
        \delete_transient(self::$transient);
    }
}
