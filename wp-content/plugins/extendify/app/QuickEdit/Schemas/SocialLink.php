<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

class SocialLink implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'url',
                'control' => 'link',
                'label'   => __('Link URL', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        if ($fieldKey !== 'url') {
            return $block;
        }
        $url = is_string($value) ? esc_url_raw($value) : '';
        $attrs = $block['attrs'] ?? [];
        if ($url === '') {
            unset($attrs['url']);
        } else {
            $attrs['url'] = $url;
        }
        $block['attrs'] = $attrs;
        return $block;
    }
}
