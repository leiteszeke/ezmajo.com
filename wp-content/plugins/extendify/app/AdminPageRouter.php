<?php

/**
 * Simple router to handle admin page loading
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

use Extendify\Assist\AdminPage as AssistAdminPage;
use Extendify\Launch\AdminPage as LaunchAdminPage;
use Extendify\AutoLaunch\AdminPage as AutoLaunchAdminPage;

/**
 * This class handles routing when the main admin button is pressed.
 * This used to be more robust but now just routes to Assist. And
 * possibly loads Launch depending on the state.
 */

class AdminPageRouter
{
    /**
     * Adds various actions to set up the page
     *
     * @return void
     */
    public function __construct()
    {
        // This does the initial redirect to Launch.
        \add_action('admin_init', [$this, 'redirectOnce'], 10);
        \add_action('admin_init', [$this, 'maybeForceFlush'], 5);
        \add_action('admin_init', [$this, 'handleLaunchRedirect'], 1);

        // Add a dropdown above Dashboard in the admin toolbar.
        \add_action('admin_bar_menu', function ($wpAdminBar) {
            if (!PartnerData::$id || is_admin()) {
                return;
            }

            $wpAdminBar->add_node([
                'id' => 'extendify-site-assistant',
                'title' => \__('Site Assistant', 'extendify-local'),
                'href' => \admin_url() . $this->getRoute(),
                'parent' => 'site-name',
                'meta' => ['position' => 1],
            ]);
        }, 11);

        // When Launch is finished, fire this to set the correct permalinks.
        // phpcs:ignore WordPress.Security.NonceVerification
        if (isset($_GET['extendify-launch-success'])) {
            \add_action('admin_init', function () {
                \flush_rewrite_rules();
            });
        }

        \add_action('admin_menu', function () {
            // If no partner, we don't show any menu.
            if (!PartnerData::$id) {
                return;
            }

            $assist = new AssistAdminPage();
            // Adds the top Assist menu.
            $this->addAdminMenu(
                __('Site Assistant', 'extendify-local'),
                $assist->slug,
                [$assist, 'pageContent']
            );

            if (!Config::$showLaunch) {
                return;
            }

            $launch = new LaunchAdminPage();
            $this->addSubMenu(
                // translators: Launch is a noun.
                __('Launch', 'extendify-local'),
                $launch->slug,
                [$launch, 'pageContent']
            );
            $autoLaunch = new AutoLaunchAdminPage();
            $this->addSubMenu(
                // translators: Launch is a noun.
                __('Auto Launch', 'extendify-local'),
                $autoLaunch->slug,
                [$autoLaunch, 'pageContent']
            );
        });

        // If the user is redirected to this while visiting our url, intercept it.
        \add_filter('wp_redirect', function ($url) {
            if (!PartnerData::$id) {
                return $url;
            }

            // Check for extendify-launch-success as other plugins will not override
            // this as they intercept the request.
            // phpcs:ignore WordPress.Security.NonceVerification
            if (isset($_GET['extendify-launch-success'])) {
                return \admin_url() . $this->getRoute();
            }

            // Special treatment for Yoast to disable their redirect when installing.
            if ($url === \admin_url() . 'admin.php?page=wpseo_installation_successful_free') {
                return \admin_url() . $this->getRoute();
            }

            // Special treatment for Germanized for WooCommerce to disable their redirect when installing.
            if ($url === \admin_url() . 'admin.php?page=wc-gzd-setup') {
                return \admin_url() . $this->getRoute();
            }

            return $url;
        }, 9999);
    }

    /**
     * A helper for handling sub menus
     *
     * @param string   $name     - The menu name.
     * @param string   $slug     - The menu slug.
     * @param callable $callback - The callback to render the page.
     *
     * @return void
     */
    public function addSubMenu($name, $slug, $callback = '')
    {
        \add_submenu_page(
            // Uses a "dummy" page for adding pages without a menu.
            (constant('EXTENDIFY_DEVMODE') ? 'extendify-assist' : 'extendify-page'),
            $name,
            $name,
            Config::$requiredCapability,
            $slug,
            $callback
        );
    }

