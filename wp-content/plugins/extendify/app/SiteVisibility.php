<?php

/**
 * Controls whether the site is publicly visible and indexable
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

/**
 * This class reads and writes the site's public visibility and search engine indexing.
 */

class SiteVisibility
{
    /**
     * The option holding the visibility state
     *
     * @var string
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPTION = 'extendify_site_visibility';

    /**
     * Whether the site is visible to anonymous visitors.
     *
     * @return boolean
     */
    public static function isPublished()
    {
        // A site with no marker predates the partner flag, so it stays public.
        return \get_option(self::OPTION) !== 'unpublished';
    }

    /**
     * Hide the site from anonymous visitors until the owner publishes it.
     *
     * @return void
     */
    public static function markUnpublished()
    {
        \update_option(self::OPTION, 'unpublished');
    }

    /**
     * Make the site visible to anonymous visitors.
     *
     * @return void
     */
    public static function markPublished()
    {
        \update_option(self::OPTION, 'published');
    }

    /**
     * Whether WordPress's "Discourage search engines" setting is on.
     *
     * @return boolean
     */
    public static function searchEnginesBlocked()
    {
        return (string) \get_option('blog_public') === '0';
    }

    /**
     * Ask search engines not to index the site.
     *
     * @return void
     */
    public static function blockIndexing()
    {
        \update_option('blog_public', '0');
    }

    /**
     * Let search engines index the site.
     *
     * @return void
     */
    public static function allowIndexing()
    {
        \update_option('blog_public', '1');
    }
}
