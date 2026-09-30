<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

class Registry
{
    /**
     * @var array<string, Schema> blockName => Schema instance
     */
    private static $schemas = [];

    public static function register(string $blockName, Schema $schema)
    {
        self::$schemas[$blockName] = $schema;
    }

    public static function get(string $blockName)
    {
        return self::$schemas[$blockName] ?? null;
    }

    public static function init()
    {
        self::register('core/paragraph', new Paragraph());
        self::register('core/heading', new Heading());
        self::register('core/image', new Image());
        self::register('core/button', new Button());
        self::register('core/cover', new Cover());
        self::register('core/media-text', new MediaText());
        self::register('core/social-link', new SocialLink());
        self::register('core/navigation-link', new NavigationLink());
        self::register('core/navigation-submenu', new NavigationLink());
    }

    public static function describe(): array
    {
        $out = [];
        foreach (self::$schemas as $name => $schema) {
            $out[$name] = [
                'blockName' => $name,
                'fields'    => $schema->fields(),
            ];
        }
        return $out;
    }
}
