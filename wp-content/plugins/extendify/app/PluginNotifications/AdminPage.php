<?php

namespace Extendify\PluginNotifications;

defined('ABSPATH') || die('No direct access.');

class AdminPage
{
    public static function handleActions()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (sanitize_text_field(wp_unslash($_REQUEST['page'] ?? '')) !== 'extendify-notifications') {
            return;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $action = sanitize_text_field(wp_unslash($_REQUEST['extendify_action'] ?? ''));

        if (empty($action)) {
            return;
        }

        check_admin_referer('extendify_notifications_action', '_extendify_nonce');

        if ($action === 'dismiss') {
            $id = sanitize_text_field(wp_unslash($_REQUEST['notice_id'] ?? ''));
            if ($id) {
                Admin::dismissNotice($id);
            }
        }

        if ($action === 'dismiss-all') {
            Admin::dismissAll();
        }

        \wp_safe_redirect(\admin_url('index.php?page=extendify-notifications'));
        exit;
    }

    public static function render()
    {
        if (!class_exists('WP_List_Table')) {
            require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
        }

        $table = new NotificationsListTable();
        $table->prepare_items();

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Plugin Notifications', 'extendify-local') . '</h1>';
        $table->views();
        echo '<form method="post">';
        \wp_nonce_field('extendify_notifications_bulk', '_extendify_nonce');
        $table->display();
        echo '</form>';
        echo '</div>';
    }
}
