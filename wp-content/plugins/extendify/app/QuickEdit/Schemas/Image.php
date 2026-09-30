<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

// Mirrors attrs.url and the inner <img src> so the parsed-block tree
// stays internally consistent across re-renders.
class Image implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'image',
                'control' => 'image',
                'label'   => __('Image', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        if ($fieldKey !== 'image' || !is_array($value)) {
            return $block;
        }

        $id  = isset($value['id']) ? (int) $value['id'] : null;
        $alt = isset($value['alt']) ? wp_strip_all_tags((string) $value['alt']) : null;

        // A positive id must resolve to a real image attachment; when it does,
        // trust the server's URL over the client's. The raw client URL is only
        // honored for the id-less external-image case.
        if ($id !== null && $id > 0) {
            if (!wp_attachment_is_image($id)) {
                return $block;
            }
            $url = wp_get_attachment_image_url($id, 'full') ?: null;
        } else {
            $url = isset($value['url']) ? esc_url_raw((string) $value['url']) : null;
        }

        if (!$url) {
            return $block;
        }

        $attrs        = $block['attrs'] ?? [];
        $attrs['url'] = $url;
        if ($id !== null && $id > 0) {
            $attrs['id'] = $id;
        } else {
            unset($attrs['id']);
        }
        $block['attrs'] = $attrs;

        // wp_filter_content_tags rebuilds srcset on render when an
        // attachment id is present; URL-only sources stay srcset-less.
        $existing = (string) ($block['innerHTML'] ?? '');
        $tp = new \WP_HTML_Tag_Processor($existing);
        if ($tp->next_tag('img')) {
            $tp->set_attribute('src', $url);
            if ($alt !== null) {
                $tp->set_attribute('alt', $alt);
            }

            // Sync wp-image-{id} with attrs.id; Gutenberg's save() derives the
            // class from attrs.id and a mismatch trips the validator's "Attempt
            // Recovery" prompt. Strip pre-existing first so re-edits don't stack.
            $cls = (string) ($tp->get_attribute('class') ?? '');
            $cls = trim((string) preg_replace('/\bwp-image-\d+\b/', '', $cls));
            if ($id !== null && $id > 0) {
                $cls = trim($cls . ' wp-image-' . $id);
            }
            if ($cls === '') {
                $tp->remove_attribute('class');
            } else {
                $tp->set_attribute('class', $cls);
            }

            if ($id === null || $id <= 0) {
                $tp->remove_attribute('srcset');
                $tp->remove_attribute('sizes');
            }
            $existing = $tp->get_updated_html();
        }

        // The Launch-import marker class survives on the rendered figure but not
        // in attrs.className; that mismatch trips the block validator after edit.
        $existing = $this->stripImportMarker($existing, 'figure');

        $block['innerHTML']    = $existing;
        $block['innerContent'] = [$existing];

        return $block;
    }

    private function stripImportMarker(string $html, string $tagName): string
    {
        $tp = new \WP_HTML_Tag_Processor($html);
        if (!$tp->next_tag($tagName)) {
            return $html;
        }
        if (!$tp->has_class('extendify-image-import')) {
            return $html;
        }
        $tp->remove_class('extendify-image-import');
        return $tp->get_updated_html();
    }
}
