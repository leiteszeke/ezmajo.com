<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

class Paragraph implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'content',
                'control' => 'text',
                'label'   => __('Text', 'extendify-local'),
            ],
            [
                'key'     => 'align',
                'control' => 'alignment',
                'label'   => __('Alignment', 'extendify-local'),
                'options' => [
                    ['value' => 'left',   'label' => __('Left', 'extendify-local')],
                    ['value' => 'center', 'label' => __('Center', 'extendify-local')],
                    ['value' => 'right',  'label' => __('Right', 'extendify-local')],
                ],
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        switch ($fieldKey) {
            case 'content':
                // Rewrite the inner <p> rather than replacing innerHTML wholesale,
                // so user-set attributes (style, class, etc.) survive.
                $text = is_string($value) ? $value : '';
                $existing = (string) ($block['innerHTML'] ?? '');
                $escaped = $this->escTextWithRichInlines($text);

                if (preg_match('/<p\b[^>]*>/i', $existing)) {
                    // Callback (not a replacement string) so user text containing
                    // $1 / \1 / $0 is spliced literally, not parsed as a backref.
                    $newInner = preg_replace_callback(
                        '/(<p\b[^>]*>)(.*?)(<\/p>)/is',
                        static function ($m) use ($escaped) {
                            return $m[1] . $escaped . $m[3];
                        },
                        $existing,
                        1
                    );
                } else {
                    $newInner = '<p>' . $escaped . '</p>';
                }

                $block['innerHTML']    = $newInner;
                $block['innerContent'] = [$newInner];
                return $block;

            case 'align':
                $allowed = ['left', 'center', 'right'];
                $next    = in_array($value, $allowed, true) ? $value : null;
                $attrs   = $block['attrs'] ?? [];

                if ($next === null) {
                    unset($attrs['align']);
                } else {
                    $attrs['align'] = $next;
                }
                // The editor adds has-text-align-* on save, but already-serialized
                // markup needs the class updated directly to re-render aligned.
                $block['attrs']      = $attrs;
                $block['innerHTML']  = $this->updateAlignClass((string) ($block['innerHTML'] ?? ''), $next);
                $block['innerContent'] = [$block['innerHTML']];
                return $block;
        }
        return $block;
    }

    private function escTextWithRichInlines(string $text): string
    {
        return wp_kses_post($text);
    }

    private function updateAlignClass(string $html, $align): string
    {
        $tp = new \WP_HTML_Tag_Processor($html);
        if (!$tp->next_tag('p')) {
            return $html;
        }
        $classes = (string) ($tp->get_attribute('class') ?? '');
        $classes = trim((string) preg_replace('/\bhas-text-align-(left|center|right)\b/', '', $classes));
        $classes = preg_replace('/\s+/', ' ', $classes);
        if ($align !== null) {
            $classes = trim($classes . ' has-text-align-' . $align);
        }
        if ($classes === '') {
            $tp->remove_attribute('class');
        } else {
            $tp->set_attribute('class', $classes);
        }
        return $tp->get_updated_html();
    }
}
