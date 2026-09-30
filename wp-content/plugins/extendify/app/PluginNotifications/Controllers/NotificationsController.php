<?php

namespace Extendify\PluginNotifications\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\PluginNotifications\Admin;

class NotificationsController
{
    public static function dismiss(\WP_REST_Request $request)
    {
        $id = sanitize_text_field($request->get_param('id'));
        Admin::dismissNotice($id);
        return new \WP_REST_Response(['success' => true]);
    }

    public static function dismissAll()
    {
        Admin::dismissAll();
        return new \WP_REST_Response(['success' => true]);
    }
}
