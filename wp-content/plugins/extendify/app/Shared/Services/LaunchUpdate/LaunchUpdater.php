<?php

namespace Extendify\Shared\Services\LaunchUpdate;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Constants;
use Extendify\Shared\Services\HttpClient;

/**
 * Reports whether the Extendify plugin / Extendable theme are stale and applies
 * pending upgrades in the foreground at launch. Version-of-truth: /api/info.
 */
class LaunchUpdater
{
    /**
     * The Extendable theme stylesheet.
     *
     * @var string
     */
    private static $themeStylesheet = 'extendable';

    /**
     * /api/info's response, memoized per request. False once a fetch failed.
     *
     * @var array|boolean|null
     */
    private static $info = null;

    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTEMPT_TRANSIENT = 'extendify_launch_update_attempts';

    /**
     * A first try and one retry, then launch goes ahead on whatever is installed.
     *
     * @var integer
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const MAX_ATTEMPTS = 2;

    /**
     * Apply pending foreground upgrades (theme + the PUC/partner plugin build)
     * and return any `errors`; never throws. The .org plugin build is reinstalled
     * by slug client-side via REST, so it isn't handled here.
     *
     * @return array
     */
    public static function run()
    {
        try {
            self::loadDependencies();

            $errors = [];

            if (self::pendingThemeVersion() !== null) {
                $error = self::upgradeTheme();
                if ($error !== null) {
                    $errors[] = 'theme: ' . $error;
                }
            }

            $pluginTarget = self::isWpOrgBuild() ? null : self::pendingPluginVersion();
            if ($pluginTarget !== null) {
                $error = self::upgradePlugin($pluginTarget);
                if ($error !== null) {
                    $errors[] = 'plugin: ' . $error;
                }
            }

            return ['errors' => $errors];
        } catch (\Throwable $e) {
            return ['errors' => [$e->getMessage()]];
        }
    }

    /**
     * Upgrade the theme in place (null on success, else an error). Feeds core's
     * Theme_Upgrader via a scoped transient read-filter, persisting nothing.
     *
     * @return string|null
     */
    private static function upgradeTheme()
    {
        \add_filter('site_transient_update_themes', [self::class, 'injectThemeUpdate']);
        $skin = new \WP_Ajax_Upgrader_Skin();
        $result = (new \Theme_Upgrader($skin))->upgrade(self::$themeStylesheet);
        \remove_filter('site_transient_update_themes', [self::class, 'injectThemeUpdate']);

        return self::upgradeError($result, $skin);
    }

    /**
     * Inject the Extendable entry into the (unpersisted) update_themes transient
     * so Theme_Upgrader has a package to install, even on a fresh install where
     * WP hasn't populated it. Only touches the extendable key.
     *
     * @param mixed $transient - The update_themes transient value being read.
     * @return mixed
     */
    public static function injectThemeUpdate($transient)
    {
        $version = self::pendingThemeVersion();
        if ($version === null) {
            return $transient;
        }

        if (!is_object($transient)) {
            $transient = new \stdClass();
        }

        if (!isset($transient->response) || !is_array($transient->response)) {
            $transient->response = [];
        }

        $theme = \wp_get_theme(self::$themeStylesheet);
        $transient->response[self::$themeStylesheet] = [
            'theme' => self::$themeStylesheet,
            'new_version' => $version,
            'url' => 'https://wordpress.org/themes/' . self::$themeStylesheet . '/',
            'package' => 'https://downloads.wordpress.org/theme/' . self::$themeStylesheet . '.' . $version . '.zip',
            'requires' => (string) $theme->get('RequiresWP'),
            'requires_php' => (string) $theme->get('RequiresPHP'),
        ];

        return $transient;
    }

