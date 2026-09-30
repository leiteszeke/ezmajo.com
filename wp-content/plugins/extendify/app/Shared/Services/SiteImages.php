<?php

/**
 * The SiteImages class
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads the site images cache, which holds two shapes across installs.
 */

class SiteImages
{
    /**
     * Split stored images into the banner picks and the section photos.
     *
     * @param mixed $siteImages - The stored or posted images.
     * @return array
     */
    public static function normalize($siteImages)
    {
        if (!is_array($siteImages)) {
            return ['hero' => [], 'general' => []];
        }

        // Sites launched before the banner picks stored one flat list of urls.
        if (!isset($siteImages['hero']) && !isset($siteImages['general'])) {
            return ['hero' => [], 'general' => self::images($siteImages)];
        }

        return [
            'hero' => self::images($siteImages['hero'] ?? []),
            'general' => self::images($siteImages['general'] ?? []),
        ];
    }

    /**
     * Every stored url, banner picks first.
     *
     * @param mixed $siteImages - The stored or posted images.
     * @return array
     */
    public static function urls($siteImages)
    {
        $siteImages = self::normalize($siteImages);

        return array_column(
            array_merge($siteImages['hero'], $siteImages['general']),
            'url'
        );
    }

    /**
     * Keep the entries carrying a url, as objects.
     *
     * @param mixed $images - One set of images.
     * @return array
     */
    private static function images($images)
    {
        if (!is_array($images)) {
            return [];
        }

        $normalized = [];
        foreach ($images as $image) {
            $url = is_array($image) ? ($image['url'] ?? null) : $image;
            if (!is_string($url) || $url === '') {
                continue;
            }

            $normalized[] = is_array($image) ? $image : ['url' => $url];
        }

        return $normalized;
    }
}