    /**
     * Adds Extendify top menu
     *
     * @param string          $label    - The menu label.
     * @param string          $slug     - The menu slug.
     * @param string|callable $callback - The callback to render the page.
     * @return void
     */
    public function addAdminMenu($label, $slug, $callback)
    {
        $menuLabel = sprintf(
            '%1$s <span class="extendify-assist-badge-count" data-test="assist-badge-count"></span>',
            $label
        );

        \add_menu_page(
            'Extendify',
            $menuLabel,
            Config::$requiredCapability,
            $slug,
            $callback,
            // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode, Generic.Files.LineLength.TooLong
            'data:image/svg+xml;base64,' . base64_encode('<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.773,9.373L16.679,10.467L10,3.788L3.321,10.467L2.227,9.373L10,1.6L14.129,5.729L14.129,3.665L16.194,3.665L16.194,7.794L17.773,9.373ZM16.194,11.437L16.194,17.6L3.806,17.6L3.806,11.437L10,5.254L16.194,11.437ZM13.297,11.525C13.394,11.437 13.432,11.301 13.387,11.178L13.388,11.176C13.326,11.008 13.251,10.847 13.165,10.692L13.099,10.578C13.006,10.423 12.901,10.276 12.787,10.138C12.704,10.037 12.566,10.002 12.441,10.042L11.881,10.219C11.74,10.263 11.586,10.235 11.462,10.155C11.393,10.111 11.322,10.07 11.249,10.032C11.116,9.964 11.015,9.845 10.984,9.702L10.858,9.127C10.83,8.999 10.731,8.897 10.601,8.876C10.406,8.843 10.206,8.827 10.001,8.827C9.797,8.827 9.596,8.843 9.402,8.877C9.272,8.899 9.173,9 9.145,9.129L9.019,9.703C8.987,9.847 8.885,9.966 8.754,10.033C8.68,10.07 8.61,10.112 8.541,10.156C8.415,10.236 8.263,10.266 8.121,10.221L7.561,10.043C7.437,10.004 7.299,10.037 7.215,10.139C7.101,10.277 6.997,10.424 6.904,10.579L6.837,10.694C6.751,10.849 6.676,11.01 6.614,11.178C6.569,11.301 6.607,11.437 6.705,11.525L7.141,11.923C7.251,12.022 7.302,12.168 7.294,12.317C7.293,12.358 7.292,12.399 7.292,12.441C7.292,12.483 7.293,12.524 7.294,12.565C7.302,12.712 7.249,12.859 7.141,12.959L6.705,13.355C6.607,13.443 6.569,13.58 6.614,13.703C6.676,13.871 6.751,14.031 6.837,14.187L6.904,14.301C6.997,14.456 7.101,14.603 7.215,14.741C7.299,14.841 7.437,14.877 7.561,14.837L8.12,14.658C8.261,14.613 8.415,14.642 8.539,14.723C8.608,14.767 8.679,14.808 8.752,14.846C8.884,14.913 8.987,15.032 9.018,15.176L9.143,15.75C9.171,15.879 9.27,15.98 9.4,16.002C9.595,16.034 9.795,16.051 10,16.051C10.205,16.051 10.405,16.034 10.6,16.002C10.729,15.98 10.828,15.879 10.857,15.75L10.982,15.176C11.015,15.032 11.116,14.913 11.247,14.846C11.321,14.809 11.391,14.767 11.461,14.723C11.586,14.642 11.739,14.613 11.88,14.658L12.44,14.836C12.564,14.875 12.703,14.841 12.786,14.74C12.9,14.602 13.005,14.455 13.098,14.3L13.164,14.185C13.25,14.03 13.325,13.869 13.387,13.701C13.432,13.578 13.394,13.441 13.297,13.354L12.861,12.957C12.751,12.859 12.7,12.712 12.707,12.564C12.708,12.523 12.71,12.482 12.71,12.439C12.71,12.397 12.708,12.356 12.707,12.315C12.7,12.168 12.752,12.022 12.861,11.922L13.297,11.525ZM10.8,13.238C10.588,13.449 10.301,13.569 10.001,13.569C9.702,13.569 9.415,13.449 9.203,13.238C8.991,13.026 8.872,12.739 8.872,12.439C8.872,12.14 8.991,11.853 9.203,11.641C9.415,11.429 9.702,11.31 10.001,11.31C10.301,11.31 10.588,11.429 10.8,11.641C11.011,11.853 11.13,12.14 11.13,12.439C11.13,12.739 11.011,13.026 10.8,13.238Z" style="fill:#a7aaad;" fill="currentColor" /></svg>'),
            PartnerData::$id ? 0 : null
        );
    }

    /**
     * Routes pages accordingly
     *
     * @return string
     */
    public function getRoute()
    {
        // This router use to handle more cases but now everyone goes to Assist.
        return 'admin.php?page=extendify-assist';
    }

    /**
     * Routes /wp-admin/?launch-redirect based on Launch and Agent state.
     *
     * @return void
     */
    public function handleLaunchRedirect()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (!isset($_GET['launch-redirect']) || \wp_doing_ajax() || !PartnerData::$id) {
            return;
        }

        // If launch hasn't yet completed, they go to launch/auto-launch
        if (!Config::$launchCompleted) {
            $useAgentOnboarding = PartnerData::setting('useAgentOnboarding') ||
                Config::preview('agent-onboarding') ||
                constant('EXTENDIFY_DEVMODE');
            $page = $useAgentOnboarding ? 'extendify-auto-launch' : 'extendify-launch';
            $query_params = $this->presentLaunchParams(['page' => $page]);
            \wp_safe_redirect(\add_query_arg($query_params, \admin_url('admin.php')));
            exit;
        }

        // If they have the Agent onboarding enabled, redirect to home.
        if (PartnerData::setting('showAIAgents')) {
            \wp_safe_redirect(\add_query_arg(
                ['extendify-open-agent' => '1'],
                \home_url('/')
            ));
            exit;
        }