    /**
     * Install the latest PUC/partner plugin build straight from update-server's
     * package URL, overwriting the current one. `install()` (unlike `upgrade()`)
     * takes an explicit package, so it doesn't depend on the update transient.
     *
     * @param string $target - The version we expect to be running afterwards.
     * @return string|null
     */
    private static function upgradePlugin($target)
    {
        $package = self::fetchPucPackage();
        if ($package === null) {
            return 'no package';
        }

        \add_filter('upgrader_source_selection', [self::class, 'useInstalledDirectory'], 10, 2);
        $skin = new \WP_Ajax_Upgrader_Skin();
        $result = (new \Plugin_Upgrader($skin))
            ->install($package['download_url'], ['overwrite_package' => true]);
        \remove_filter('upgrader_source_selection', [self::class, 'useInstalledDirectory'], 10);

        $error = self::upgradeError($result, $skin);
        if ($error !== null) {
            return $error;
        }

        $installed = self::installedPluginVersion();
        if ($installed !== '' && \version_compare($installed, $target, '<')) {
            return 'installed ' . $target . ' but the plugin is still on ' . $installed;
        }

        return null;
    }

    /**
     * Core derives the destination from the zip's root folder, which leaves a
     * second copy of the plugin beside the live one.
     *
     * @param string|\WP_Error $source       - The extracted package folder.
     * @param string           $remoteSource - The temporary folder holding it.
     * @return string|\WP_Error
     */
    public static function useInstalledDirectory($source, $remoteSource)
    {
        global $wp_filesystem;

        if (\is_wp_error($source)) {
            return $source;
        }

        $installed = \trailingslashit($remoteSource) . \basename(EXTENDIFY_PATH) . '/';
        if ($source === $installed || $source === \trailingslashit($remoteSource)) {
            return $source;
        }

        return $wp_filesystem->move($source, $installed, true)
            ? $installed
            : new \WP_Error('extendify_rename_failed', 'Could not rename the package to ' . $installed);
    }

    /**
     * The upgrades for this launch page load to apply, spending one attempt.
     * `stale` holds the versions we gave up on reaching, so it's empty until we do.
     *
     * @return array
     */
    public static function claimPendingUpdates()
    {
        $theme = self::pendingThemeVersion();
        $plugin = self::pendingPluginVersion();

        if ($theme === null && $plugin === null) {
            // The upgrade landed, or was never needed: the next launch gets both attempts.
            self::clearAttempts();

            return ['theme' => false, 'plugin' => false, 'attempt' => 0, 'stale' => []];
        }

        $attempt = self::claimAttempt();
        if ($attempt === null) {
            return [
                'theme' => false,
                'plugin' => false,
                'attempt' => self::MAX_ATTEMPTS,
                'stale' => \array_filter(['theme' => $theme, 'plugin' => $plugin]),
            ];
        }

        return [
            'theme' => $theme !== null,
            'plugin' => $plugin !== null,
            'attempt' => $attempt,
            'stale' => [],
        ];
    }

    /**
     * The attempt to record, or null once they're spent. An upgrade always ends in
     * a reload, so serving the launch update and trying it are the same event.
     *
     * @return integer|null
     */
    private static function claimAttempt()
    {
        $attempt = (int) \get_transient(self::ATTEMPT_TRANSIENT) + 1;
        if ($attempt > self::MAX_ATTEMPTS) {
            return null;
        }

        \set_transient(self::ATTEMPT_TRANSIENT, $attempt, HOUR_IN_SECONDS);

        return $attempt;
    }

    /**
     * Hand the next launch a fresh pair; the expiry covers one abandoned mid-way.
     *
     * @return void
     */
    public static function clearAttempts()
    {
        \delete_transient(self::ATTEMPT_TRANSIENT);
    }

    /**
     * The newer plugin version to install per /api/info, or null if current.
     *
     * @return string|null
     */
    private static function pendingPluginVersion()
    {
        $info = self::fetchInfo();
        if (empty($info['extendify']['version'])) {
            return null;
        }

        return \version_compare($info['extendify']['version'], Config::$version, '>')
            ? $info['extendify']['version']
            : null;
    }

