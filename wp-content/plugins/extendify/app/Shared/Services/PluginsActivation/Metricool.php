<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class Metricool extends PluginActivation
{
    public static function slug(): string
    {
        return 'metricool';
    }

    public static function createAccountRoute(): string
    {
        // Metricool registers its logout route only when the request URL contains "/metricool/v".
        return '/' . static::slug() . '/v1/create-account';
    }

    public static function scriptData(): array
    {
        return [
            'recaptchaSiteKey' => static::recaptchaSiteKey(),
            'recaptchaAction' => 'signup',
        ];
    }

    public static function isEligible(): bool
    {
        return empty(\get_option('metricool_auth_token'));
    }

    // Metricool assesses the captcha itself, so a token minted with any other site key fails.
    protected static function recaptchaSiteKey(): string
    {
        $config = WP_PLUGIN_DIR . '/' . static::slug() . '/config/env.php';
        $env = is_readable($config) ? require $config : [];
        $key = $env['metricool']['google_recaptcha_key'] ?? '';

        return is_string($key) ? $key : '';
    }

    public static function createAccount(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!static::isActive()) {
            return static::pluginNotActiveResponse();
        }

        $steps = [];
        $response = static::signUp($steps, $request);

        return new \WP_REST_Response(
            array_merge((array) $response->get_data(), ['stepTimeInMs' => $steps]),
            $response->get_status()
        );
    }

    protected static function signUp(array &$steps, \WP_REST_Request $request): \WP_REST_Response
    {
        $create = static::dispatch($steps, 'onboarding/create_account', [
            'email' => \sanitize_email($request->get_param('email')),
            'terms' => (bool) $request->get_param('termsAgreed'),
            'marketing' => (bool) $request->get_param('marketingConsent'),
            'captcha' => \sanitize_text_field($request->get_param('captcha_token')),
            'password' => static::generatePassword(),
        ]);
        if ($create->is_error()) {
            return static::withFallbackCode($create, 'metricool_create_account_failed');
        }

        $finish = static::dispatch($steps, 'onboarding/finish_onboarding');
        if ($finish->is_error()) {
            return static::withFallbackCode($finish, 'metricool_finish_onboarding_failed');
        }

        if (static::isComplete($finish)) {
            return new \WP_REST_Response(['success' => true], 200);
        }

        return static::connectTheOnlyBrand($steps, $finish);
    }

    // Their onboarding stops at a brand picker no user will reach here.
    protected static function connectTheOnlyBrand(array &$steps, \WP_REST_Response $finish): \WP_REST_Response
    {
        $response = static::dispatch($steps, 'connected_brands', [], 'GET');
        $brands = $response->is_error() ? [] : (array) ($response->get_data()['data'] ?? []);
        $brandCount = count($brands);

        // Their own signup connects a brand only when the account owns exactly one.
        $brand = $brandCount === 1 ? (array) reset($brands) : [];
        $blogId = (string) ($brand['id'] ?? '');
        if ($blogId === '') {
            return static::brandNotConnected($finish, $brandCount);
        }

        $retry = static::dispatch($steps, 'onboarding/finish_onboarding', ['blogId' => $blogId]);
        if ($retry->is_error() || !static::isComplete($retry)) {
            return static::brandNotConnected($finish, $brandCount);
        }

        return new \WP_REST_Response(['success' => true], 200);
    }

    protected static function brandNotConnected(\WP_REST_Response $finish, int $brandCount): \WP_REST_Response
    {
        $state = static::onboardingState($finish);

        return new \WP_REST_Response([
            'code' => 'metricool_brand_not_connected',
            'message' => \__('Metricool could not connect a brand to this site.', 'extendify-local'),
            // authenticated means the account exists and only the brand connection failed.
            'data' => [
                'authenticated' => (bool) ($state['authenticated'] ?? false),
                'blog_id_selected' => (bool) ($state['blog_id_selected'] ?? false),
                'brand_count' => $brandCount,
            ],
        ], 500);
    }

    protected static function isComplete(\WP_REST_Response $response): bool
    {
        return !empty(static::onboardingState($response)['completed']);
    }

    protected static function onboardingState(\WP_REST_Response $response): array
    {
        return (array) ($response->get_data()['data']['onboarding']['state'] ?? []);
    }

    protected static function generatePassword(): string
    {
        // wp_generate_password() draws uniformly — a class Metricool requires can be missing.
        do {
            $password = \wp_generate_password(20, true);
        } while (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,20}$/', $password));

        return $password;
    }

    protected static function dispatch(
        array &$steps,
        string $route,
        array $body = [],
        string $method = 'POST'
    ): \WP_REST_Response {
        $request = new \WP_REST_Request($method, '/metricool/v1/' . $route);
        // Their nonce middleware only enforces on the verbs that write.
        if ($method !== 'GET') {
            $request->set_header('Content-Type', 'application/json');
            $request->set_body(\wp_json_encode(array_merge(
                $body,
                ['nonce' => \wp_create_nonce('metricool_nonce')]
            )));
        }

        $start = microtime(true);
        $response = \rest_do_request($request);
        $steps[static::stepKey($steps, $route)] = (int) round((microtime(true) - $start) * 1000);

        return $response;
    }

    // finish_onboarding can run twice; a plain key would drop the first timing.
    protected static function stepKey(array $steps, string $route): string
    {
        $key = basename($route);
        for ($n = 2; isset($steps[$key]); $n++) {
            $key = basename($route) . '_' . $n;
        }

        return $key;
    }
}
