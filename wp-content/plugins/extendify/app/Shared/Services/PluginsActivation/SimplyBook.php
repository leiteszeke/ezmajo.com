<?php

namespace Extendify\Shared\Services\PluginsActivation;

defined('ABSPATH') || die('No direct access.');

class SimplyBook extends PluginActivation
{
    // Plugin requires PHP 7.0; constant visibility modifiers are PHP 7.1+.
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const AWAITING_CALLBACK = 'extendify_simplybook_awaiting_callback';

    public static function slug(): string
    {
        return 'simplybook';
    }

    protected static function simplybookNonce(): string
    {
        return \wp_create_nonce('simplybook_nonce');
    }

    public static function scriptData(): array
    {
        // Only their React bundle carries the action, so it can't be read alongside the key.
        return [
            'recaptchaSiteKey' => static::recaptchaSiteKey(),
            'recaptchaAction' => 'create_company',
        ];
    }

    public static function isEligible(): bool
    {
        // simplybook_onboarding_completed is set before the account exists, so it would hide eligible sites.
        return empty(\get_option('simplybook_token_admin'));
    }

    // SimplyBook assesses the captcha itself, so a token minted with any other site key fails.
    protected static function recaptchaSiteKey(): string
    {
        $config = WP_PLUGIN_DIR . '/' . static::slug() . '/config/env.php';
        $env = is_readable($config) ? require $config : [];
        $key = $env['simplybook']['recaptcha']['site_key'] ?? '';

        return is_string($key) ? $key : '';
    }

    public static function createAccount(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!static::isActive()) {
            return static::pluginNotActiveResponse();
        }

        // Reset onboarding data to have a fresh start
        delete_option('simplybook_onboarding_completed');
        static::dispatchOnboarding('retry_onboarding');

        // Matches the callback URL lifetime they mint; nothing arrives later.
        \set_transient(self::AWAITING_CALLBACK, true, 10 * MINUTE_IN_SECONDS);

        $create = static::dispatchOnboarding('create_account', [
            'email' => \sanitize_email($request->get_param('email')),
            'terms-and-conditions' => (bool) $request->get_param('termsAgreed'),
            'marketing-consent' => (bool) $request->get_param('marketingConsent'),
            'captcha_token' => \sanitize_text_field($request->get_param('captcha_token')),
        ]);
        if ($create->is_error()) {
            \delete_transient(self::AWAITING_CALLBACK);
            return $create;
        }

        return new \WP_REST_Response(['success' => true], 200);
    }

    // Marking onboarding complete unregisters the route their token-saving callback arrives on.
    public static function register()
    {
        \add_action('simplybook_after_company_registered', [self::class, 'finishOnboarding'], 10, 0);
    }

    public static function finishOnboarding()
    {
        // Their own wizard finishes this itself, at the end of its step 2.
        if (!\get_transient(self::AWAITING_CALLBACK)) {
            return;
        }

        \delete_transient(self::AWAITING_CALLBACK);
        static::dispatchOnboarding('finish_onboarding');
    }

    protected static function dispatchOnboarding(string $action, array $body = []): \WP_REST_Response
    {
        $request = new \WP_REST_Request('POST', '/simplybook/v1/onboarding/' . $action);
        $request->set_header('Content-Type', 'application/json');
        $request->set_body(\wp_json_encode(array_merge($body, ['nonce' => static::simplybookNonce()])));

        return \rest_do_request($request);
    }
}
