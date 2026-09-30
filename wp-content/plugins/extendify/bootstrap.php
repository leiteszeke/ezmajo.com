<?php

/**
 * Bootstrap the application
 */

defined('ABSPATH') || die('No direct access.');

use Extendify\AdminPageRouter;
use Extendify\Assist\Admin as AssistAdmin;
use Extendify\Agent\Admin as AgentAdmin;
use Extendify\ComingSoon\Frontend as ComingSoonFrontend;
use Extendify\Config;
use Extendify\Draft\Admin as DraftAdmin;
use Extendify\HelpCenter\Admin as HelpCenterAdmin;
use Extendify\Insights;
use Extendify\Launch\Admin as LaunchAdmin;
use Extendify\AutoLaunch\Admin as AutoLaunchAdmin;
use Extendify\Library\Admin as LibraryAdmin;
use Extendify\Library\Frontend as LibraryFrontend;
use Extendify\Agent\Frontend as AgentFrontend;
use Extendify\QuickEdit\Frontend as QuickEditFrontend;
use Extendify\PageCreator\Admin as PageCreatorAdmin;
use Extendify\PartnerData;
use Extendify\Notifications\Admin as NotificationsAdmin;
use Extendify\Notifications\Frontend as NotificationsFrontend;
use Extendify\Toolbar\Admin as ToolbarAdmin;
use Extendify\Toolbar\Frontend as ToolbarFrontend;
use Extendify\Recommendations\Admin as RecommendationsAdmin;
use Extendify\PluginNotifications\Admin as PluginNotificationsAdmin;
use Extendify\Shared\Admin as SharedAdmin;
use Extendify\Shared\DataProvider\NotificationData;
use Extendify\Shared\DataProvider\ResourceData;
use Extendify\Shared\Services\BlockStyleVariations;
use Extendify\Shared\Services\ForcePluginReinstall;
use Extendify\Shared\Services\Import\ImagesImporter;
use Extendify\Shared\Services\PluginRedirectDisabler;
use Extendify\Shared\Services\PluginsActivation\SimplyBook;
use Extendify\Shared\Services\VersionMigrator;
use Extendify\SiteVisibility;

if (!defined('EXTENDIFY_REQUIRED_CAPABILITY')) {
    define('EXTENDIFY_REQUIRED_CAPABILITY', 'manage_options');
}

if (!defined('EXTENDIFY_PATH')) {
    define('EXTENDIFY_PATH', \plugin_dir_path(__FILE__));
}

if (!defined('EXTENDIFY_URL')) {
    define('EXTENDIFY_URL', \plugin_dir_url(__FILE__));
}

if (is_readable(EXTENDIFY_PATH . 'vendor/autoload.php')) {
    require EXTENDIFY_PATH . 'vendor/autoload.php';
}

// Registered after the autoloader — these callbacks reference classes it loads.
add_filter('http_request_args', function ($args, $url) {
    $extendifyHosts = array_filter(array_map(function ($host) {
        return wp_parse_url($host, PHP_URL_HOST);
    }, \Extendify\Constants::serviceUrls()));

    $host = wp_parse_url($url, PHP_URL_HOST);
    if ($host && (str_contains($host, 'extendify') || in_array($host, $extendifyHosts, true))) {
        $args['timeout'] = 45;
    }

    return $args;
}, 100, 2);

add_action('update_option', function ($option) {
    if (in_array($option, ['WPLANG', 'blogname'], true)) {
        \delete_transient('extendify_recommendations');
        \delete_transient('extendify_domains');
        \delete_transient('extendify_supportArticles');
    }

    // Delete the partner transient so we can fetch new data when the locale is switched.
    if (($option === 'WPLANG') && get_transient('extendify_partner_data_cache_check')) {
        delete_transient('extendify_partner_data_cache_check');
        PartnerData::getPartnerData();
    }
});

// Delete the partner transient so we can fetch new data when the locale is switched via WP-CLI.
add_action('cli_init', function () {
    $command = sanitize_text_field(wp_unslash(($_SERVER['argv'][1] ?? '')));
    if ($command === 'language' && get_transient('extendify_partner_data_cache_check')) {
        delete_transient('extendify_partner_data_cache_check');
        PartnerData::getPartnerData();
    }
});

if (!defined('EXTENDIFY_IS_THEME_EXTENDABLE')) {
    define('EXTENDIFY_IS_THEME_EXTENDABLE', get_option('stylesheet') === 'extendable');
}

