<?php

namespace Extendify\PluginNotifications;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Shared\Services\SupportedPlugins;

class Admin
{
    private static $pluginsCache = null;

    public function __construct()
    {
        \add_action('in_admin_header', [$this, 'captureAndSuppressNotices'], 1);
        \add_action('admin_init', [AdminPage::class, 'handleActions']);
        \add_action('admin_menu', [$this, 'addMenu']);
        \add_action('admin_enqueue_scripts', [$this, 'enqueueAssets']);
    }

    public function captureAndSuppressNotices()
    {
        global $wp_filter;

        $allCallbacks = [];

        foreach (['admin_notices', 'all_admin_notices'] as $hook) {
            if (!isset($wp_filter[$hook])) {
                continue;
            }

            foreach ($wp_filter[$hook]->callbacks as $priority => $callbacks) {
                foreach ($callbacks as $id => $cb) {
                    $allCallbacks[] = $cb;
                }
            }
        }

        \remove_all_actions('admin_notices');
        \remove_all_actions('all_admin_notices');

        \add_action('admin_notices', function () use ($allCallbacks) {
            $stored = \get_option('extendify_captured_notifications') ?: [];
            $changed = false;

            foreach ($allCallbacks as $cb) {
                $fn = $cb['function'];
                $file = self::getCallbackFile($fn);

                $extendifyDir = basename(rtrim(EXTENDIFY_PATH, '/\\'));
                try {
                    if ($file && str_contains($file, '/plugins/' . $extendifyDir . '/')) {
                        \call_user_func($fn);
                        continue;
                    }

                    \ob_start();
                    \call_user_func($fn);
                    $html = \ob_get_clean();
                } catch (\Throwable $e) {
                    \ob_end_clean();
                    \add_action('admin_notices', $fn, 11);
                    continue;
                }

                if (empty(trim($html))) {
                    continue;
                }

                if (empty(trim(strip_tags($html)))) {
                    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    echo $html;
                    continue;
                }

                $slug = self::extractPluginSlug($file);
                if (!$slug || !in_array($slug, SupportedPlugins::SLUGS, true)) {
                    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    echo $html;
                    continue;
                }

                $hash = md5(trim($html));
                $sourceName = self::resolvePluginNameFromSlug($slug);

                if (isset($stored[$hash])) {
                    if ($stored[$hash]['source_name'] !== $sourceName) {
                        $stored[$hash]['source_name'] = $sourceName;
                        $changed = true;
                    }
                    continue;
                }

                $stored[$hash] = [
                    'id' => $hash,
                    'content' => $html,
                    'source_name' => $sourceName,
                    'notice_type' => self::detectNoticeType($html),
                    'first_seen' => current_time('mysql'),
                    'dismissed' => false,
                ];
                $changed = true;
            }

            if ($changed) {
                if (count($stored) > 200) {
                    $stored = self::pruneOldDismissed($stored);
                }

                \update_option('extendify_captured_notifications', $stored, false);
            }
        });
    }

    private static function getCallbackFile($fn)
    {
        try {
            if ($fn instanceof \Closure) {
                return (new \ReflectionFunction($fn))->getFileName();
            }

            if (is_array($fn)) {
                return (new \ReflectionMethod($fn[0], $fn[1]))->getFileName();
            }

            if (is_string($fn) && function_exists($fn)) {
                return (new \ReflectionFunction($fn))->getFileName();
            }
        } catch (\ReflectionException $e) {
            return null;
        }

        return null;
    }

