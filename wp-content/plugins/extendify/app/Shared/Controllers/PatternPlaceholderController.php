<?php

/**
 * Controller for updating patterns based on their dependencies.
 */

namespace Extendify\Shared\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\PluginDependencies\Forms\WPForms;
use Extendify\Shared\Services\PluginDependencies\Forms\ContactForm7;
use Extendify\Shared\Services\PluginDependencies\WooCommerce;
use Extendify\Shared\Services\PluginDependencies\SimplyBook;

/**
 * The controller for interacting with the pattern deps.
 */

class PatternPlaceholderController
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const PLUGIN_HANDLERS = [
        'contact-form-7' => ContactForm7::class,
        'wpforms-lite' => WPForms::class,
        'woocommerce' => WooCommerce::class,
        'simplybook' => SimplyBook::class,
    ];

    /**
     * Replace all placeholders in the given content
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function processPlaceholders($request)
    {
        $patterns = $request->get_param('patterns');

        $patterns = array_map(function ($pattern) {
            $newCode = ($pattern['patternReplacementCode'] ?? null);
            $pluginDependency = ($pattern['pluginDependency'] ?? null);
            if (!$newCode || !$pluginDependency) {
                return $pattern;
            }

            $metadata = null;
            if (isset($pattern['patternMetadata'])) {
                $metadata = json_decode($pattern['patternMetadata'], true);
            }

            $handlerClass = isset(self::PLUGIN_HANDLERS[$pluginDependency])
                ? self::PLUGIN_HANDLERS[$pluginDependency]
                : null;
            if ($handlerClass && isset($metadata['key'])) {
                $code = $handlerClass::create($pattern['code'], $metadata['key'], $newCode);
                if (is_wp_error($code)) {
                    // The caller renders whatever is in code, so leaving it is the fallback.
                    $pattern['pluginDependencyFailed'] = true;
                    return $pattern;
                }

                $pattern['code'] = $code;
                return $pattern;
            }

            // We added a feature this version doesn't yet support.
            return $pattern;
        }, $patterns);

        return new \WP_REST_Response($patterns);
    }
}
