<?php

/**
 * Discovers WordPress Abilities registered on the site for the Agent.
 */

namespace Extendify\Agent;

use Extendify\PartnerData;

defined('ABSPATH') || die('No direct access.');

/**
 * Reads the Abilities API (WP 6.9+) and shapes the survivors for the Agent,
 * grouped by category so the backend can route to a category before a tool.
 */
class AbilitiesDiscovery
{
    /**
     * Discover the abilities registered on this install.
     *
     * @return array
     */
    public static function discover()
    {
        if (!function_exists('wp_get_abilities')) {
            return [];
        }

        return self::shape(
            wp_get_abilities(),
            wp_get_ability_categories(),
            PartnerData::setting('agentAbilitiesAllowlist')
        );
    }

    /**
     * Keep only REST-exposed abilities, then group their descriptors under the
     * categories that hold at least one.
     *
     * No permission filtering here: an ability's permission_callback often turns
     * on the specific input (e.g. edit_post for a given post id) which discovery
     * doesn't have, so the /run endpoint enforces permission at call time.
     *
     * @param array $abilities WP_Ability objects from wp_get_abilities().
     * @param array $categories WP_Ability_Category objects from wp_get_ability_categories().
     * @param array|null $allowlist Namespace prefixes to keep; null keeps every namespace.
     * @param array|null $glossary English label => our translation; null uses the shipped map.
     * @return array
     */
    public static function shape(array $abilities, array $categories = [], $allowlist = null, $glossary = null)
    {
        $glossary = $glossary ?? self::labelGlossary();
        $allowed = array_filter($abilities, function ($ability) use ($allowlist) {
            if (!$ability->get_meta_item('show_in_rest')) {
                return false;
            }

            if ($allowlist === null) {
                return true;
            }

            return in_array(explode('/', $ability->get_name())[0], $allowlist, true);
        });

        $byCategory = [];
        foreach ($allowed as $ability) {
            $meta = $ability->get_meta();
            $name = $ability->get_name();
            $label = $ability->get_label();
            $schema = $ability->get_input_schema();
            // Filters out unnecessary context
            if (function_exists('wp_prepare_json_schema_for_client')) {
                $schema = wp_prepare_json_schema_for_client($schema);
            }
            $byCategory[$ability->get_category()][] = [
                'name' => $name,
                'label' => $glossary[$label] ?? $label,
                'description' => $ability->get_description(),
                'inputSchema' => $schema,
                'annotations' => $meta['annotations'] ?? null,
                'runHref' => \rest_url('wp-abilities/v1/abilities/' . $name . '/run'),
            ];
        }

        $categoryMeta = [];
        foreach ($categories as $category) {
            $categoryMeta[$category->get_slug()] = [
                'label' => $category->get_label(),
                'description' => $category->get_description(),
            ];
        }

        $result = [];
        foreach ($byCategory as $slug => $abilitiesInCategory) {
            $result[] = [
                'slug' => $slug,
                'label' => $categoryMeta[$slug]['label'] ?? $slug,
                'description' => $categoryMeta[$slug]['description'] ?? '',
                'abilities' => $abilitiesInCategory,
            ];
        }

        return $result;
    }

    /**
     * Our own translations for third-party ability labels, keyed by the exact
     * English string the plugin registers. A polyfill: once the plugin ships its
     * own translation, get_label() returns the localized string, which no longer
     * matches the English key, so upstream wins and this map goes dormant.
     *
     * @return array
     */
    private static function labelGlossary()
    {
        return [
            // translators: WooCommerce AI Agent ability — searches the store's products.
            'Query products' => __('Query products', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — searches the store's orders.
            'Query orders' => __('Query orders', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — creates a product.
            'Create product' => __('Create product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — updates a product.
            'Update product' => __('Update product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — deletes a product.
            'Delete product' => __('Delete product', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — adds a note to an order.
            'Add order note' => __('Add order note', 'extendify-local'),
            // translators: WooCommerce AI Agent ability — changes an order's status.
            'Update order status' => __('Update order status', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — adds a translation language.
            'Add a translation language' => __('Add a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — sets the license key.
            'Set TranslatePress license key' => __('Set TranslatePress license key', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — turns on automatic translation.
            'Enable Automatic Translation' => __('Enable Automatic Translation', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — lists the site's configured languages.
            'List configured languages' => __('List configured languages', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — lists selectable language codes.
            'List available language codes' => __('List available language codes', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — removes a translation language.
            'Remove a translation language' => __('Remove a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — updates a translation language.
            'Update a translation language' => __('Update a translation language', 'extendify-local'),
            // translators: TranslatePress AI Agent ability — sets the site's default language.
            'Set the default language' => __('Set the default language', 'extendify-local'),
            // translators: WPForms AI Agent ability — lists the site's forms.
            'List Forms' => __('List Forms', 'extendify-local'),
            // translators: WPForms AI Agent ability — fetches a form's details.
            'Get Form' => __('Get Form', 'extendify-local'),
            // translators: WPForms AI Agent ability — describes which form fields and settings can be edited.
            'Describe Editing Schema' => __('Describe Editing Schema', 'extendify-local'),
            // translators: WPForms AI Agent ability — creates a form.
            'Create Form' => __('Create Form', 'extendify-local'),
            // translators: WPForms AI Agent ability — updates a form's settings.
            'Update Form Settings' => __('Update Form Settings', 'extendify-local'),
            // translators: WPForms AI Agent ability — adds a field to a form.
            'Add Field' => __('Add Field', 'extendify-local'),
            // translators: WPForms AI Agent ability — updates a form field.
            'Update Field' => __('Update Field', 'extendify-local'),
            // translators: WPForms AI Agent ability — gets a form's entry statistics.
            'Get Form Stats' => __('Get Form Stats', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — gets booking statistics.
            'Get Statistics' => __('Get Statistics', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — counts bookings from the last 30 days.
            'Count Recent Bookings' => __('Count Recent Bookings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates the booking widget's design settings.
            'Update Design Settings' => __('Update Design Settings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the booking widget's design settings.
            'List Design Settings' => __('List Design Settings', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the plugin's setup tasks.
            'List Tasks' => __('List Tasks', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a setup task's status.
            'Update Task Status' => __('Update Task Status', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists service providers (staff).
            'List Providers' => __('List Providers', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a service provider (staff member).
            'Update Service Provider' => __('Update Service Provider', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — updates a bookable service.
            'Update Service' => __('Update Service', 'extendify-local'),
            // translators: SimplyBook AI Agent ability — lists the bookable services.
            'List Services' => __('List Services', 'extendify-local'),
            // translators: Imagify AI Agent ability — optimizes an image in the media library.
            'Optimize media' => __('Optimize media', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets an image's optimization status.
            'Get Media Status' => __('Get Media Status', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the site's image optimization statistics.
            'Get Imagify optimization stats' => __('Get Imagify optimization stats', 'extendify-local'),
            // translators: Imagify AI Agent ability — reports how many images have next-gen formats (WebP/AVIF).
            'Get next-gen coverage' => __('Get next-gen coverage', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the plugin's settings.
            'Get Imagify settings' => __('Get Imagify settings', 'extendify-local'),
            // translators: Imagify AI Agent ability — updates the plugin's settings.
            'Update Imagify settings' => __('Update Imagify settings', 'extendify-local'),
            // translators: Imagify AI Agent ability — gets the Imagify account status and quota.
            'Get Imagify account status' => __('Get Imagify account status', 'extendify-local'),
        ];
    }
}