    private static function extractPluginSlug($file)
    {
        if (!$file) {
            return null;
        }

        if (preg_match('#[/\\\\]plugins[/\\\\]([^/\\\\]+)[/\\\\]#', $file, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private static function resolvePluginNameFromSlug($slug)
    {
        if (!$slug) {
            return 'WordPress';
        }

        if (self::$pluginsCache === null) {
            if (!function_exists('get_plugins')) {
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
            }

            self::$pluginsCache = \get_plugins();
        }

        foreach (self::$pluginsCache as $pluginFile => $data) {
            if (strpos($pluginFile, $slug . '/') === 0) {
                return $data['Name'];
            }
        }

        return $slug;
    }

    private static function detectNoticeType($html)
    {
        if (str_contains($html, 'notice-error')) {
            return 'error';
        }

        if (str_contains($html, 'notice-warning')) {
            return 'warning';
        }

        if (str_contains($html, 'notice-success')) {
            return 'success';
        }

        return 'info';
    }

    private static function pruneOldDismissed($stored)
    {
        uasort($stored, function ($a, $b) {
            if ($a['dismissed'] !== $b['dismissed']) {
                return $a['dismissed'] ? -1 : 1;
            }

            return strcmp($a['first_seen'], $b['first_seen']);
        });

        return array_slice($stored, -200, null, true);
    }

    public function addMenu()
    {
        $stored = \get_option('extendify_captured_notifications') ?: [];
        $count = count(array_filter($stored, function ($n) {
            return !$n['dismissed'];
        }));

        $badge = $count > 0
            ? sprintf(' <span class="awaiting-mod">%d</span>', $count)
            : '';

        $menuLabel = sprintf(
            '%s <span style="white-space:nowrap">%s%s</span>',
            \__('Plugin', 'extendify-local'),
            \__('Notifications', 'extendify-local'),
            $badge
        );

        \add_submenu_page(
            'index.php',
            \__('Plugin Notifications', 'extendify-local'),
            $menuLabel,
            Config::$requiredCapability,
            'extendify-notifications',
            [AdminPage::class, 'render']
        );
    }

    public function enqueueAssets($hook)
    {
        if ($hook !== 'dashboard_page_extendify-notifications') {
            return;
        }

        \wp_add_inline_style('wp-admin', '
            .extendify-notice-detail td {
                padding: 12px 16px;
                background: #f9f9f9;
            }
            .extendify-notice-detail .notice {
                margin: 0;
                box-shadow: none;
            }
            .extendify-notice-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: 500;
            }
            .extendify-notice-badge.type-error { background: #fcf0f0; color: #8a1f1f; }
            .extendify-notice-badge.type-warning { background: #fef8ee; color: #8a6d1f; }
            .extendify-notice-badge.type-success { background: #edf8ee; color: #1f6d3a; }
            .extendify-notice-badge.type-info { background: #f0f0fc; color: #1f3a8a; }
        ');

        \wp_add_inline_script('common', "
            document.addEventListener('click', function(e) {
                var btn = e.target.closest('.extendify-notice-toggle');
                if (!btn) return;
                e.preventDefault();
                var id = btn.dataset.noticeId;
                var row = document.querySelector('tr[data-detail=\"' + id + '\"]');
                if (row) {
                    var isHidden = row.style.display === 'none';
                    row.style.display = isHidden ? '' : 'none';
                    btn.textContent = isHidden ?
                        '" . esc_js(__('Hide', 'extendify-local')) . "' :
                        '" . esc_js(__('View', 'extendify-local')) . "';
                }
            });
        ");
    }

    public static function getNotices($filter = 'active')
    {
        $stored = \get_option('extendify_captured_notifications') ?: [];

        if ($filter === 'active') {
            return array_filter($stored, function ($n) {
                return !$n['dismissed'];
            });
        }

        if ($filter === 'dismissed') {
            return array_filter($stored, function ($n) {
                return $n['dismissed'];
            });
        }

        return $stored;
    }

    public static function dismissNotice($id)
    {
        $stored = \get_option('extendify_captured_notifications') ?: [];

        if (isset($stored[$id])) {
            $stored[$id]['dismissed'] = true;
            \update_option('extendify_captured_notifications', $stored, false);
        }
    }

    public static function dismissAll()
    {
        $stored = \get_option('extendify_captured_notifications') ?: [];

        foreach ($stored as &$notice) {
            $notice['dismissed'] = true;
        }
        unset($notice);

        \update_option('extendify_captured_notifications', $stored, false);
    }
}
