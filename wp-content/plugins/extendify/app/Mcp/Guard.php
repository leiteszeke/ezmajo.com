<?php

/**
 * What a connection may do, whatever the route it reached says.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

/**
 * Adds refusals on top of a route's own checks, and lifts the option refusal
 * only while a plugin's uninstall routine or an upgrader runs.
 *
 * A refusal throws inside a tool call, where Surface catches it and the model
 * reads why. Outside one it is silent: a throw during shutdown is a fatal
 * error WordPress mails the site owner about.
 */
class Guard
{
    /**
     * @var boolean
     */
    private static $calling = false;

    /**
     * @var boolean
     */
    private static $lifted = false;

    /**
     * @var array
     */
    private static $permitted = [];

    /**
     * @var boolean
     */
    private static $registering = false;

    /**
     * @param callable $call - The call to run.
     * @return mixed
     */
    public static function registering(callable $call)
    {
        self::$registering = true;

        try {
            return $call();
        } finally {
            self::$registering = false;
        }
    }

    /**
     * The named set is the tool's own, so no ability or route can widen it.
     *
     * @param array    $options - The options this one call may write.
     * @param callable $call    - The call to run.
     * @return mixed
     */
    public static function permitting(array $options, callable $call)
    {
        self::$permitted = $options;

        try {
            return $call();
        } finally {
            self::$permitted = [];
        }
    }

    /**
     * Never lifted on a request, so a write deferred to shutdown still lands inside it.
     * Core fires no generic filter before a network option write, so on a multisite those pass.
     *
     * @return void
     */
    public static function mark()
    {
        foreach (self::hooks() as list($hook, $method, $arguments)) {
            \add_filter($hook, [self::class, $method], 10, $arguments);
        }
    }

    /**
     * wp-cron runs every due event in one process, so the events after a job must write freely.
     *
     * @return void
     */
    public static function unmark()
    {
        foreach (self::hooks() as list($hook, $method)) {
            \remove_filter($hook, [self::class, $method], 10);
        }
    }

    /**
     * @return array - Each hook, the method it calls and how many arguments it takes.
     */
    private static function hooks()
    {
        $hooks = [
            ['pre_update_option', 'refuseOption', 3],
            ['add_option', 'refuseOptionChange', 1],
            ['delete_option', 'refuseOptionChange', 1],
            ['pre_uninstall_plugin', 'lift', 1],
            ['delete_plugin', 'hold', 1],
        ];
        foreach (['add', 'update', 'delete'] as $change) {
            $hooks[] = [$change . '_user_metadata', 'refuseRole', 4];
        }

        return $hooks;
    }

    /**
     * @param callable $call - The tool call to run.
     * @return mixed
     */
    public static function during(callable $call)
    {
        self::$calling = true;
        try {
            return $call();
        } finally {
            self::$calling = false;
            self::$lifted = false;
        }
    }

    /**
     * switch_theme(), default_role and users_can_register all arrive here as option writes.
     *
     * @param mixed  $value    - The value being written.
     * @param string $option   - The option being written.
     * @param mixed  $oldValue - The value it holds now.
     * @return mixed
     */
    public static function refuseOption($value, $option, $oldValue)
    {
        if (self::exempt($option) || self::$lifted) {
            return $value;
        }

        if (!self::$calling) {
            return $oldValue;
        }

        throw new Refused(\esc_html(self::optionMessage($option)));
    }

    /**
     * An action cannot answer for the write, so add_option() and delete_option() are held only during a call.
     *
     * @param string $option - The option being added or deleted.
     * @return void
     */
    public static function refuseOptionChange($option)
    {
        if (self::exempt($option) || self::$lifted || !self::$calling) {
            return;
        }

        throw new Refused(\esc_html(self::optionMessage($option)));
    }

    /**
     * A role is a usermeta row, so switching one is not an option write.
     *
     * @param mixed   $check  - Null until a filter answers for the write.
     * @param integer $userId - The user whose meta is being written.
     * @param string  $key    - The meta key.
     * @param mixed   $value  - The capabilities being written.
     * @return mixed
     */
    public static function refuseRole($check, $userId, $key, $value)
    {
        if (!preg_match(self::capabilitiesKey(), $key) || self::allowedRole($userId, $key, $value)) {
            return $check;
        }

        if (!self::$calling) {
            return false;
        }

        throw new Refused('Changing a user role is not something a connection may do.');
    }

    /**
     * Refusing an uninstall routine's or an upgrader's own option writes would abort it half-run.
     * Role writes stay refused throughout.
     *
     * @return void
     */
    public static function lift()
    {
        self::$lifted = self::$calling;
    }

    /**
     * @return void
     */
    public static function hold()
    {
        self::$lifted = false;
    }

    /**
     * Refusing every first role would stop an ability registering a customer or an author.
     *
     * @param integer $userId - The user whose meta is being written.
     * @param string  $key    - The capabilities meta key.
     * @param mixed   $value  - The capabilities being written.
     * @return boolean
     */
    private static function allowedRole($userId, $key, $value)
    {
        $roles = array_keys(array_filter((array) $value));
        // Inserting an account writes its capabilities more than once, and one of those writes is empty.
        if (self::$registering) {
            return self::below($roles);
        }

        return \get_user_meta($userId, $key, true) === '' && $roles !== [] && self::below($roles);
    }

    /**
     * @param array $roles - The roles a capabilities write names.
     * @return boolean - Whether each one exists and manages nothing.
     */
    private static function below(array $roles)
    {
        foreach ($roles as $role) {
            $granted = \get_role($role);
            if (!$granted || $granted->has_cap('manage_options')) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param string $option - The option being written.
     * @return boolean
     */
    private static function exempt($option)
    {
        // Core's transients and WPForms' own copy of them are cache entries, which escalate nothing.
        foreach (['_transient_', '_site_transient_', '_wpforms_transient_'] as $cache) {
            if (strpos($option, $cache) === 0) {
                return true;
            }
        }

        // A tool that writes settings names them for the duration of its own call.
        if (in_array($option, self::$permitted, true)) {
            return true;
        }

        // Core writes these as it registers a user, publishes a post or renders a calendar,
        // and WPForms as it saves a form, or its abilities abort with the form half-written.
        $caches = [
            'user_count',
            'fresh_site',
            'wp_calendar_block_has_published_posts',
            'wpforms_dashboard_cache_generation',
            'wpforms_forms_first_created',
        ];
        if (in_array($option, $caches, true)) {
            return true;
        }

        // set_auto_updates writes these, and an update schedule grants nothing either.
        if (in_array($option, ['auto_update_plugins', 'auto_update_themes'], true)) {
            return true;
        }

        // Jobs::start() schedules here, and a cron event runs only code the site already hooks.
        if ($option === 'cron') {
            return true;
        }

        // A term write rebuilds this cache, and a term cache escalates nothing.
        return substr($option, -9) === '_children' && \is_taxonomy_hierarchical(substr($option, 0, -9));
    }

    /**
     * @param string $option - The option refused.
     * @return string
     */
    private static function optionMessage($option)
    {
        return sprintf('Changing the %s option is not something a connection may do.', $option);
    }

    /**
     * A network keeps one capabilities row per site, prefixed with that site's id.
     *
     * @return string
     */
    private static function capabilitiesKey()
    {
        return '/^' . preg_quote($GLOBALS['wpdb']->base_prefix, '/') . '(\d+_)?capabilities$/';
    }
}
