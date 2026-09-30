<?php

/**
 * API router
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

/**
 * Simple router for the REST Endpoints
 */

class ApiRouter extends \WP_REST_Controller
{
    /**
     * The class instance.
     *
     * @var self|null
     */
    protected static $instance = null;

    /**
     * Check the authorization of the request
     *
     * @return boolean
     */
    public function checkPermission()
    {
        // Check for the nonce on the server (used by WP REST).
        if (
            isset($_SERVER['HTTP_X_WP_NONCE'])
            && \wp_verify_nonce(sanitize_text_field(wp_unslash($_SERVER['HTTP_X_WP_NONCE'])), 'wp_rest')
        ) {
            return \current_user_can(Config::$requiredCapability);
        }

        return false;
    }

    /**
     * Register dynamic routes
     *
     * @param string   $namespace - The api name space.
     * @param string   $endpoint  - The endpoint.
     * @param function $callback  - The callback to run.
     *
     * @return void
     */
    public function getHandler($namespace, $endpoint, $callback)
    {
        \register_rest_route($namespace, $endpoint, [
            'methods' => 'GET',
            'callback' => $callback,
            'permission_callback' => [$this, 'checkPermission'],
        ]);
    }

    /**
     * The post handler
     *
     * @param string $namespace - The api name space.
     * @param string $endpoint  - The endpoint.
     * @param string $callback  - The callback to run.
     *
     * @return void
     */
    public function postHandler($namespace, $endpoint, $callback)
    {
        \register_rest_route($namespace, $endpoint, [
            'methods' => 'POST',
            'callback' => $callback,
            'permission_callback' => [$this, 'checkPermission'],
        ]);
    }

    /**
     * The caller
     *
     * @param string $name      - The name of the method to call.
     * @param array  $arguments - The arguments to pass in.
     *
     * @return mixed
     */
    public static function __callStatic($name, array $arguments)
    {
        $name = "{$name}Handler";
        if (is_null(self::$instance)) {
            self::$instance = new static();
        }

        $r = self::$instance;
        return $r->$name(Config::$slug . '/' . Config::$apiVersion, ...$arguments);
    }
}
