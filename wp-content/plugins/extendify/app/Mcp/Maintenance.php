<?php

/**
 * The maintenance work no core REST route offers.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * Core's plugin routes install, activate and delete but never update, and its
 * theme routes only read. Each operation here checks the capability core's own
 * screen checks, then calls what that screen calls.
 */
class Maintenance
{
    /**
     * Each already answers as its own field, with more than a status.
     */
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const NAMED_CHECKS = ['php_version', 'scheduled_events'];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param array $slugs - Plugins to consider, or [] for every one.
     * @return array - Each plugin with an update waiting.
     */
    public static function pluginUpdates(array $slugs = [])
    {
        self::loadAdmin();
        \wp_update_plugins();
        $installed = \get_plugins();

        $items = [];
        foreach (self::updates('update_plugins') as $file => $update) {
            $slug = preg_replace('/\.php$/', '', $file);
            $named = !$slugs || in_array($slug, $slugs, true) || in_array($file, $slugs, true);
            if (!isset($installed[$file]) || !$named) {
                continue;
            }

            $items[] = [
                'slug' => $slug,
                'name' => \wp_specialchars_decode((string) ($installed[$file]['Name'] ?? ''), ENT_QUOTES),
                'version' => (string) ($installed[$file]['Version'] ?? ''),
                'new_version' => (string) (((array) $update)['new_version'] ?? ''),
            ];
        }

        return $items;
    }

    /**
     * @param array $stylesheets - Themes to consider, or [] for every one.
     * @return array - Each theme with an update waiting.
     */
    public static function themeUpdates(array $stylesheets = [])
    {
        self::loadAdmin();
        \wp_update_themes();
        $installed = \wp_get_themes();

        $items = [];
        foreach (self::updates('update_themes') as $stylesheet => $update) {
            $named = !$stylesheets || in_array($stylesheet, $stylesheets, true);
            if (!isset($installed[$stylesheet]) || !$named) {
                continue;
            }

            $items[] = [
                'stylesheet' => $stylesheet,
                'name' => \wp_specialchars_decode((string) $installed[$stylesheet]->get('Name'), ENT_QUOTES),
                'version' => (string) $installed[$stylesheet]->get('Version'),
                'new_version' => (string) (((array) $update)['new_version'] ?? ''),
            ];
        }

        return $items;
    }

    /**
     * @return array|null - The versions WordPress would move between, or null when it is current.
     */
    public static function coreUpdate()
    {
        self::loadAdmin();
        \wp_version_check();
        foreach ((array) \get_core_updates() as $update) {
            if (is_object($update) && $update->response === 'upgrade') {
                return [
                    'from' => $GLOBALS['wp_version'],
                    'to' => (string) $update->current,
                    'locale' => (string) $update->locale,
                ];
            }
        }

        return null;
    }

    /**
     * @param array   $exclude     - Stylesheets to keep regardless.
     * @param boolean $keepDefault - Whether the newest bundled theme stays as a fallback.
     * @return array
     */
    public static function inactiveThemes(array $exclude, $keepDefault)
    {
        $kept = array_merge([\get_stylesheet(), \get_template()], $exclude);
        $default = $keepDefault ? \WP_Theme::get_core_default_theme() : false;
        if ($default) {
            $kept[] = $default->get_stylesheet();
        }

        $items = [];
        foreach (\wp_get_themes() as $stylesheet => $theme) {
            if (in_array($stylesheet, $kept, true)) {
                continue;
            }

            $items[] = [
                'stylesheet' => $stylesheet,
                'name' => \wp_specialchars_decode((string) $theme->get('Name'), ENT_QUOTES),
                'version' => (string) $theme->get('Version'),
            ];
        }

        return $items;
    }

    /**
     * @param string $stylesheet - The theme to delete.
     * @return string|null - Why it was not deleted, or null when it was.
     */
    public static function deleteTheme($stylesheet)
    {
        if (!\current_user_can('delete_themes')) {
            return 'This user may not delete themes.';
        }

        self::loadAdmin();
        // Without file access delete_theme() prints a credentials form and exits mid-request.
        ob_start();
        $credentials = \request_filesystem_credentials('');
        ob_end_clean();
        if ($credentials === false || !\WP_Filesystem($credentials)) {
            return 'The theme files could not be reached.';
        }

        $result = \delete_theme($stylesheet);
        if (\is_wp_error($result)) {
            return $result->get_error_message();
        }

        return $result ? null : 'The theme files could not be reached.';
    }

