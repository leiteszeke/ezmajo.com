<?php

/**
 * Admin.
 */

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

class Admin
{
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        \add_action('admin_notices', [$this, 'renderMountPoint']);
        \add_action('admin_footer', [$this, 'renderModalMountPoint']);
    }

    /**
     * Adds the banner bundle on eligible admin screens
     *
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        if ($this->container() === '' && $this->modalContainer() === '') {
            return;
        }

        Assets::enqueue();
    }

    /**
     * Prints the banner mount node on eligible admin screens
     *
     * @return void
     */
    public function renderMountPoint()
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Mount escapes
        echo $this->container();
    }

    /**
     * Prints the modal mount node on screens admin_notices never reaches
     *
     * @return void
     */
    public function renderModalMountPoint()
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Mount escapes
        echo $this->modalContainer();
    }

    /**
     * notifications.js wraps a container carrying data-admin-notice in
     * admin-notice spacing.
     *
     * @return string
     */
    private function container()
    {
        $slot = $this->currentSlot();
        return $slot ? Mount::container($slot, ['data-admin-notice']) : '';
    }

    private function modalContainer()
    {
        return Mount::container(Slots::ADMIN_MODAL);
    }

    private function currentSlot()
    {
        $screen = \get_current_screen();
        if (!$screen) {
            return null;
        }

        if ($screen->id === 'dashboard') {
            return Slots::ADMIN_DASHBOARD;
        }

        return $this->isExcludedScreen($screen) ? null : Slots::ADMIN_OTHERS;
    }

    private function isExcludedScreen($screen)
    {
        if ($screen->base === 'post') {
            return true;
        }

        $excludedIds = ['site-editor', 'plugins', 'plugin-install', 'plugin-editor'];
        if (in_array($screen->id, $excludedIds, true)) {
            return true;
        }

        return strpos($screen->id, '_page_') !== false;
    }
}
