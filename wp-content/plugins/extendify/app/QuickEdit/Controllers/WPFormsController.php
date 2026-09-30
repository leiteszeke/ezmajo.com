<?php

namespace Extendify\QuickEdit\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// WPForms stores forms as a wpforms CPT with JSON-encoded post_content.
// Save is shallow-merged so we don't drop WPForms-internal keys (choices,
// conditional logic, validation) we don't surface.
class WPFormsController
{
    public static function init()
    {
        add_action('rest_api_init', [self::class, 'registerRoutes']);
    }

    public static function registerRoutes()
    {
        register_rest_route('extendify/v1', '/quick-edit/wpforms', [
            [
                'methods'             => 'GET',
                'permission_callback' => [self::class, 'permissionCallback'],
                'callback'            => [self::class, 'handleGet'],
            ],
            [
                'methods'             => 'POST',
                'permission_callback' => [self::class, 'permissionCallback'],
                'callback'            => [self::class, 'handlePost'],
            ],
        ]);
    }

    public static function permissionCallback(): bool
    {
        return current_user_can(Config::$requiredCapability);
    }

    public static function handleGet(\WP_REST_Request $req)
    {
        $formId = (int) $req->get_param('form_id');
        $fieldId = (int) $req->get_param('field_id');
        if ($formId <= 0 || $fieldId <= 0) {
            return new \WP_REST_Response(['error' => 'form_id + field_id required'], 400);
        }

        $form = self::loadForm($formId);
        if (is_wp_error($form)) {
            return new \WP_REST_Response(['error' => $form->get_error_message()], 404);
        }

        $fields = is_array($form['fields'] ?? null) ? $form['fields'] : [];
        $field = $fields[$fieldId] ?? null;
        if (!$field) {
            return new \WP_REST_Response(['error' => 'field not found'], 404);
        }

        return new \WP_REST_Response([
            'id'          => (int) ($field['id'] ?? $fieldId),
            'type'        => (string) ($field['type'] ?? ''),
            'label'       => (string) ($field['label'] ?? ''),
            'placeholder' => (string) ($field['placeholder'] ?? ''),
            'required'    => self::truthy($field['required'] ?? false),
            'description' => (string) ($field['description'] ?? ''),
        ]);
    }

    public static function handlePost(\WP_REST_Request $req)
    {
        $body = $req->get_json_params() ?: [];
        $formId  = (int) ($body['form_id'] ?? 0);
        $fieldId = (int) ($body['field_id'] ?? 0);
        $changes = is_array($body['changes'] ?? null) ? $body['changes'] : [];
        if ($formId <= 0 || $fieldId <= 0 || !$changes) {
            return new \WP_REST_Response(
                ['error' => 'form_id, field_id, changes required'],
                400
            );
        }

        $form = self::loadForm($formId);
        if (is_wp_error($form)) {
            return new \WP_REST_Response(['error' => $form->get_error_message()], 404);
        }

        $fields = is_array($form['fields'] ?? null) ? $form['fields'] : [];
        if (!isset($fields[$fieldId])) {
            return new \WP_REST_Response(['error' => 'field not found'], 404);
        }

        $field = $fields[$fieldId];

        // Whitelisted fields only; anything else in `changes` is dropped silently.
        if (array_key_exists('label', $changes)) {
            $field['label'] = sanitize_text_field((string) $changes['label']);
        }
        if (array_key_exists('placeholder', $changes)) {
            $field['placeholder'] = sanitize_text_field((string) $changes['placeholder']);
        }
        if (array_key_exists('description', $changes)) {
            $field['description'] = wp_kses_post((string) $changes['description']);
        }
        if (array_key_exists('required', $changes)) {
            // WPForms stores `required` as "1"/"" historically and as bool
            // in newer versions; preserve the existing shape.
            $existing = $field['required'] ?? null;
            $next = self::truthy($changes['required']);
            if (is_bool($existing)) {
                $field['required'] = $next;
            } else {
                $field['required'] = $next ? '1' : '';
            }
        }

        $fields[$fieldId] = $field;
        $form['fields'] = $fields;

        // wpforms wp_unslashes on load; wp_update_post expects slashed input.
        $newContent = wp_json_encode($form);
        if ($newContent === false) {
            return new \WP_REST_Response(['error' => 'failed to encode form'], 500);
        }

        $update = wp_update_post([
            'ID'           => $formId,
            'post_content' => wp_slash($newContent),
        ], true);
        if (is_wp_error($update)) {
            return new \WP_REST_Response(['error' => $update->get_error_message()], 500);
        }

        return new \WP_REST_Response(['ok' => true]);
    }

    /**
     * @return array|\WP_Error
     */
    private static function loadForm(int $formId)
    {
        $post = get_post($formId);
        if (!$post || $post->post_type !== 'wpforms') {
            return new \WP_Error('not_found', 'wpforms form not found');
        }
        $raw = (string) $post->post_content;
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return new \WP_Error('bad_form', 'wpforms form content is not valid JSON');
        }
        return $decoded;
    }

    private static function truthy($v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        if (is_int($v) || is_float($v)) {
            return $v != 0;
        }
        if (is_string($v)) {
            $v = strtolower(trim($v));
            return $v === '1' || $v === 'true' || $v === 'yes' || $v === 'on';
        }
        return (bool) $v;
    }
}