    /**
     * @param boolean $enabled - Whether the named plugins and themes update on their own.
     * @param array   $plugins - Plugin slugs.
     * @param array   $themes  - Theme stylesheets.
     * @param boolean $all     - Whether every installed plugin and theme is meant.
     * @return array|\WP_Error
     */
    public static function setAutoUpdates($enabled, array $plugins, array $themes, $all)
    {
        self::loadAdmin();
        $installed = array_keys(\get_plugins());
        $stylesheets = array_keys(\wp_get_themes());
        $unknown = [];
        if ($all) {
            $files = $installed;
            $chosen = $stylesheets;
        } else {
            $files = [];
            foreach ($plugins as $slug) {
                $file = in_array($slug . '.php', $installed, true) ? $slug . '.php' : null;
                $file ? $files[] = $file : $unknown[] = $slug;
            }

            $chosen = array_values(array_intersect($themes, $stylesheets));
            $unknown = array_merge($unknown, array_values(array_diff($themes, $stylesheets)));
        }

        if ($files && !\current_user_can('update_plugins')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not change how plugins update.');
        }

        if ($chosen && !\current_user_can('update_themes')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not change how themes update.');
        }

        self::toggle('auto_update_plugins', $files, $enabled);
        self::toggle('auto_update_themes', $chosen, $enabled);

        return [
            'plugins' => array_map(function ($file) use ($enabled) {
                return ['slug' => preg_replace('/\.php$/', '', $file), 'auto_update' => $enabled];
            }, $files),
            'themes' => array_map(function ($stylesheet) use ($enabled) {
                return ['stylesheet' => $stylesheet, 'auto_update' => $enabled];
            }, $chosen),
            'unknown' => $unknown,
            'honored_by_this_site' => [
                'plugins' => \wp_is_auto_update_enabled_for_type('plugin'),
                'themes' => \wp_is_auto_update_enabled_for_type('theme'),
            ],
        ];
    }

    /**
     * @param array|null $ids - Attachment ids asked for, or null for the whole library.
     * @return array - The image ids to process, and the ids that are not images.
     */
    public static function imageIds($ids)
    {
        if ($ids === null) {
            return [
                'ids' => \get_posts([
                    'post_type' => 'attachment',
                    'post_mime_type' => 'image',
                    'post_status' => 'inherit',
                    'posts_per_page' => -1,
                    'fields' => 'ids',
                    'orderby' => 'ID',
                    'order' => 'ASC',
                ]),
                'skipped' => [],
            ];
        }

        $found = [];
        $skipped = [];
        foreach (array_unique(array_map('intval', $ids)) as $id) {
            \wp_attachment_is_image($id) ? $found[] = $id : $skipped[] = $id;
        }

        return ['ids' => $found, 'skipped' => $skipped];
    }

    /**
     * @return array|\WP_Error
     */
    public static function health()
    {
        if (!\current_user_can('view_site_health_checks')) {
            return new \WP_Error('extendify_mcp_refused', 'This user may not view the site health checks.');
        }

        self::loadAdmin();
        require_once ABSPATH . 'wp-admin/includes/class-wp-site-health.php';
        $health = \WP_Site_Health::get_instance();
        \wp_update_plugins();
        \wp_update_themes();
        $core = self::coreUpdate();

        return [
            'wordpress' => ['version' => $GLOBALS['wp_version'], 'update_available' => $core ? $core['to'] : null],
            'php' => ['version' => PHP_VERSION, 'status' => self::check($health->get_test_php_version())['status']],
            'database' => ['version' => (string) $GLOBALS['wpdb']->db_version()],
            'memory_limit' => WP_MEMORY_LIMIT,
            'https' => self::check($health->get_test_https_status()),
            'cron' => self::check($health->get_test_scheduled_events()),
            'background_updates' => self::check($health->get_test_background_updates()),
            'outdated' => ['plugins' => count(\get_plugin_updates()), 'themes' => count(\get_theme_updates())],
            'auto_updates' => [
                'plugins' => \wp_is_auto_update_enabled_for_type('plugin'),
                'themes' => \wp_is_auto_update_enabled_for_type('theme'),
            ],
            'checks' => self::checks($health),
        ];
    }

