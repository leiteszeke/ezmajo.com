<?php

namespace Extendify\PluginNotifications;

defined('ABSPATH') || die('No direct access.');

// phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
class NotificationsListTable extends \WP_List_Table
{
    public function __construct()
    {
        parent::__construct([
            'singular' => 'notification',
            'plural' => 'notifications',
            'ajax' => false,
        ]);
    }

    public function get_columns()
    {
        return [
            'cb' => '<input type="checkbox" />',
            'source' => \__('Plugin', 'extendify-local'),
            'type' => \__('Type', 'extendify-local'),
            'first_seen' => \__('Date', 'extendify-local'),
        ];
    }

    public function get_sortable_columns()
    {
        return [
            'source' => ['source_name', false],
            'type' => ['notice_type', false],
            'first_seen' => ['first_seen', true],
        ];
    }

    protected function get_views()
    {
        $allNotices = Admin::getNotices('all');
        $activeCount = count(array_filter($allNotices, function ($n) {
            return !$n['dismissed'];
        }));
        $dismissedCount = count(array_filter($allNotices, function ($n) {
            return $n['dismissed'];
        }));
        $totalCount = count($allNotices);

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $current = sanitize_text_field(wp_unslash($_REQUEST['filter'] ?? 'active'));
        $baseUrl = \admin_url('index.php?page=extendify-notifications');

        return [
            'active' => sprintf(
                '<a href="%s" class="%s">%s <span class="count">(%d)</span></a>',
                esc_url($baseUrl . '&filter=active'),
                $current === 'active' ? 'current' : '',
                \__('Active', 'extendify-local'),
                $activeCount
            ),
            'all' => sprintf(
                '<a href="%s" class="%s">%s <span class="count">(%d)</span></a>',
                esc_url($baseUrl . '&filter=all'),
                $current === 'all' ? 'current' : '',
                \__('All', 'extendify-local'),
                $totalCount
            ),
            'dismissed' => sprintf(
                '<a href="%s" class="%s">%s <span class="count">(%d)</span></a>',
                esc_url($baseUrl . '&filter=dismissed'),
                $current === 'dismissed' ? 'current' : '',
                \__('Dismissed', 'extendify-local'),
                $dismissedCount
            ),
        ];
    }

    protected function get_bulk_actions()
    {
        return [
            'bulk-dismiss' => \__('Dismiss', 'extendify-local'),
        ];
    }

    public function prepare_items()
    {
        $this->_column_headers = [
            $this->get_columns(),
            [],
            $this->get_sortable_columns(),
        ];

        $this->process_bulk_action();

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $filter = sanitize_text_field(wp_unslash($_REQUEST['filter'] ?? 'active'));
        $items = array_values(Admin::getNotices($filter));

        $allowedOrderby = ['first_seen', 'source_name', 'notice_type'];
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $orderby = sanitize_text_field(wp_unslash($_REQUEST['orderby'] ?? 'first_seen'));
        if (!in_array($orderby, $allowedOrderby, true)) {
            $orderby = 'first_seen';
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $order = sanitize_text_field(wp_unslash($_REQUEST['order'] ?? 'desc'));

        usort($items, function ($a, $b) use ($orderby, $order) {
            $result = strcmp($a[$orderby] ?? '', $b[$orderby] ?? '');
            return $order === 'asc' ? $result : -$result;
        });

        $perPage = 20;
        $currentPage = $this->get_pagenum();
        $totalItems = count($items);

        $this->items = array_slice($items, ($currentPage - 1) * $perPage, $perPage);

        $this->set_pagination_args([
            'total_items' => $totalItems,
            'per_page' => $perPage,
            'total_pages' => ceil($totalItems / $perPage),
        ]);
    }

    public function process_bulk_action()
    {
        if ($this->current_action() !== 'bulk-dismiss') {
            return;
        }

        check_admin_referer('extendify_notifications_bulk', '_extendify_nonce');

        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $ids = array_map('sanitize_text_field', wp_unslash($_REQUEST['notification'] ?? []));

        foreach ($ids as $id) {
            Admin::dismissNotice($id);
        }
    }

    public function column_cb($item)
    {
        return sprintf(
            '<input type="checkbox" name="notification[]" value="%s" />',
            esc_attr($item['id'])
        );
    }

    public function column_source($item)
    {
        $name = esc_html($item['source_name'] ?? 'WordPress');

        $dismissUrl = wp_nonce_url(
            \admin_url('index.php?page=extendify-notifications&extendify_action=dismiss&notice_id=' . $item['id']),
            'extendify_notifications_action',
            '_extendify_nonce'
        );

        $actions = [
            'view' => sprintf(
                '<a href="#" class="extendify-notice-toggle" data-notice-id="%s">%s</a>',
                esc_attr($item['id']),
                esc_html__('View', 'extendify-local')
            ),
        ];

        if (!$item['dismissed']) {
            $actions['dismiss'] = sprintf(
                '<a href="%s">%s</a>',
                esc_url($dismissUrl),
                esc_html__('Dismiss', 'extendify-local')
            );
        }

        return sprintf('<strong>%s</strong>%s', $name, $this->row_actions($actions));
    }

    public function column_type($item)
    {
        $type = $item['notice_type'] ?? 'info';
        $labels = [
            'error' => \__('Error', 'extendify-local'),
            'warning' => \__('Warning', 'extendify-local'),
            'success' => \__('Success', 'extendify-local'),
            'info' => \__('Info', 'extendify-local'),
        ];

        return sprintf(
            '<span class="extendify-notice-badge type-%s">%s</span>',
            esc_attr($type),
            esc_html($labels[$type] ?? $labels['info'])
        );
    }

    public function column_first_seen($item)
    {
        $timestamp = strtotime($item['first_seen']);

        return sprintf(
            '<span title="%s">%s</span>',
            esc_attr(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $timestamp)),
            esc_html(human_time_diff($timestamp, time()) . ' ' . \__('ago', 'extendify-local'))
        );
    }

    public function single_row($item)
    {
        parent::single_row($item);

        $content = preg_replace(
            '/class="([^"]*\bnotice\b[^"]*)"/',
            'class="$1 inline"',
            $item['content']
        );

        $colspan = count($this->get_columns());
        printf(
            '<tr data-detail="%s" style="display:none" class="extendify-notice-detail"><td colspan="%d">%s</td></tr>',
            esc_attr($item['id']),
            (int) $colspan,
            $content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        );
    }

    protected function get_primary_column_name()
    {
        return 'source';
    }

    protected function column_default($item, $columnName)
    {
        return esc_html($item[$columnName] ?? '');
    }
}
