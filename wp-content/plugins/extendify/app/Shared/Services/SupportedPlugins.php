<?php

/**
 * Central registry of supported plugin slugs.
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Central registry of all plugins.
 */
class SupportedPlugins
{
    /**
     * All supported plugin slugs.
     *
     * @var string[]
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const SLUGS = [
        'all-in-one-seo-pack',
        'backup',
        'bookly-responsive-appointment-booking-tool',
        'charitable',
        'chatbot',
        'complianz-gdpr',
        'complianz-terms-conditions',
        'contact-form-7',
        'docket-cache',
        'ecwid-shopping-cart',
        'ewww-image-optimizer',
        'give',
        'google-analytics-for-wordpress',
        'imagify',
        'iubenda-cookie-law-solution',
        'loginpress',
        'mailin',
        'mijndomein-seo-toolkit',
        'mollie-payments-for-woocommerce',
        'montonio-for-woocommerce',
        'really-simple-ssl',
        'rocket-lazy-load',
        'seo-by-rank-math',
        'simplybook',
        'smaily-connect',
        'sucuri-scanner',
        'sugar-calendar-lite',
        'the-events-calendar',
        'translatepress-multilingual',
        'woocommerce',
        'woocommerce-correios',
        'woocommerce-germanized',
        'woocommerce-mercadopago',
        'wordpress-seo',
        'wp-mail-smtp',
        'wp-rocket',
        'wp-whatsapp',
        'wpforms-lite',
        'yith-woocommerce-ajax-navigation',
        'yith-woocommerce-ajax-search',
        'yith-woocommerce-wishlist',
        'YourWebshop-updater',
    ];
}
