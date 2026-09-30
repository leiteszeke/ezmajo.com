<?php

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Shared\Services\LaunchUpdate\LaunchUpdater;

/**
 * With the `X-Extendify-Force-Reinstall` header, a `POST /wp/v2/plugins` install
 * over an existing plugin clears the destination instead of failing `folder_exists`.
 */
class ForcePluginReinstall
{
    /**
     * Set on the plugins install request, read back when the upgrader runs.
     * Static because the two filters fire at separate points of one request.
     *
     * @var boolean
     */
    private static $forcing = false;

    /**
     * The slug from the install request, read back when the upgrader runs.
     *
     * @var string
     */
    private static $slug = '';

    /**
     * @return void
     */
    public static function register()
    {
        add_filter('rest_request_before_callbacks', [self::class, 'captureRequest'], 10, 3);
        add_filter('upgrader_package_options', [self::class, 'clearDestination']);
        add_filter('upgrader_source_selection', [self::class, 'useInstalledDirectory'], 10, 2);
    }

    /**
     * @param mixed            $response - The REST response, passed through untouched.
     * @param array            $handler  - The matched route handler.
     * @param \WP_REST_Request $request  - The incoming request.
     * @return mixed
     */
    public static function captureRequest($response, $handler, $request)
    {
        self::$forcing = $request->get_method() === 'POST'
            && $request->get_route() === '/wp/v2/plugins'
            && filter_var($request->get_header('X-Extendify-Force-Reinstall'), FILTER_VALIDATE_BOOLEAN);
        self::$slug = self::$forcing ? (string) $request->get_param('slug') : '';

        return $response;
    }

    /**
     * Without the slug check, force-reinstalling any other plugin would land in
     * our folder.
     *
     * @param string|\WP_Error $source       - The extracted package folder.
     * @param string           $remoteSource - The temporary folder holding it.
     * @return string|\WP_Error
     */
    public static function useInstalledDirectory($source, $remoteSource)
    {
        if (self::$slug !== Config::$slug) {
            return $source;
        }

        return LaunchUpdater::useInstalledDirectory($source, $remoteSource);
    }

    /**
     * @param array $options - The upgrader package options.
     * @return array
     */
    public static function clearDestination($options)
    {
        if (self::$forcing) {
            $options['clear_destination'] = true;
        }

        return $options;
    }
}
