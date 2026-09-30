<?php

/**
 * The Sanitizer class
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Class for escaping various data attributes.
 */

class Escaper
{
    /**
     * This function will escape the attribute of a multidimensional array.
     *
     * @param array $array - The array we need to escape.
     * @return array
     */
    public static function recursiveEscAttr($array): array
    {
        if (!is_array($array)) {
            return (array) esc_attr($array);
        }

        return array_map(static function ($value) {
            if (is_array($value)) {
                return self::recursiveEscAttr($value);
            }

            return esc_attr($value);
        }, $array);
    }
}
