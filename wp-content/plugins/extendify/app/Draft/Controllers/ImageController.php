<?php

/**
 * Image Controller
 */

namespace Extendify\Draft\Controllers;

defined('ABSPATH') || die('No direct access.');

// Try to execute set the limit to something that will work for 60s duration.
// phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
if (strpos(@ini_get('disable_functions'), 'set_time_limit') === false) {
    // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
    @set_time_limit(60);
}

use Extendify\Shared\Services\Sanitizer;

/**
 * The controller for uploading images to the Media Library.
 */

class ImageController
{
    /**
     * Must match `PILL_RIGHT_EDGE` in `src/Shared/lib/ai-label.js`.
     *
     * @var float
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const PILL_RIGHT_EDGE = 0.85;

    /**
     * Upload the provided image
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function uploadMedia(\WP_REST_Request $request)
    {
        if (! function_exists('\media_sideload_image')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        $imageId = \media_sideload_image($request->get_param('source'), 0, null, 'id');

        // Without this the caller can't tell a failed upload from a declined one.
        if (\is_wp_error($imageId)) {
            return new \WP_REST_Response(['message' => $imageId->get_error_message()], 500);
        }

        if ($request->get_param('ai_generated')) {
            update_post_meta($imageId, 'extendify_ai_generated', true);
            $label = $request->get_file_params()['disclosure_label'] ?? null;
            if (isset($label['tmp_name'])) {
                self::stampImage($imageId, $label['tmp_name']);
            }
        }

        if ($request->get_param('alt_text')) {
            update_post_meta(
                $imageId,
                '_wp_attachment_image_alt',
                Sanitizer::sanitizeText($request->get_param('alt_text'))
            );
        }

        if ($request->get_param('caption')) {
            wp_update_post(
                Sanitizer::sanitizeArray([
                    'ID'           => $imageId,
                    'post_excerpt' => $request->get_param('caption'),
                ])
            );
        }

        $imageObject = \get_post($imageId);
        $altText = (get_post_meta($imageId, '_wp_attachment_image_alt', true))
            ? get_post_meta($imageId, '_wp_attachment_image_alt', true)
            : '';

        return new \WP_REST_Response(
            [
                'id'         => $imageId,
                'caption'    => ['raw' => $imageObject->post_excerpt],
                'source_url' => wp_get_attachment_url($imageId),
                'alt_text'   => $altText,
            ]
        );
    }

    /**
     * Composite the client-rendered disclosure label onto the attachment. The
     * PNG already includes its border, unlike the canvas path's fill box.
     *
     * @param int    $imageId - The attachment ID.
     * @param string $labelPath - Path to the uploaded label PNG.
     * @return void
     */
    private static function stampImage($imageId, $labelPath)
    {
        $file = \get_attached_file($imageId);
        $type = $file ? (\wp_check_filetype($file)['type'] ?? null) : null;
        $loaders = [
            'image/jpeg' => 'imagecreatefromjpeg',
            'image/png'  => 'imagecreatefrompng',
            'image/webp' => 'imagecreatefromwebp',
        ];
        if (!isset($loaders[$type]) || !function_exists($loaders[$type]) || !is_file($file)) {
            return;
        }

        // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
        $image = @call_user_func($loaders[$type], $file);
        // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
        $label = @imagecreatefrompng($labelPath);
        if (!$image || !$label) {
            return;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        // The client renders the label at a 48px font; the canvas stamp uses 2% of the shorter side.
        $scale = max(12, round(min($width, $height) * 0.02)) / 48;
        $labelWidth = (int) round(imagesx($label) * $scale);
        $labelHeight = (int) round(imagesy($label) * $scale);
        imagealphablending($image, true);
        imagecopyresampled(
            $image,
            $label,
            (int) round(($width * self::PILL_RIGHT_EDGE) - $labelWidth),
            (int) round(($height - $labelHeight) / 2),
            0,
            0,
            $labelWidth,
            $labelHeight,
            imagesx($label),
            imagesy($label)
        );

        if ($type === 'image/jpeg') {
            imagejpeg($image, $file, 90);
        }

        if ($type === 'image/png') {
            imagesavealpha($image, true);
            imagepng($image, $file);
        }

        if ($type === 'image/webp') {
            imagewebp($image, $file, 90);
        }

        // Sub-sizes were generated from the unstamped original; rebuild them.
        $metadata = \wp_generate_attachment_metadata($imageId, $file);
        \wp_update_attachment_metadata($imageId, $metadata);
    }
}
