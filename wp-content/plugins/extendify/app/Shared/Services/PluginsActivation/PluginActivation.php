<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

abstract class PluginActivation
{
    abstract public static function slug(): string;

    public static function createAccountRoute(): string
    {
        return '/' . static::slug() . '/create-account';
    }

    public static function scriptData(): array
    {
        return [];
    }

    public static function isActive(): bool
    {
        foreach ((array) \get_option('active_plugins', []) as $plugin) {
            if (dirname($plugin) === static::slug()) {
                return true;
            }
        }
        return false;
    }

    public static function isEligible(): bool
    {
        return true;
    }

    // rest_no_route names the failure better than the code we would mint.
    protected static function withFallbackCode(\WP_REST_Response $response, string $code): \WP_REST_Response
    {
        return new \WP_REST_Response(
            array_merge(['code' => $code], (array) $response->get_data()),
            $response->get_status()
        );
    }

    protected static function pluginNotActiveResponse(): \WP_REST_Response
    {
        return new \WP_REST_Response(
            [
                'code' => static::slug() . '_plugin_not_active',
                'message' => sprintf(
                    /* translators: %s: plugin slug */
                    \__('The %s plugin is not active.', 'extendify-local'),
                    static::slug()
                ),
            ],
            424
        );
    }

    public static function createAccount(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!static::isActive()) {
            return static::pluginNotActiveResponse();
        }

        $email = \sanitize_email($request->get_param('email'));
        $headers = (array) ($request->get_param('headers') ?? []);
        $body = (array) ($request->get_param('body') ?? []);

        $response = \wp_safe_remote_post(static::API_URL, [
            // http_request_args only lifts Extendify hosts, and it overrides this value if it ever matches.
            'timeout' => 45,
            'headers' => array_merge(['Content-Type' => 'application/json'], $headers),
            'body' => \wp_json_encode(array_merge(['email' => $email], $body)),
        ]);

        if (\is_wp_error($response)) {
            return new \WP_REST_Response([
                'code' => $response->get_error_code(),
                'message' => $response->get_error_message(),
            ], 500);
        }

        $code = \wp_remote_retrieve_response_code($response);
        $data = json_decode(\wp_remote_retrieve_body($response), true) ?? [];

        if ($code >= 200 && $code < 300) {
            static::saveKey($data);
        }

        return new \WP_REST_Response($data, $code);
    }

    protected static function saveKey(array $data)
    {
    }
}
