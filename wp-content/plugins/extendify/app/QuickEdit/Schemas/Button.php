<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

class Button implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'text',
                'control' => 'text',
                'label'   => __('Button text', 'extendify-local'),
            ],
            [
                'key'     => 'url',
                'control' => 'link',
                'label'   => __('Link URL', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        $existing = (string) ($block['innerHTML'] ?? '');

        switch ($fieldKey) {
            case 'text':
                $text = is_string($value) ? $value : '';
                $escaped = wp_kses_post($text);
                // Replace inner text while preserving the anchor's attributes.
                // Callback (not a replacement string) so user text containing
                // $1 / \1 / $0 is spliced literally, not parsed as a backref.
                $newInner = preg_replace_callback(
                    '/(<a\b[^>]*>)(.*?)(<\/a>)/is',
                    static function ($m) use ($escaped) {
                        return $m[1] . $escaped . $m[3];
                    },
                    $existing,
                    1
                );
                $block['innerHTML']    = $newInner ?: $existing;
                $block['innerContent'] = [$block['innerHTML']];
                return $block;

            case 'url':
                $url = is_string($value) ? esc_url_raw($value) : '';
                $tp = new \WP_HTML_Tag_Processor($existing);
                if ($tp->next_tag('a')) {
                    if ($url === '') {
                        $tp->remove_attribute('href');
                    } else {
                        $tp->set_attribute('href', $url);
                    }
                    $existing = $tp->get_updated_html();
                }
                $block['innerHTML']    = $existing;
                $block['innerContent'] = [$existing];
                // The canonical link target is the inner anchor's href, not a block attribute.
                return $block;
        }
        return $block;
    }
}
