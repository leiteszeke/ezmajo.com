<?php

/**
 * Frontend.
 */

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

/**
 * This class handles frontend concerns for the Agent.
 */
class Frontend
{
    public function __construct()
    {
        $this->loadIntegrations();
    }

    /**
     * Load the integration classes
     *
     * @return void
     */
    protected function loadIntegrations()
    {
        foreach (glob(__DIR__ . '/Integrations/*.php') as $file) {
            $class = 'Extendify\\Agent\\Integrations\\' . basename($file, '.php');

            if (!class_exists($class)) {
                continue;
            }

            new $class();
        }
    }
}
