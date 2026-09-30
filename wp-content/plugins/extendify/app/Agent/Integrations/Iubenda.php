<?php

/**
 * iubenda Integration.
 */

namespace Extendify\Agent\Integrations;

defined('ABSPATH') || die('No direct access.');

/**
 * Handles integration with the iubenda plugin.
 */
class Iubenda
{
    /**
     * The Iubenda plugin slug.
     *
     * @var string
     */
    public static $slug = 'iubenda-cookie-law-solution/iubenda_cookie_solution.php';

    public function __construct()
    {
        if (!self::isActive()) {
            return;
        }

        \add_action('wp_print_footer_scripts', [$this, 'fixButtonZIndexScript']);
    }

    /**
     * Add a JS script to fix the z-index position of the .iubenda-tp-btn element.
     *
     * @return void
     */
    public function fixButtonZIndexScript()
    {
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const buttonSelector = '.iubenda-tp-btn';

                function applyToButton(button) {
                    button.style.zIndex = 99999; // same value as z-high class
                }

                const existing = document.querySelector(buttonSelector);
                if (existing) {
                    applyToButton(existing);
                    return;
                }

                const observer = new MutationObserver(function(mutations) {
                    const button = document.querySelector(buttonSelector);
                    if (button) {
                        applyToButton(button);
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        </script>
        <?php
    }

    /**
     * Check whether the iubenda plugin is active.
     *
     * @return bool
     */
    public static function isActive()
    {
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        return \is_plugin_active(self::$slug);
    }
}
