<?php

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Import\ImageUploader;

/**
 * Adds an `images` field to WooCommerce's product abilities, which ship with no
 * way to set a product image at all.
 */
class WooProductImages
{
    public static $abilities = [
        'woocommerce/product-create',
        'woocommerce/product-update',
    ];

    public static function init()
    {
        \add_filter('wp_register_ability_args', [self::class, 'patchArgs'], 10, 2);
    }

    /**
     * Extend the schemas and wrap the callback of a product ability.
     *
     * Runs before the Abilities API validates the args or builds the
     * WP_Ability, so every reader downstream — REST, MCP — sees only the
     * patched version.
     *
     * @param array $args Ability registration args.
     * @param string $name Ability name, with namespace.
     * @return array
     */
    public static function patchArgs($args, $name)
    {
        if (!in_array($name, self::$abilities, true)) {
            return $args;
        }

        // Woo reworking these abilities could make a blind patch reject every call.
        if (empty($args['input_schema']['oneOf']) || !is_array($args['input_schema']['oneOf'])) {
            return $args;
        }

        foreach ($args['input_schema']['oneOf'] as $branch) {
            // Woo shipped its own image support; patching again would duplicate it.
            if (isset($branch['properties']['images'])) {
                return $args;
            }
        }

        foreach (array_keys($args['input_schema']['oneOf']) as $index) {
            // Every branch sets additionalProperties:false, so a root-level field fails.
            $args['input_schema']['oneOf'][$index]['properties']['images'] = self::inputSchema();
        }

        $product = &$args['output_schema']['properties']['product']['properties'];
        $product['images'] = [
            'type' => 'array',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'url' => ['type' => 'string'],
                ],
            ],
        ];
        $product['failed_images'] = [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ];

        $original = $args['execute_callback'];
        $args['execute_callback'] = function ($input) use ($original) {
            return self::execute($original, $input);
        };

        return $args;
    }

    /**
     * Run Woo's own callback, then attach the images it ignored.
     *
     * @param callable $original Woo's execute_callback.
     * @param array $input Ability input, including our `images`.
     * @return array|\WP_Error
     */
    public static function execute($original, $input)
    {
        $images = isset($input['images']) ? $input['images'] : [];
        unset($input['images']);

        // Woo's callback rejects an id-only update, so an image-only change attaches directly.
        $imagesOnly = $images
            && !empty($input['id'])
            && empty(array_diff(array_keys($input), ['id']))
            && \get_post((int) $input['id']);
        if ($imagesOnly) {
            $productId = (int) $input['id'];
            return ['product' => array_merge(['id' => $productId], self::attach($productId, $images))];
        }

        $result = call_user_func($original, $input);

        if (\is_wp_error($result) || !$images || empty($result['product']['id'])) {
            return $result;
        }

        return array_replace_recursive($result, [
            'product' => self::attach($result['product']['id'], $images),
        ]);
    }

    /**
     * Import each image, then set the first as featured and the rest as the
     * gallery — the ordering WooCommerce's own REST API applies.
     *
     * @param int $productId Product post id.
     * @param array $images Image descriptors from the ability input.
     * @return array
     */
    private static function attach($productId, $images)
    {
        $ids = [];
        $failed = [];

        foreach ($images as $image) {
            $src = isset($image['src']) ? $image['src'] : '';
            $given = isset($image['id']) ? $image['id'] : $src;

            // anyOf would enforce this in schema, but the model's converter breaks on it.
            if (!$given) {
                continue;
            }

            $id = isset($image['id']) ? self::existingAttachment($image['id']) : self::sideload($src);

            if (!$id) {
                $failed[] = (string) $given;
                continue;
            }

            if (!empty($image['alt'])) {
                \update_post_meta($id, '_wp_attachment_image_alt', \sanitize_text_field($image['alt']));
            }

            $ids[] = $id;
        }

        if ($ids) {
            \set_post_thumbnail($productId, $ids[0]);
            \update_post_meta($productId, '_product_image_gallery', implode(',', array_slice($ids, 1)));
        }

        // Carrying the url spares every later render of this result a lookup.
        $images = array_map(function ($id) {
            return ['id' => $id, 'url' => (string) \wp_get_attachment_url($id)];
        }, $ids);

        return [
            'images' => $images,
            'failed_images' => $failed,
        ];
    }

    private static function existingAttachment($id)
    {
        $id = (int) $id;

        return \wp_attachment_is_image($id) ? $id : false;
    }

    private static function sideload($url)
    {
        // Woo's permission callback clears product caps, not upload_files.
        if (!\current_user_can('upload_files')) {
            return false;
        }

        $uploaded = (new ImageUploader())->uploadImage($url);

        return \is_wp_error($uploaded) ? false : $uploaded['attachment_id'];
    }

    private static function inputSchema()
    {
        return [
            'type' => 'array',
            // The picker returns one, so extra entries could only be invented.
            'maxItems' => 1,
            'description' => __(
                "The product's image, replacing any it already has.",
                'extendify-local'
            ),
            'items' => [
                'type' => 'object',
                'properties' => [
                    'id' => [
                        'type' => 'integer',
                        'minimum' => 1,
                        'description' => __(
                            'Media library attachment id. Preferred over src whenever one is available.',
                            'extendify-local'
                        ),
                    ],
                    'src' => [
                        'type' => 'string',
                        'format' => 'uri',
                        'description' => __(
                            'Publicly reachable image url, imported into the media library. Ignored when id is set.',
                            'extendify-local'
                        ),
                    ],
                    'alt' => [
                        'type' => 'string',
                        'description' => __('Alt text for the image.', 'extendify-local'),
                    ],
                ],
            ],
        ];
    }
}
