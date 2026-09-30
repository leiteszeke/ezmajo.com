<?php

/**
 * Slots.
 */

namespace Extendify\Notifications;

defined('ABSPATH') || die('No direct access.');

/**
 * The slots a notification can be placed in. Slot names arrive from the API, so
 * ones this release has no container for are dropped rather than trusted.
 */
class Slots
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ADMIN_DASHBOARD = 'admin-dashboard';
    const ADMIN_OTHERS = 'admin-others';
    const ADMIN_ASSIST = 'admin-assist';
    const ADMIN_MODAL = 'admin-modal';
    const AGENT_CHAT = 'agent-chat';
    const FRONTEND_BOTTOM = 'frontend-bottom';
    const FRONTEND_TOPBAR = 'frontend-topbar';
    const FRONTEND_MODAL = 'frontend-modal';

    /**
     * A slot missing from src/Notifications/slots.js renders nothing.
     */
    const ALLOWLIST = [
        self::ADMIN_DASHBOARD,
        self::ADMIN_OTHERS,
        self::ADMIN_ASSIST,
        self::ADMIN_MODAL,
        self::AGENT_CHAT,
        self::FRONTEND_BOTTOM,
        self::FRONTEND_TOPBAR,
        self::FRONTEND_MODAL,
    ];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    public static function isKnown(string $slot)
    {
        return in_array($slot, self::ALLOWLIST, true);
    }
}
