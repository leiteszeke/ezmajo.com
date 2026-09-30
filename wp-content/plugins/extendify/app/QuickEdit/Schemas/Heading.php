<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

// Quick Edit intentionally doesn't expose `attrs.level` — changing h2 → h1
// has SEO/a11y implications and belongs in the full editor.
class Heading implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'content',
                'control' => 'text',
                'label'   => __('Heading text', 'extendify-local'),
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
                $text = is_string($value) ? $value : '';
                $existing = (string) ($block['innerHTML'] ?? '');
                $escaped = wp_kses_post($text);

                if (preg_match('/<(h[1-6])\b/i', $existing, $m)) {
                    $tag = strtolower($m[1]);
                    // Callback (not a replacement string) so user text containing
                    // $1 / \1 / $0 is spliced literally, not parsed as a backref.
                    $newInner = preg_replace_callback(
                        '/(<' . $tag . '\b[^>]*>)(.*?)(<\/' . $tag . '>)/is',
                        static function ($parts) use ($escaped) {
                            return $parts[1] . $escaped . $parts[3];
                        },
                        $existing,
                        1
                    );
                } else {
                    $level = (int) ($block['attrs']['level'] ?? 2);
                    $level = max(1, min(6, $level));
                    $newInner = '<h' . $level . '>' . $escaped . '</h' . $level . '>';
                }

                $block['innerHTML']    = $newInner;
                $block['innerContent'] = [$newInner];
                return $block;

            case 'align':
                $allowed = ['left', 'center', 'right'];
                $next    = in_array($value, $allowed, true) ? $value : null;
                $attrs   = $block['attrs'] ?? [];

                if ($next === null) {
                    unset($attrs['textAlign']);
                } else {
                    $attrs['textAlign'] = $next;
                }
                $block['attrs']      = $attrs;
                $block['innerHTML']  = $this->updateAlignClass((string) ($block['innerHTML'] ?? ''), $next);
                $block['innerContent'] = [$block['innerHTML']];
                return $block;
        }
        return $block;
    }

    private function updateAlignClass(string $html, $align): string
    {
        $tp = new \WP_HTML_Tag_Processor($html);
        if (!$tp->next_tag()) {
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
