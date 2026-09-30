<?php

/**
 * Notification data.
 */

namespace Extendify\Shared\DataProvider;

defined('ABSPATH') || die('No direct access.');

use Extendify\Constants;
use Extendify\PartnerData;

/**
 * Fetches and caches the notifications.
 */
class NotificationData
{
    /**
     * Kept in sync with the token withSiteHost() swaps in src/Notifications/notification-link.js.
     *
     * @var string
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const SITE_URL_TOKEN = '{SITEURL}';

    /**
     * Registers the wp-cron handler that refreshes stale notifications.
     *
     * @return void
     */
    public static function scheduleCache()
    {
        \add_action('extendify_notifications_refresh', [self::class, 'refresh']);
    }

    /**
     * Returns the cached notifications, refreshing on cold start and
     * scheduling a background refresh when the cache is stale.
     *
     * @return array
     */
    public static function get()
    {
        if (!PartnerData::$id) {
            return [];
        }

        $locale = \get_locale();
        $cached = \get_option('extendify_notifications_' . $locale);

        if (!is_array($cached) || !isset($cached['fetchedAt'])) {
            return self::withSafeLinks(self::refresh($locale) ?? []);
        }

        $age = time() - $cached['fetchedAt'];
        // A host whose requests are being refused would otherwise re-ask every TTL.
        $ttl = empty($cached['failed']) ? (5 * MINUTE_IN_SECONDS) : HOUR_IN_SECONDS;
        if ($age > $ttl) {
            if (!\wp_next_scheduled('extendify_notifications_refresh', [$locale])) {
                \wp_schedule_single_event(time(), 'extendify_notifications_refresh', [$locale]);
                if (\is_admin()) {
                    \spawn_cron();
                }
            }
        }

        return self::withSafeLinks($cached['data'] ?? []);
    }

    /**
     * Drops any link a browser must not follow.
     *
     * A feed link becomes an href in wp-admin, so javascript: would run as the site owner.
     *
     * @param mixed $notifications - Notifications as the feed sent them.
     * @return array
     */
    private static function withSafeLinks($notifications)
    {
        if (!is_array($notifications)) {
            return [];
        }

        return array_map([self::class, 'withSafeLink'], $notifications);
    }

    /**
     * Drops one notification's link unless it is http, https or site-relative.
     *
     * esc_url_raw strips the placeholder's braces, so only the probe copy goes through it.
     *
     * @param mixed $notification - One notification as the feed sent it.
     * @return mixed
     */
    private static function withSafeLink($notification)
    {
        if (!is_array($notification) || !isset($notification['link'])) {
            return $notification;
        }

        if (!is_string($notification['link'])) {
            unset($notification['link']);

            return $notification;
        }

        $host = (string) \wp_parse_url(\home_url(), PHP_URL_HOST);
        $probe = str_replace(self::SITE_URL_TOKEN, $host, $notification['link']);

        if (\esc_url_raw($probe, ['http', 'https']) === '') {
            unset($notification['link']);
        }

        return $notification;
    }

    /**
     * Fetch notifications from the API and persist them.
     * Called synchronously on cold start and via wp-cron when the cache is stale.
     *
     * @param string $locale - Locale to fetch (cron may run in a different site locale).
     * @return array|null
     */
    public static function refresh($locale)
    {
        if (!PartnerData::$id) {
            return [];
        }

        $optionKey = 'extendify_notifications_' . $locale;

        $url = \add_query_arg(
            ['partner' => PartnerData::$id, 'wp_language' => $locale],
            Constants::AI_HOST . '/api/notifications'
        );
        $response = \wp_remote_get($url, ['headers' => ['Accept' => 'application/json']]);
        $result = \is_wp_error($response)
            ? null
            : json_decode(\wp_remote_retrieve_body($response), true);

        if (!is_array($result) || !is_array($result['notifications'] ?? null)) {
            $cached = \get_option($optionKey);
            \update_option(
                $optionKey,
                [
                    'data' => is_array($cached) ? ($cached['data'] ?? []) : [],
                    'fetchedAt' => time(),
                    'failed' => true,
                ],
                false
            );
            return null;
        }

        $notifications = $result['notifications'];
        \update_option(
            $optionKey,
            ['data' => $notifications, 'fetchedAt' => time()],
            false
        );
        return $notifications;
    }
}
