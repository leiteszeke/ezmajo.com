<?php

/**
 * Create WPForm programmatically.
 */

namespace Extendify\Shared\Services\PluginDependencies\Forms;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\PluginDependencies\PluginInstaller;

/**
 * Create WPForm programmatically.
 */

class WPForms
{
    /**
     * The plugin slug.
     *
     * @var string
     */
    public static $slug = 'wpforms-lite/wpforms.php';

    /**
     * Replace the placeholder for WP Forms.
     *
     * @param mixed  $code     - The code data.
     * @param string $template - The form template.
     * @param string $newCode  - The plugin pattern code.
     * @return mixed
     */
    public static function create($code, $template, $newCode)
    {
        // Currently we only support the simple template.
        if ($template !== 'simple' || !preg_match('/wp:wpforms/m', $newCode)) {
            return $code;
        }

        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        // If the plugin is already installed and active, we don't need to install it again.
        if (!is_plugin_active(self::$slug)) {
            $response = PluginInstaller::installPlugin('wpforms-lite', self::$slug);
            if (is_wp_error($response)) {
                return $response;
            }
        }

        $wpFormSettings = get_option('wpforms_settings', []);
        if (!array_key_exists('disable-css', $wpFormSettings)) {
            $wpFormSettings['disable-css'] = 2;
            update_option('wpforms_settings', $wpFormSettings);
        }

        $formId = self::getOrCreateForm(
            'simple-contact-form-template',
            __('Simple Contact Form', 'extendify-local')
        );

        // If we didn't get the form, send back an error to retry.
        if (!$formId) {
            return new \WP_Error('form_error', 'Could not create wpforms form');
        }

        // Replace {"formId": "1234"} with the actual form ID.
        return preg_replace('/("formId":)(\s*)"\d+"/', '${1}"' . $formId . '"', $newCode);
    }


    /**
     * Retrieve or create a WPForms
     *
     * @param string $template - The form template.
     * @param string $title    - The form title.
     * @return mixed
     */
    public static function getOrCreateForm($template, $title)
    {
        if (!function_exists('wpforms') || !\wpforms()->get('form')) {
            return false;
        }

        // Get all the forms, which is an array of WP_Post objects.
        $forms = \wpforms()->get('form')->get();
        // If we already made the same form, return the ID.
        foreach ($forms as $post) {
            $postMeta = get_post_meta($post->ID, 'extendify_form_type', true);

            if ($postMeta === $template) {
                return $post->ID;
            }
        }

        $formId = \wpforms()->get('form')->add($title, [], ['template' => $template]);
        if (!$formId) {
            return false;
        }

        $formPost = \wpforms()->get('form')->get($formId);
        // We have to manually add the form id into the form data.
        $formContent = \wpforms_decode($formPost->post_content);
        $fields = self::getFormFields($template);
        $newFields = [
            'id' => $formId,
            'fields' => $fields,
        ];
        \wpforms()->get('form')->update($formId, array_merge($formContent, $newFields));
        // Keep track of the form in case we need to reuse it later.
        \add_post_meta($formId, 'extendify_form_type', $template);
        return $formId;
    }

    /**
     * Retrieve or create a WPForms
     *
     * @param string $template - The form template.
     * @return object
     */
    public static function getFormFields($template)
    {
        if ($template !== 'simple-contact-form-template') {
            return [];
        }

        return [
            1 => [
                'id' => '1',
                'type' => 'name',
                'format' => 'simple',
                'label' => __('Name', 'extendify-local'),
                'required' => '1',
                'size' => 'large',
            ],
            2 => [
                'id' => '2',
                'type' => 'email',
                'label' => __('Email', 'extendify-local'),
                'required' => '1',
                'size' => 'large',
            ],
            3 => [
                'id' => '3',
                'type' => 'text',
                'label' => __('Subject', 'extendify-local'),
                'size' => 'large',
            ],
            4 => [
                'id' => '4',
                'type' => 'textarea',
                'label' => __('Message', 'extendify-local'),
                'required' => '1',
                'size' => 'large',
            ],
        ];
    }
}
