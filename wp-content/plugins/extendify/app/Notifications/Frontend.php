<?php

/**
 * Front-end loader for notifications.
 */

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

class Frontend
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ADMIN_BAR_NODE = 'extendify-notifications';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public function __construct()
    {
        \add_action('wp_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        \add_action('wp_footer', [$this, 'renderMountPoint']);
        \add_action('wp_footer', [$this, 'renderModalMountPoint']);
        \add_action('admin_bar_menu', [$this, 'registerAdminBarNode'], 100);
        \add_action('extendify_toolbar_right', [$this, 'renderToolbarMountPoint']);
    }

    /**
     * @return bool
     */
    public static function shouldRender(string $slot)
    {
        return self::container($slot) !== '';
    }

    /**
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        $slots = [Slots::FRONTEND_BOTTOM, Slots::FRONTEND_TOPBAR, Slots::FRONTEND_MODAL];
        foreach ($slots as $slot) {
            if (self::shouldRender($slot)) {
                Assets::enqueue();
                return;
            }
        }
    }

    /**
     * @return void
     */
    public function renderMountPoint()
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Mount escapes
        echo self::container(Slots::FRONTEND_BOTTOM);
    }

    /**
     * @return void
     */
    public function renderModalMountPoint()
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Mount escapes
        echo self::container(Slots::FRONTEND_MODAL);
    }

    /**
     * @return void
     */
    public function registerAdminBarNode(\WP_Admin_Bar $bar)
    {
        if (self::simpleToolbarActive()) {
            return;
        }

        $container = self::container(Slots::FRONTEND_TOPBAR);
        if ($container === '') {
            return;
        }

        $bar->add_node([
            'id' => self::ADMIN_BAR_NODE,
            'parent' => 'top-secondary',
            'title' => $container,
        ]);
    }

    /**
     * The simple toolbar is its own markup, not admin-bar nodes.
     *
     * @return void
     */
    public function renderToolbarMountPoint()
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Mount escapes
        echo self::container(Slots::FRONTEND_TOPBAR);
    }

    /**
     * Toolbar\Frontend loads only for partners with the flag, so asking it
     * directly drops the core-bar node for everyone else.
     *
     * @return bool
     */
    private static function simpleToolbarActive()
    {
        return (bool) \apply_filters('extendify_simple_toolbar_active', false);
    }

    /**
     * Partner messaging aimed at the site owner, so visitors never see the bars.
     *
     * @return string
     */
    private static function container(string $slot)
    {
        if (\is_admin() || !\is_user_logged_in() || !\current_user_can(Config::$requiredCapability)) {
            return '';
        }

        // A bar pinned over the Customizer preview covers the site being previewed.
        if (\is_customize_preview()) {
            return '';
        }

        return Mount::container($slot);
    }
}
