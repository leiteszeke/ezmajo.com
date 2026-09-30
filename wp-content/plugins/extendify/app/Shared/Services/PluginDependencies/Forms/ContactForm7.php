<?php

/**
 * Create Contact Form 7 programmatically.
 */

namespace Extendify\Shared\Services\PluginDependencies\Forms;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\PluginDependencies\PluginInstaller;

/**
 * Create Contact Form 7 programmatically.
 */

class ContactForm7
{
    /**
     * The plugin slug.
     *
     * @var string
     */
    public static $slug = 'contact-form-7/wp-contact-form-7.php';

    /**
     * Replace the placeholder for Contact Form 7.
     *
     * @param mixed  $code     - The code data.
     * @param string $template - The form template.
     * @param string $newCode  - The plugin pattern code.
     * @return mixed
     */
    public static function create($code, $template, $newCode)
    {
        // Currently we only support the simple template.
        if ($template !== 'simple' || !preg_match('/-- wp:contact-form-7/m', $newCode)) {
            return $code;
        }

        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        // If the plugin is already installed and active, we don't need to install it again.
        if (!is_plugin_active(self::$slug)) {
            $response = PluginInstaller::installPlugin('contact-form-7', self::$slug);
            if (is_wp_error($response)) {
                return $response;
            }
        }

        $formId = self::getOrCreateForm(
            'simple-contact-form',
            __('Simple Contact Form', 'extendify-local')
        );

        // If we didn't get the form, send back an error to retry.
        if (!$formId) {
            return new \WP_Error('form_error', 'Could not create form');
        }

        $hash = substr(get_post_meta($formId, '_hash', true), 0, 7);
        // Update the id.
        $updatedContent = preg_replace('/"id":(\d+)/', '"id":' . $formId, $newCode);
        // Update the hash.
        $updatedContent = preg_replace('/"hash":"[a-f0-9]+"/', '"hash":"' . $hash . '"', $updatedContent);
        // Update the id in the shortcode (which uses the hash value).
        $updatedContent = preg_replace(
            '/\[contact-form-7 id="[a-f0-9]+"/',
            '[contact-form-7 id="' . $hash . '"',
            $updatedContent
        );

        return $updatedContent;
    }

    /**
     * Retrieve or create a Contact Form 7
     *
     * @param string $template - The form template.
     * @param string $title    - The form title.
     *
     * @return mixed
     */
    private static function getOrCreateForm($template, $title)
    {
        $query = new \WP_Query([
            'post_type' => 'wpcf7_contact_form',
            'post_status' => 'publish',
        ]);

        // If we already made the same form, return the ID.
        foreach ($query->posts as $post) {
            $postMeta = get_post_meta($post->ID, 'extendify_form_type', true);

            if ($postMeta === $template) {
                return $post->ID;
            }
        }

        $form = \wpcf7_save_contact_form(['title' => $title]);
        if (!$form) {
            return false;
        }

        add_post_meta($form->id(), 'extendify_form_type', $template);
        return $form->id();
    }
}