    /**
     * A check's description and actions are dropped: those carry filesystem paths and admin links.
     *
     * @param \WP_Site_Health $health - The instance the named checks came from.
     * @return array - Every check core measures without calling the site itself.
     */
    private static function checks($health)
    {
        $checks = [];
        foreach (\WP_Site_Health::get_tests()['direct'] as $id => $test) {
            $callback = is_string($test['test']) ? [$health, 'get_test_' . $test['test']] : $test['test'];

            // A skip_cron check asks the site to call itself, which a tool call must not wait on.
            if (!empty($test['skip_cron']) || in_array($id, self::NAMED_CHECKS, true) || !is_callable($callback)) {
                continue;
            }

            // Core filters every result it renders, so a plugin's own amendment reaches the model too.
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
            $result = self::check(\apply_filters('site_status_test_result', call_user_func($callback)));

            // Core leaves the status empty when a check reached no verdict, which tells a model nothing.
            if ($result['status'] !== '') {
                $checks[$id] = $result;
            }
        }

        return $checks;
    }

    /**
     * @param string  $tool    - The tool the job runs for.
     * @param array   $payload - What the job was started with.
     * @param integer $index   - Which step to take.
     * @return array - The step's result.
     */
    public static function step($tool, array $payload, $index)
    {
        switch ($tool) {
            case 'update_plugins':
                return self::updatePlugin((string) ($payload['plugins'][$index] ?? ''));
            case 'update_themes':
                return self::updateTheme((string) ($payload['themes'][$index] ?? ''));
            case 'update_core':
                return self::updateCore((string) ($payload['version'] ?? ''), (string) ($payload['locale'] ?? ''));
            case 'regenerate_thumbnails':
                return self::regenerate((int) ($payload['ids'][$index] ?? 0), !empty($payload['only_missing']));
        }

        return ['ok' => false, 'error' => 'Unknown job.'];
    }

    /**
     * @param string $file - The plugin file, as get_plugins() keys it.
     * @return array
     */
    private static function updatePlugin($file)
    {
        $slug = preg_replace('/\.php$/', '', $file);
        if (!\current_user_can('update_plugins')) {
            return ['slug' => $slug, 'ok' => false, 'error' => 'This user may not update plugins.'];
        }

        self::loadUpgrader();
        $skin = new \Automatic_Upgrader_Skin();
        $result = (new \Plugin_Upgrader($skin))->upgrade($file);
        \wp_clean_plugins_cache(false);
        if (\is_wp_error($result)) {
            return ['slug' => $slug, 'ok' => false, 'error' => $result->get_error_message()];
        }

        if (!$result) {
            return ['slug' => $slug, 'ok' => false, 'error' => self::unfinished($skin)];
        }

        return ['slug' => $slug, 'ok' => true, 'version' => (string) (\get_plugins()[$file]['Version'] ?? '')];
    }

    /**
     * @param string $stylesheet - The theme directory, as wp_get_themes() keys it.
     * @return array
     */
    private static function updateTheme($stylesheet)
    {
        if (!\current_user_can('update_themes')) {
            return ['stylesheet' => $stylesheet, 'ok' => false, 'error' => 'This user may not update themes.'];
        }

        self::loadUpgrader();
        $skin = new \Automatic_Upgrader_Skin();
        $result = (new \Theme_Upgrader($skin))->upgrade($stylesheet);
        \wp_clean_themes_cache(false);
        if (\is_wp_error($result)) {
            return ['stylesheet' => $stylesheet, 'ok' => false, 'error' => $result->get_error_message()];
        }

        if (!$result) {
            return ['stylesheet' => $stylesheet, 'ok' => false, 'error' => self::unfinished($skin)];
        }

        return [
            'stylesheet' => $stylesheet,
            'ok' => true,
            'version' => (string) \wp_get_theme($stylesheet)->get('Version'),
        ];
    }

