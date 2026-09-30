<?php

/**
 * Image uploader class
 */

namespace Extendify\Shared\Services\Import;

defined('ABSPATH') || die('No direct access.');

/**
 * This class responsible for uploading the image.
 */

class ImageUploader
{
    /**
     * The mime types we support !!
     *
     * @var string[]
     */
    protected $mimes = [
        'image/gif' => '.gif',
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/x-png' => '.png',
        'image/jp2' => '.jp2',
        'image/jpx' => '.jp2',
        'image/webp' => '.wbmp',
        'image/avif' => '.avif',
    ];

    /**
     * The images domains we use
     *
     * @var string[] the domain names.
     */
    public static $imagesDomains = [
        'unsplash.com',
        'extendify.com',
    ];

    /**
     * Check whether the url points at one of our image domains.
     *
     * @param string $url The image url to check.
     * @return bool
     */
    public static function isAllowedImageHost($url)
    {
        $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));

        foreach (self::$imagesDomains as $domain) {
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Upload the image and return the attachment information
     * If the attachment is already there, then return the
     * attachment information only.
     *
     * @param string      $image  the image url to upload.
     * @param string|null $author the WordPress post author.
     * @return array|\WP_Error
     */
    public function uploadImage($image, $author = null) // phpcs:ignore Generic.Metrics.CyclomaticComplexity.TooHigh
    {
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $image = preg_replace('/(\?.*?)\?/', '$1&', $image);
        $image = str_replace('%2C', ',', $image);
        // If the attachment has been already uploaded, just return it.
        $attachment = $this->getAttachmentIfExists($image);

        if ($attachment instanceof \WP_Post) {
            return [
                'attachment_id' => $attachment->ID,
                'url' => $attachment->guid,
            ];
        }

        $imageHeadersInformation = wp_remote_retrieve_headers(wp_safe_remote_head($image));

        if (!empty($imageHeadersInformation)) {
            $headers = $imageHeadersInformation->getAll();
            $fileMimeType = $headers['content-type'];
        } else {
            $fileMimeType = wp_get_image_mime($image);
        }

        if (!array_key_exists($fileMimeType, $this->mimes)) {
            return new \WP_Error(2002, 'File type is not allowed.');
        }

        if (!self::isAllowedImageHost($image)) {
            $imageUrl = esc_url_raw($image);
        } else {
            $parsedUrl = wp_parse_url($image);
            parse_str(($parsedUrl['query'] ?? ''), $params);

            if (!isset($params['w'])) {
                $params['w'] = 1280;
            }

            if (isset($params['orientation'])) {
                if ($params['orientation'] === 'portrait') {
                    $params['h'] = 1440;
                    unset($params['w']);
                } elseif (in_array($params['orientation'], ['landscape', 'square'], true) && isset($params['w'])) {
                    $params['w'] = 1440;
                }

                unset($params['orientation']);
            }

            $params['auto'] = 'auto,compress';
            $params['q'] = 70;

            $imageUrl = $parsedUrl['scheme'] . '://'
            . $parsedUrl['host']
            . $parsedUrl['path']
            . '?'
            . http_build_query($params);
        }//end if

        $imageSha = sha1($image);
        $upload = $this->handleImageUpload($imageUrl, $imageSha, $fileMimeType);
        if (is_wp_error($upload)) {
            return $upload;
        }

        $attachmentId = $this->createAttachment($upload, $image, $author);
        if (is_wp_error($attachmentId)) {
            return $attachmentId;
        }

        $upload['attachment_id'] = $attachmentId;
        return $upload;
    }

    /**
     * Handle the image upload process.
     *
     * @param string $imageUrl     The image URL.
     * @param string $imageSha     The image SHA.
     * @param string $fileMimeType The file mime type.
     * @return array|\WP_Error
     */
    protected function handleImageUpload($imageUrl, $imageSha, $fileMimeType)
    {
        $upload = $this->upload($imageUrl, $imageSha, $fileMimeType);

        if ($upload['error']) {
            return new \WP_Error(2003, $upload['error']);
        }

        if (!wp_getimagesize($upload['file'])) {
			      // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
            @unlink($upload['file']);
            $imageUrl = str_replace('avif', 'jpg', $imageUrl);
            $upload = $this->upload($imageUrl, $imageSha, 'image/jpeg');
        }

		    // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
        if (!@filesize($upload['file']) || !wp_getimagesize($upload['file'])) {
			      // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
            @unlink($upload['file']);
            return new \WP_Error(2001, 'File is not a valid image.');
        }

        return $upload;
    }

    /**
     * Create the attachment in WordPress.
     *
     * @param array       $upload The upload information.
     * @param string      $image  The original image URL.
     * @param string|null $author The post author.
     * @return int|\WP_Error
     */
    protected function createAttachment($upload, $image, $author)
    {
        $attachment = [
            'guid' => $upload['url'],
            'post_mime_type' => $upload['type'],
            'post_title' => sha1($image),
            'post_content' => '',
            'post_status' => 'inherit',
            'post_author' => $author,
        ];

        $attachmentId = wp_insert_attachment($attachment, $upload['file']);

        if (is_wp_error($attachmentId) || !$attachmentId) {
            return new \WP_Error(2004, 'There was an error while adding the attachment record in the database.');
        }

        $metadata = wp_generate_attachment_metadata($attachmentId, $upload['file']);
        if (!empty($metadata)) {
            wp_update_attachment_metadata($attachmentId, $metadata);
        }

        update_post_meta($attachmentId, '_extendify_source_url', $image);

        return $attachmentId;
    }

    /**
     * Upload the image and return the uploaded file information.
     *
     * @param string $imageUrl     The image url to upload.
     * @param string $imageSha     The image sha.
     * @param string $fileMimeType The file mime type.
     * @return array {
     *      Information about the newly-uploaded file.
     *
     *      @type string $file Filename of the newly-uploaded file.
     *      @type string $url URL of the uploaded file.
     *      @type string $type File type.
     *      @type string|false $error Error message, if there has been an error.
     * }
     */
    protected function upload($imageUrl, $imageSha, $fileMimeType)
    {
        $response = wp_safe_remote_get($imageUrl);
        $body = trim(wp_remote_retrieve_body($response));
        return wp_upload_bits($imageSha . $this->mimes[$fileMimeType], null, $body);
    }

    /**
     * Check if the image has been already uploaded or not, if yes
     * then return the attachment information.
     *
     * @param string $image the image url we need to check for.
     * @return array|\WP_Post|null
     */
    protected function getAttachmentIfExists($image)
    {
        $postId = attachment_url_to_postid($image);
        if ($postId) {
            return get_post($postId);
        }

        $attachment = get_posts([
            'post_type' => 'attachment',
            'numberposts' => 1,
            's' => sha1($image),
            'post_status' => 'inherit',
            'post_mime_type' => implode(',', array_keys($this->mimes)),
        ]);

        return $attachment ? $attachment[0] : [];
    }
}
