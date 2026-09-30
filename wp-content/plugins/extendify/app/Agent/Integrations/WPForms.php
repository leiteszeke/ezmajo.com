<?php

/**
 * WPForms Integration.
 */

namespace Extendify\Agent\Integrations;

defined('ABSPATH') || die('No direct access.');

/**
 * Handles integration with the WPForms plugin.
 */
class WPForms
{
    public function __construct()
    {
        // The Agent only loads for admins; their request is the AI-writes opt-in.
        \add_filter('wpforms_integrations_abilities_allow_write', '__return_true');
    }
}