    /**
     * @param string $version - The version the preview offered.
     * @param string $locale  - Its locale.
     * @return array
     */
    private static function updateCore($version, $locale)
    {
        if (!\current_user_can('update_core')) {
            return ['ok' => false, 'error' => 'This user may not update WordPress.'];
        }

        self::loadUpgrader();
        $update = \find_core_update($version, $locale);
        if (!$update) {
            return ['ok' => false, 'error' => 'That update is no longer offered. Run update_core with preview again.'];
        }

        $skin = new \Automatic_Upgrader_Skin();
        $result = (new \Core_Upgrader($skin))->upgrade($update);
        if (\is_wp_error($result)) {
            return ['ok' => false, 'error' => $result->get_error_message()];
        }

        if (!$result) {
            return ['ok' => false, 'error' => self::unfinished($skin)];
        }

        return ['ok' => true, 'version' => (string) $result];
    }

    /**
     * An upgrader answers false, not a WP_Error, when it cannot reach the files.
     *
     * @param \Automatic_Upgrader_Skin $skin - The skin the upgrader reported to.
     * @return string
     */
    private static function unfinished(\Automatic_Upgrader_Skin $skin)
    {
        $messages = $skin->get_upgrade_messages();

        return $messages ? \wp_strip_all_tags((string) end($messages)) : 'The update did not complete.';
    }

    /**
     * @param integer $id          - The image attachment.
     * @param boolean $onlyMissing - Whether sizes already on disk are left alone.
     * @return array
     */
    private static function regenerate($id, $onlyMissing)
    {
        if (!\current_user_can('edit_post', $id)) {
            return ['id' => $id, 'ok' => false, 'error' => 'This user may not edit that image.'];
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        $file = \get_attached_file($id);
        if (!$file || !file_exists($file)) {
            return ['id' => $id, 'ok' => false, 'error' => 'The original file is missing.'];
        }

        if ($onlyMissing) {
            self::forgetLostSizes($id, dirname($file));
            $meta = \wp_update_image_subsizes($id);
        } else {
            $meta = \wp_generate_attachment_metadata($id, $file);
            if (is_array($meta) && $meta) {
                \wp_update_attachment_metadata($id, $meta);
            }
        }

        if (\is_wp_error($meta)) {
            return ['id' => $id, 'ok' => false, 'error' => $meta->get_error_message()];
        }

        return ['id' => $id, 'ok' => true, 'sizes' => count((array) ($meta['sizes'] ?? []))];
    }

    /**
     * wp_update_image_subsizes() trusts the metadata, so a size whose file is gone has to leave it first.
     *
     * @param integer $id  - The image attachment.
     * @param string  $dir - The directory its files live in.
     * @return void
     */
    private static function forgetLostSizes($id, $dir)
    {
        $meta = \wp_get_attachment_metadata($id);
        if (!is_array($meta) || empty($meta['sizes'])) {
            return;
        }

        foreach ((array) $meta['sizes'] as $size => $info) {
            if (!file_exists($dir . '/' . (string) (((array) $info)['file'] ?? ''))) {
                unset($meta['sizes'][$size]);
            }
        }

        \wp_update_attachment_metadata($id, $meta);
    }

    /**
     * @param string  $option  - auto_update_plugins or auto_update_themes.
     * @param array   $names   - The plugin files or stylesheets to change.
     * @param boolean $enabled - Whether they join the list or leave it.
     * @return void
     */
    private static function toggle($option, array $names, $enabled)
    {
        if (!$names) {
            return;
        }

        $current = (array) \get_site_option($option, []);
        $updated = $enabled ? array_merge($current, $names) : array_diff($current, $names);
        \update_site_option($option, array_values(array_unique($updated)));
    }

    /**
     * @param array $test - What a WP_Site_Health check answered.
     * @return array
     */
    private static function check($test)
    {
        $test = (array) $test;

        return [
            'status' => (string) ($test['status'] ?? ''),
            'label' => \wp_strip_all_tags((string) ($test['label'] ?? '')),
        ];
    }

    /**
     * @param string $transient - update_plugins or update_themes.
     * @return array
     */
    private static function updates($transient)
    {
        $updates = \get_site_transient($transient);

        return isset($updates->response) ? (array) $updates->response : [];
    }

    /**
     * @return void
     */
    private static function loadAdmin()
    {
        foreach (['plugin', 'theme', 'update', 'file', 'misc'] as $include) {
            require_once ABSPATH . 'wp-admin/includes/' . $include . '.php';
        }
    }

    /**
     * @return void
     */
    private static function loadUpgrader()
    {
        self::loadAdmin();
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
    }
}
