<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

// A ref nav's links live in a wp_navigation post, saved by WPNavigationController.
class NavigationLink implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'label',
                'control' => 'text',
                'label'   => __('Label', 'extendify-local'),
            ],
            [
                'key'     => 'url',
                'control' => 'link',
                'label'   => __('Destination', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        $attrs = $block['attrs'] ?? [];
        switch ($fieldKey) {
            case 'label':
                $label = is_string($value) ? wp_strip_all_tags($value) : '';
                $attrs['label'] = $label;
                break;
            case 'url':
                $url = is_string($value) ? esc_url_raw($value) : '';
                if ($url === '') {
                    unset($attrs['url']);
                } else {
                    $attrs['url'] = $url;
                }
                break;
            default:
                return $block;
        }
        $block['attrs'] = $attrs;
        return $block;
    }
}
