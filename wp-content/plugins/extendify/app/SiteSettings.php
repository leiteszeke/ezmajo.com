<?php

/**
 * Controls Draft
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');


/**
 * The controller for interacting with site settings
 */

class SiteSettings
{
    /**
     * Get when the site was created
     *
     * @return string|NULL
     */
    public static function getSiteCreatedAt()
    {
        $cacheKey = 'extendify_site_created_at';
        $cached = \wp_cache_get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $userOne = \get_userdata(1);
        if ($userOne) {
            $createdAt = $userOne->user_registered;
            \wp_cache_set($cacheKey, $createdAt);
            return $createdAt;
        }

        $wpdb = $GLOBALS['wpdb'];
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        $result = $wpdb->get_row($wpdb->prepare(
            'SELECT CREATE_TIME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME = %s
            LIMIT 1',
            $wpdb->dbname,
            $wpdb->posts
        ));
        if (!property_exists($result, 'CREATE_TIME')) {
            return null;
        }

        $createdAt = gmdate(
            'Y-m-d H:i:s',
            strtotime($result->CREATE_TIME)
        );
        \wp_cache_set($cacheKey, $createdAt);
        return $createdAt;
    }
}
