<?php

/**
 * The Sanitizer class
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Class for sanitizing various data types.
 */

class Sanitizer
{
    /**
     * This function will sanitize a value.
     *
     * @param mixed $data - The data we need to sanitize.
     * @return array|string
     */
    public static function sanitizeUnknown($data)
    {
        return is_array($data) ? self::sanitizeArray($data) : self::sanitizeText($data);
    }
    /**
     * This function will sanitize a multidimensional array,
     * if the value is number it will be returned as is.
     *
     * @param array $array - The array we need to sanitize.
     * @return array
     */
    public static function sanitizeArray($array)
    {
        return array_map(function ($value) {
            if (is_array($value)) {
                return self::sanitizeArray($value);
            } elseif (is_int($value) || is_float($value)) {
                return $value;
            } else {
                return \sanitize_textarea_field($value);
            }
        }, $array);
    }

    /**
     * This function will sanitize the user selections.
     *
     * @param array $array - The array we need to sanitize.
     * @return array
     */
    public static function sanitizeUserSelections($array)
    {
        return array_map(function ($value) {
            if (is_array($value)) {
                return self::sanitizeUserSelections($value);
            }

            if (is_int($value) || is_float($value)) {
                return $value;
            }

            return self::sanitizePostContent($value);
        }, $array);
    }

    /**
     * This function will sanitize a text field.
     *
     * @param string $text - The string we need to sanitize.
     * @return string
     */
    public static function sanitizeText($text)
    {
        return \sanitize_text_field($text);
    }

    /**
     * This function will sanitize a text field that may contain
     * the <strong>, <em> and <del> HTML tags, allowing the tags in
     * the final result.
     *
     * @param string $text - The string we need to sanitize.
     * @return string
     */
    public static function sanitizeTextWithFormattingTags($text)
    {
        $allowedTags = [
            'strong'  => [],
            'em'      => [],
            'del'     => [],
        ];

        return \wp_kses($text, $allowedTags);
    }

    /**
     * This function will sanitize a textarea field.
     *
     * @param string $text - The strings we need to sanitize.
     * @return string
     */
    public static function sanitizeTextarea($text)
    {
        return \sanitize_textarea_field($text);
    }

    /**
     * This function will sanitize a gutenberg block.
     *
     * @param string $blockString - The strings we need to sanitize.
     * @return string
     */
    public static function sanitizeBlocks($blockString)
    {
        $parsed = parse_blocks($blockString);
        return \serialize_blocks($parsed);
    }

    /**
     * This function will sanitize the post content.
     *
     * @param string $content - The post content we need to sanitize.
     * @return string
     */
    public static function sanitizePostContent($content)
    {
        return \wp_kses_post($content ? $content : '');
    }
}