        // Otherwise, they go to Assist.
        \wp_safe_redirect(\admin_url() . $this->getRoute());
        exit;
    }

    /**
     * Redirect once to Launch, only once (at least once) when
     * the email matches the entry in WP Admin > Settings > General.
     * Requests carrying a build-id keep redirecting until onboarding
     * completes.
     *
     * @return void
     */
    public function redirectOnce()
    {
        if (wp_doing_ajax()) {
            return;
        }

        if (defined('EXTENDIFY_IS_THEME_EXTENDABLE') && !EXTENDIFY_IS_THEME_EXTENDABLE) {
            return;
        }

        // Partner preview links must work on every admin visit, not just the first.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.MissingUnslash
        $buildIdRedirect = !empty(sanitize_text_field(wp_unslash($_GET['build-id'] ?? '')))
            && !Config::$launchCompleted;

        if (!$buildIdRedirect && \get_option('extendify_launch_loaded', false)) {
            return;
        }

        if (!Config::$showLaunch) {
            return;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (isset($_GET['page']) && $_GET['page'] === 'extendify-auto-launch') {
            return;
        }

        // Only redirect if we aren't already on the page.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (isset($_GET['page']) && $_GET['page'] === 'extendify-launch') {
            $agentOnboarding = PartnerData::setting('useAgentOnboarding') ||
                Config::preview('agent-onboarding') ||
                constant('EXTENDIFY_DEVMODE');
            if ($agentOnboarding) {
                // If they landed on launch but have the Agent onboarding enabled, redirect to
                // auto-launch — carrying their deep-link params, which a bare page-only redirect drops.
                $query_params = $this->presentLaunchParams(['page' => 'extendify-auto-launch']);
                \wp_safe_redirect(\add_query_arg($query_params, \admin_url('admin.php')));
                exit;
            }
            return;
        }

        if ($buildIdRedirect) {
            \update_option('permalink_structure', '/%postname%/');
            \update_option('extendify_needs_rewrite_flush', true);

            // Only AutoLaunch consumes build-id.
            $query_params = $this->presentLaunchParams(['page' => 'extendify-auto-launch']);
            \wp_safe_redirect(\add_query_arg($query_params, \admin_url('admin.php')));
            exit;
        }

        $user = \wp_get_current_user();
        if (
            $user
            // Check the main admin email, and they have an admin role.
            && \get_option('admin_email') === $user->user_email
            && in_array('administrator', $user->roles, true)
        ) {
            // Only redirect 3 times.
            $currentCount = \get_option('extendify_attempted_redirect_count', 0);
            if ($currentCount >= 3) {
                return;
            }

            \update_option('extendify_attempted_redirect_count', ($currentCount + 1));
            \update_option('extendify_attempted_redirect', gmdate('Y-m-d H:i:s'));

            // Update permalink structure to postname when auto-redirecting to Launch
            \update_option('permalink_structure', '/%postname%/');
            \update_option('extendify_needs_rewrite_flush', true);

            // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.MissingUnslash
            $autoLaunch = isset($_GET['auto-launch']) && filter_var($_GET['auto-launch'], FILTER_VALIDATE_BOOLEAN);
            $query_params = $this->presentLaunchParams([
                'page' => $autoLaunch ? 'extendify-auto-launch' : 'extendify-launch',
            ]);

            $redirect_url = \add_query_arg($query_params, \admin_url('admin.php'));
            \wp_safe_redirect($redirect_url);
            exit;
        }
    }

    /**
     * Merges the allowlisted launch deep-link params present in the request onto
     * $base, so a redirect into Launch/AutoLaunch carries the partner's params
     * through instead of dropping them.
     *
     * @param array $base Seed query args (typically the destination `page`).
     * @return array
     */
    private function presentLaunchParams(array $base)
    {
        $allowed = [
            'objective',
            'title',
            'description',
            'structure',
            'tone',
            'skip',
            'type',
            'category',
            'products',
            'appointments',
            'events',
            'donations',
            'multilingual',
            'contact',
            'address',
            'blog',
            'landing-page',
            'cta-link',
            'build-id',
            'go',
        ];

        foreach ($allowed as $param) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            $value = sanitize_text_field(wp_unslash($_GET[$param] ?? ''));
            if (!empty($value)) {
                $base[$param] = $value;
            }
        }

        return $base;
    }

    /**
     * Flushes WordPress rewrite rules if previously scheduled by `redirectOnce()`.
     *
     * This is triggered based on a flag (`extendify_needs_rewrite_flush`) that is set
     * when the permalink structure is modified. Flushing rewrite rules in the same
     * request where the permalink structure is updated can be ineffective due to
     * internal WordPress caching, so the flush is deferred to a subsequent request.
     *
     * @return void
     */
    public function maybeForceFlush()
    {
        if (\get_option('extendify_needs_rewrite_flush', false)) {
            \flush_rewrite_rules(true);
            \delete_option('extendify_needs_rewrite_flush');
        }
    }
}