    /**
     * The newer Extendable version to install per /api/info, or null if current.
     *
     * @return string|null
     */
    private static function pendingThemeVersion()
    {
        $theme = \wp_get_theme(self::$themeStylesheet);
        if (!$theme->exists()) {
            return null;
        }

        $info = self::fetchInfo();
        if (empty($info['extendable']['version'])) {
            return null;
        }

        return \version_compare($info['extendable']['version'], $theme->get('Version'), '>')
            ? $info['extendable']['version']
            : null;
    }

    /**
     * Whether this is the wordpress.org build. Its `updater.php` is stripped by
     * release-to-wp-org.yml (partner/PUC builds keep it); the wp.org build is
     * reinstalled by slug through the core REST route, client-side.
     *
     * @return boolean
     */
    public static function isWpOrgBuild()
    {
        return !\is_readable(EXTENDIFY_PATH . 'updater.php');
    }

    /**
     * The version on disk, read from the same file as Config::$version, which was
     * read before the upgrade. Empty when it can't be read.
     *
     * @return string
     */
    private static function installedPluginVersion()
    {
        $data = \get_file_data(EXTENDIFY_PATH . 'readme.txt', ['version' => 'Stable tag']);

        return $data['version'];
    }

    /**
     * Plugin + theme versions from /api/info, or null on failure. Memoized per
     * request — both detection checks (and the theme filter) call it.
     *
     * @return array|null
     */
    private static function fetchInfo()
    {
        if (self::$info === null) {
            $result = HttpClient::get(Constants::AI_HOST . '/api/info', [
                'params' => [
                    'partnerId' => defined('EXTENDIFY_PARTNER_ID') ? constant('EXTENDIFY_PARTNER_ID') : null,
                    'siteId' => \get_option('extendify_site_id', null),
                    'pluginVersion' => Config::$version,
                    'themeVersion' => (string) \wp_get_theme(self::$themeStylesheet)->get('Version'),
                ],
            ]);
            self::$info = $result['code'] === 200 ? $result['response'] : false;
        }

        return self::$info ?: null;
    }

    /**
     * The PUC/partner build's package (`download_url`) from update-server, used to
     * apply the plugin update; detection uses /api/info. Null on failure.
     *
     * @return array|null
     */
    private static function fetchPucPackage()
    {
        $url = 'https://update-server.extendify.com/plugin/update?' . \http_build_query([
            'partnerId' => defined('EXTENDIFY_PARTNER_ID') ? constant('EXTENDIFY_PARTNER_ID') : null,
            'siteId' => \get_option('extendify_site_id', null),
            'homeUrl' => \get_home_url(),
            'wordpressVersion' => \get_bloginfo('version'),
            'checking_for_updates' => 1,
        ]);

        $response = \wp_remote_get($url);
        if (\is_wp_error($response) || \wp_remote_retrieve_response_code($response) !== 200) {
            return null;
        }

        $data = \json_decode(\wp_remote_retrieve_body($response), true);
        return (is_array($data) && !empty($data['download_url'])) ? $data : null;
    }

    /**
     * The error message from an upgrader run (skin errors first, then the
     * return value), or null when it succeeded.
     *
     * @param mixed                  $result - The upgrader ::upgrade()/::install() return.
     * @param \WP_Ajax_Upgrader_Skin $skin   - The skin that ran the upgrade.
     * @return string|null
     */
    private static function upgradeError($result, $skin)
    {
        $skinErrors = $skin->get_errors();
        if (\is_wp_error($skinErrors) && $skinErrors->has_errors()) {
            return $skinErrors->get_error_message();
        }

        if (\is_wp_error($result)) {
            return $result->get_error_message();
        }

        return null;
    }

    /**
     * Load the WordPress upgrader API, which is only present in the admin context.
     *
     * @return void
     */
    private static function loadDependencies()
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/theme.php';
        require_once ABSPATH . 'wp-admin/includes/update.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
    }
}