(static function () {
    // This file should have no dependencies and always load.
    new LibraryFrontend();
    // This file hooks into an external task and should always load.
    new Insights();
    // This class set up the image import check scheduler.
    new ImagesImporter();

    // Run various database updates depending on the plugin version.
    new VersionMigrator();

    // Force-reinstall support for /wp/v2/plugins (opt-in via request header).
    ForcePluginReinstall::register();

    // Keeps our design variation names registered so global styles can hold them.
    BlockStyleVariations::register();

    // Their registration callback comes in unauthenticated, so this cannot sit behind the capability gate.
    SimplyBook::register();

    // This class will fetch and cache partner data to be used
    // throughout every class below. If opt in.
    new PartnerData();

    // Assign A/B test variants now that partner data is loaded.
    Insights::setup((array) PartnerData::setting('activeTests'));

    // Set up scheduled cache (if opt-in and active).
    if (!PartnerData::setting('deactivated')) {
        ResourceData::scheduleCache();
        NotificationData::scheduleCache();
    }

    if (!current_user_can(EXTENDIFY_REQUIRED_CAPABILITY)) {
        if (!SiteVisibility::isPublished()) {
            new ComingSoonFrontend();
        }

        return;
    }

    // The config class will collect information about the
    // partner and plugin, so it's easier to access.
    new Config();
    if (!defined('EXTENDIFY_DEVMODE')) {
        define('EXTENDIFY_DEVMODE', Config::$environment === 'DEVELOPMENT');
    }

    // This is a global "loader" class that loads in any assets that are shared everywhere.
    new SharedAdmin();
    // This class will handle loading library assets.
    new LibraryAdmin();
    if (PartnerData::setting('hidePluginNotifications')) {
        new PluginNotificationsAdmin();
    }

    // Only load these if the partner ID is set. These are all opt-in features.
    if (!Config::$partnerId && !constant('EXTENDIFY_DEVMODE')) {
        return;
    }

    if (PartnerData::setting('deactivated')) {
        return;
    }

    // This class handles the admin pages required for the plugin.
    new AdminPageRouter();
    new PluginRedirectDisabler();

    // This class will handle loading  page creator assets.
    if (PartnerData::setting('showAIPageCreation') || constant('EXTENDIFY_DEVMODE')) {
        new PageCreatorAdmin();
    }

    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    $page = sanitize_text_field(wp_unslash($_GET['page'] ?? ''));

    if ($page === 'extendify-launch') {
        new LaunchAdmin();
        return;
    }

    if ($page === 'extendify-auto-launch') {
        new AutoLaunchAdmin();
        return;
    }

    // The remaining classes handle loading assets for each individual products.
    // They are essentially asset loading classes.
    if ($page === 'extendify-assist') {
        new AssistAdmin();
    }

    $extendifyShowAgent = constant('EXTENDIFY_IS_THEME_EXTENDABLE')
        && Config::$launchCompleted
        && (PartnerData::setting('showAIAgents') || Config::preview('ai-agent'));

    // True when the AI Agent is actually loaded this request — the gate
    // above, or dev mode (so it can be exercised locally). Quick Edit and
    // the simple toolbar both build on the Agent, so they share this
    // decision rather than gating themselves independently.
    $extendifyLoadAgent = $extendifyShowAgent || constant('EXTENDIFY_DEVMODE');

    if (!$extendifyShowAgent) {
        new HelpCenterAdmin();
    }

    if (PartnerData::setting('showProductRecommendations') || constant('EXTENDIFY_DEVMODE')) {
        new RecommendationsAdmin();
    }

    new NotificationsAdmin();
    new NotificationsFrontend();

    if (PartnerData::setting('showDraft') || constant('EXTENDIFY_DEVMODE')) {
        new DraftAdmin();
    }

    if ($extendifyLoadAgent) {
        new AgentAdmin();
        new AgentFrontend();
    }

    if ($extendifyLoadAgent) {
        new QuickEditFrontend();
    }

    // Simple Extendify toolbar — replaces the WordPress core admin
    // bar on the front end with a minimal AI Agent / Quick Edit /
    // Edit / WP Admin bar. The user-profile "Toolbar Style" setting
    // controls per-user override; the default is Launch-aware
    // ('simple' post-Launch, 'full' pre-Launch). Gated on the Agent
    // too: the toolbar's "AI Agent" button drives the Agent's mounted
    // admin-bar button, so without the Agent it would present a dead
    // button — never ship the toolbar unless the Agent is there.
    if ($extendifyLoadAgent && (PartnerData::setting('showSimpleToolbar') || Config::preview('simple-toolbar'))) {
        new ToolbarAdmin();
        new ToolbarFrontend();
    }
})();

(static function () {
    if (!current_user_can(EXTENDIFY_REQUIRED_CAPABILITY)) {
        return;
    }

    // This loads in all the REST API routes used by the plugin.
    require EXTENDIFY_PATH . 'routes/api.php';
})();

// This file is used to update the plugin and removed before w.org release.
if (is_readable(EXTENDIFY_PATH . '/updater.php')) {
    require EXTENDIFY_PATH . 'updater.php';
}

add_action('init', function () {
    load_plugin_textdomain('extendify-local', false, dirname(plugin_basename(__FILE__)) . '/languages/php');
});

// phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter
add_filter('load_script_translation_file', function ($file, $handle, $domain) {
    if ($domain !== 'extendify-local') {
        return $file;
    }

    return extendifyResolveFallbackLocaleFile($file);
}, 10, 3);

add_filter('load_textdomain_mofile', function ($mofile, $domain) {
    if ($domain !== 'extendify-local') {
        return $mofile;
    }

    return extendifyResolveFallbackLocaleFile($mofile);
}, 10, 2);

/**
 * Resolves a fallback translation file path if the requested locale is unsupported.
 *
 * This function checks if the current file path includes an unsupported locale
 * and replaces it with a supported fallback (e.g. es_AR → es_ES),
 * as long as the fallback file exists on disk.
 *
 * @param string $filepath The original .mo or .json translation file path.
 * @return string The fallback file path if it exists, or the original one.
 */

function extendifyResolveFallbackLocaleFile($filepath)
{
    if (str_contains($filepath, '-es_') && !file_exists($filepath)) {
        $fallbackFile = preg_replace('/-es_[A-Z]{2}/', '-es_ES', $filepath);
        if ($fallbackFile && file_exists($fallbackFile)) {
            return $fallbackFile;
        }
    }

    return $filepath;
}

// To cover legacy conflicts.
// phpcs:ignore
class ExtendifySdk
{
}
