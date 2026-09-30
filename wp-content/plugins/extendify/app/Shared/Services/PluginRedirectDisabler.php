<?php

/**
 * Prevents plugin activation redirects from interfering with Launch.
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Disables automatic setup wizard redirects from plugins we install.
 *
 * Uses four layers of defense:
 * 1. Filters that plugins check before redirecting
 * 2. Transient/option cleanup right after activation (priority 0)
 * 3. Hook removal for plugins that call exit() during activated_plugin
 * 4. wp_redirect interception as safety net
 */
class PluginRedirectDisabler
{
    /**
     * Per-plugin cleanup actions keyed by plugin slug.
     *
     * @var array<string, array<string, mixed>>
     */
    private static $pluginCleanup = [
        'wpforms-lite' => [
            'transients' => ['wpforms_activation_redirect'],
            // WPForms 2.0's wizard arms after activation, so the transient never reaches it.
            'setOptions' => ['wpforms_setup_wizard_disabled' => true],
        ],
        'wp-mail-smtp' => [
            'transients' => ['wp_mail_smtp_activation_redirect'],
            'setOptions' => ['wp_mail_smtp_activation_prevent_redirect' => true],
        ],
        'google-analytics-for-wordpress' => [
            'transients' => ['_monsterinsights_activation_redirect'],
        ],
        'woocommerce' => [
            'transients' => ['_wc_activation_redirect'],
        ],
        'all-in-one-seo-pack' => [
            'setOptions' => ['aioseo_activation_redirect' => true],
        ],
        'really-simple-ssl' => [
            'transients' => ['rsssl_redirect_to_settings_page'],
        ],
        'imagify' => [
            'transients' => ['imagify_activation'],
        ],
        'complianz-gdpr' => [
            'transients' => ['cmplz_redirect_to_settings_page'],
            'setOptions' => ['cmplz_onboarding_dismissed' => true],
        ],
        'charitable' => [
            'transients' => ['charitable_activation_redirect'],
        ],
        'give' => [
            'deleteOptions' => ['give_cache__give_activation_redirect'],
        ],
        'seo-by-rank-math' => [
            'transients' => ['_rank_math_activation_redirect'],
        ],
        'sugar-calendar-lite' => [
            'transients' => ['sugar_calendar_activation_redirect'],
            'setOptions' => ['sugar_calendar_prevent_redirect' => true],
        ],
        'the-events-calendar' => [
            'transients' => ['_tribe_events_activation_redirect'],
            'setOptions' => ['tribe_skip_welcome' => true],
        ],
        'complianz-terms-conditions' => [
            'transients' => ['cmplz_tc_redirect_to_settings'],
        ],
        'translatepress-multilingual' => [
            'setOptions' => ['trp_onboarding_started' => 'yes'],
        ],
    ];

    /**
     * URL patterns to intercept via wp_redirect filter.
     *
     * @var string[]
     */
    private static $redirectUrlPatterns = [
        'page=wpseo_installation_successful',
        'page=wc-gzd-setup',
    ];

    /**
     * Sets up all redirect prevention hooks.
     *
     * @return void
     */
    public function __construct()
    {
        \add_filter('woocommerce_enable_setup_wizard', '__return_false');
        \add_filter('woocommerce_prevent_automatic_wizard_redirect', '__return_true');
        \add_filter('monsterinsights_enable_onboarding_wizard', '__return_false');
        \add_filter('charitable_disable_activation_redirect', '__return_true');
        \add_filter('tec_admin_update_page_bypass', '__return_true');

        \add_action('activated_plugin', [$this, 'cleanupRedirectTriggers'], 0);

        \add_action('activate_ecwid-shopping-cart/ecwid-shopping-cart.php', function () {
            \remove_action('activated_plugin', 'ecwid_plugin_activation_redirect');
        });

        \add_action('activate_chatbot/qcld-wpwbot.php', function () {
            \remove_action('activated_plugin', 'qc_wpbotfree_activation_redirect');
        });

        \add_filter('wp_redirect', [$this, 'interceptRedirects'], 9998);
    }

    /**
     * Cleans up redirect triggers for the specific plugin being activated.
     *
     * @param string $plugin The plugin basename (e.g. 'wpforms-lite/wpforms.php').
     * @return void
     */
    public function cleanupRedirectTriggers($plugin)
    {
        $slug = \dirname($plugin);
        if (!in_array($slug, SupportedPlugins::SLUGS, true)) {
            return;
        }

        if (!isset(self::$pluginCleanup[$slug])) {
            return;
        }

        $cleanup = self::$pluginCleanup[$slug];

        foreach ($cleanup['transients'] ?? [] as $transient) {
            \delete_transient($transient);
        }

        foreach ($cleanup['deleteOptions'] ?? [] as $option) {
            \delete_option($option);
        }

        foreach ($cleanup['setOptions'] ?? [] as $option => $value) {
            \update_option($option, $value);
        }
    }

    /**
     * Intercepts known plugin redirect URLs.
     *
     * @param string $url The redirect URL.
     * @return string The original URL or admin dashboard URL to block the redirect.
     */
    public function interceptRedirects($url)
    {
        foreach (self::$redirectUrlPatterns as $pattern) {
            if (str_contains($url, $pattern)) {
                return \admin_url();
            }
        }

        return $url;
    }
}
