<?php

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * WordPress sanitizes user global styles against the block style registry, so an
 * unregistered variation name is dropped from every read of the stored styles
 * and its CSS never compiles.
 */
class BlockStyleVariations
{
    /**
     * Variation names per block type, as last written to global styles.
     *
     * @var string
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const OPTION = 'extendify_block_style_variations';

    /**
     * @return void
     */
    public static function register()
    {
        // Late, so a theme registering the same name keeps its own label.
        add_action('init', [self::class, 'registerStored'], 99);
        add_filter('rest_request_before_callbacks', [self::class, 'registerIncoming'], 10, 3);
    }

    /**
     * @return void
     */
    public static function registerStored()
    {
        $stored = get_option(self::OPTION, []);
        $valid = self::validBlockTypes($stored);
        if ($valid !== $stored) {
            update_option(self::OPTION, $valid);
        }

        self::registerNames($valid);
    }

    /**
     * A design flow's write carries the names it needs, so nothing is fetched or
     * guessed. Runs before the controller sanitizes the incoming JSON.
     *
     * @param mixed            $response - The REST response, passed through untouched.
     * @param array            $handler  - The matched route handler.
     * @param \WP_REST_Request $request  - The incoming request.
     * @return mixed
     */
    public static function registerIncoming($response, $handler, $request)
    {
        $isWrite = in_array($request->get_method(), ['POST', 'PUT', 'PATCH'], true);
        if (!$isWrite || strpos($request->get_route(), '/wp/v2/global-styles') !== 0) {
            return $response;
        }

        // This filter runs before the route's permission_callback, so auth is checked here.
        if (!current_user_can('edit_theme_options')) {
            return $response;
        }

        $names = self::namesInWrite($request->get_param('styles'));
        if (!$names) {
            return $response;
        }

        self::registerNames($names);
        update_option(self::OPTION, self::mergeNames(get_option(self::OPTION, []), $names));

        return $response;
    }

    /**
     * @param mixed $styles - The styles node of a global styles write.
     * @return array<string, array<string>>
     */
    private static function namesInWrite($styles)
    {
        $blocks = is_array($styles) ? ($styles['blocks'] ?? []) : [];
        $names = [];
        foreach ((array) $blocks as $blockType => $block) {
            if (!self::isValidBlockType($blockType)) {
                continue;
            }

            $variations = is_array($block) ? ($block['variations'] ?? []) : [];
            $ours = array_filter(array_keys((array) $variations), function ($name) {
                return is_string($name) && strpos($name, 'ext-') === 0;
            });

            if ($ours) {
                $names[$blockType] = array_values($ours);
            }
        }

        return $names;
    }

    /**
     * @param mixed                        $stored - The names already persisted.
     * @param array<string, array<string>> $names  - The names to add.
     * @return array<string, array<string>>
     */
    private static function mergeNames($stored, $names)
    {
        $merged = is_array($stored) ? $stored : [];
        foreach ($names as $blockType => $blockNames) {
            $existing = (array) ($merged[$blockType] ?? []);
            $merged[$blockType] = array_values(array_unique(array_merge($existing, $blockNames)));
        }

        return $merged;
    }

    /**
     * A block-style key is interpolated unescaped into core's inline
     * registerBlockStyle() script, so only a real "namespace/block" name is
     * ever stored or registered — anything else is an injection attempt.
     *
     * @param mixed $blockType - The array key from a global-styles write.
     * @return bool
     */
    private static function isValidBlockType($blockType)
    {
        return is_string($blockType) && preg_match('~^[a-z0-9-]+/[a-z0-9-]+$~', $blockType) === 1;
    }

    /**
     * @param mixed $stored - The persisted names per block type.
     * @return array<string, array<string>>
     */
    private static function validBlockTypes($stored)
    {
        $names = is_array($stored) ? $stored : [];
        return array_filter($names, [self::class, 'isValidBlockType'], ARRAY_FILTER_USE_KEY);
    }

    /**
     * @param mixed $names - Variation names per block type.
     * @return void
     */
    private static function registerNames($names)
    {
        $registry = \WP_Block_Styles_Registry::get_instance();
        foreach ((array) $names as $blockType => $blockNames) {
            if (!self::isValidBlockType($blockType)) {
                continue;
            }

            foreach ((array) $blockNames as $name) {
                if (!is_string($name) || $registry->is_registered($blockType, $name)) {
                    continue;
                }

                \register_block_style($blockType, ['name' => $name, 'label' => $name]);
            }
        }
    }
}
