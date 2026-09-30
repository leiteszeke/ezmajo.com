<?php

namespace Extendify\Agent\Controllers;

defined('ABSPATH') || die('No direct access.');

class OptionsController
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const MAX_MATCHES = 25;

    const MAX_VALUE_BYTES = 8000;

    const MAX_BYTES = 20000;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function handle(\WP_REST_Request $request)
    {
        $params = $request->get_json_params();
        $params = is_array($params) ? $params : [];
        $search = self::text($params, 'search');

        $names = self::requested($params);
        if ($search !== '') {
            $names = array_merge($names, self::matching($search));
        }
        $names = array_values(array_unique($names));

        if (!$names && $search === '') {
            return new \WP_REST_Response(
                ['error' => 'name, names or search must say what to read'],
                400
            );
        }

        if (!$names) {
            return new \WP_REST_Response(['options' => [], 'searched' => $search]);
        }

        return new \WP_REST_Response(self::read($names));
    }

    /**
     * @param array  $params  The array to read from.
     * @param string $key     The key to read.
     * @param string $default What to use when the key is absent.
     * @return string
     */
    private static function text($params, $key, $default = '')
    {
        return isset($params[$key]) && is_string($params[$key]) ? $params[$key] : $default;
    }

    /**
     * @param array $params The request body.
     * @return array The option names the caller spelled out.
     */
    private static function requested($params)
    {
        $names = is_array($params['names'] ?? null) ? $params['names'] : [];
        array_unshift($names, self::text($params, 'name'));

        return array_values(array_filter($names, function ($name) {
            return is_string($name) && $name !== '';
        }));
    }

    /**
     * A search for where a setting lives would otherwise fill up with cache entries.
     *
     * @param string $search Part of an option name.
     * @return array The option names holding it.
     */
    private static function matching($search)
    {
        global $wpdb;

        return $wpdb->get_col($wpdb->prepare(
            "SELECT option_name FROM {$wpdb->options}
                WHERE option_name LIKE %s
                    AND option_name NOT LIKE %s
                    AND option_name NOT LIKE %s
                ORDER BY option_name
                LIMIT %d",
            '%' . $wpdb->esc_like($search) . '%',
            $wpdb->esc_like('_transient_') . '%',
            $wpdb->esc_like('_site_transient_') . '%',
            self::MAX_MATCHES
        ));
    }

    /**
     * @param array $names The option names to read.
     * @return array The response body.
     */
    private static function read($names)
    {
        $options = [];
        $spent = 0;
        foreach ($names as $name) {
            $option = self::option($name);
            $spent += self::bytes($option);
            if ($spent > self::MAX_BYTES && $options) {
                return [
                    'options' => $options,
                    'truncated' => (count($names) - count($options)) . ' more options were not returned.',
                ];
            }
            $options[] = $option;
        }

        return ['options' => $options];
    }

    /**
     * Escaped JSON counts one Japanese character as six, shrinking every cap to a sixth.
     *
     * @param mixed $value Anything the response can carry.
     * @return integer The bytes it takes as UTF-8.
     */
    private static function bytes($value)
    {
        return strlen((string) wp_json_encode($value, JSON_UNESCAPED_UNICODE));
    }

    /**
     * @param string $name An option name.
     * @return array The value, a cut of it, or the reason for neither.
     */
    private static function option($name)
    {
        $value = \get_option($name, null);
        if ($value === null) {
            return ['name' => $name, 'error' => "Nothing is stored under {$name}"];
        }

        $size = is_string($value) ? strlen($value) : self::bytes($value);
        if ($size <= self::MAX_VALUE_BYTES) {
            return ['name' => $name, 'value' => $value];
        }

        if (!is_string($value)) {
            return ['name' => $name, 'error' => "{$name} holds {$size} bytes, too much to return"];
        }

        return [
            'name' => $name,
            'value' => self::cut($value, self::MAX_VALUE_BYTES),
            'truncated' => 'Cut after ' . self::MAX_VALUE_BYTES . ' bytes, of ' . $size . ' the option holds.',
        ];
    }

    /**
     * Cut at a byte cap without splitting a multibyte character.
     *
     * @param string  $value The string to cut.
     * @param integer $bytes The cap.
     * @return string
     */
    private static function cut($value, $bytes)
    {
        // A UTF-8 lead byte the cap separated from its continuation bytes.
        return (string) preg_replace(
            '/(?:[\xC2-\xDF]|[\xE0-\xEF][\x80-\xBF]?|[\xF0-\xF4][\x80-\xBF]{0,2})$/D',
            '',
            substr($value, 0, $bytes)
        );
    }
}
