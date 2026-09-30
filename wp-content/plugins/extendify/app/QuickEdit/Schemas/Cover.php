<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

class Cover implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'background',
                'control' => 'image',
                'label'   => __('Background image', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        if ($fieldKey !== 'background' || !is_array($value)) {
            return $block;
        }

        $id = isset($value['id']) ? (int) $value['id'] : null;

        // Mirror of Image::apply — a positive id must be a real image
        // attachment, and the server-derived URL wins over the client's.
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

        $attrs = $block['attrs'] ?? [];
        $attrs['url'] = $url;
        if ($id !== null && $id > 0) {
            $attrs['id'] = $id;
        } else {
            unset($attrs['id']);
        }
        unset($attrs['hasParallax']);
        $block['attrs'] = $attrs;

        // Patch the string chunks in innerContent — NOT innerHTML. innerContent
        // for a cover with inner blocks is `[wrapper_open, null, wrapper_close]`;
        // those nulls map to innerBlocks at serialize time. Stuffing innerHTML
        // into [0] closes the wrapper early and the inner blocks land outside
        // the cover, vanishing from __inner-container.
        // Color-only / video covers don't have an image-background <img>;
        // skip rather than synthesizing one.
        $innerContent = $block['innerContent'] ?? [];
        foreach ($innerContent as $i => $chunk) {
            if (!is_string($chunk)) {
                continue;
            }
            $tp = new \WP_HTML_Tag_Processor($chunk);
            $patched = false;
            while ($tp->next_tag('img')) {
                $cls = (string) ($tp->get_attribute('class') ?? '');
                if (str_contains($cls, 'wp-block-cover__image-background')) {
                    $tp->set_attribute('src', $url);
                    if ($id === null || $id <= 0) {
                        $tp->remove_attribute('srcset');
                        $tp->remove_attribute('sizes');
                    }

                    // Gutenberg's core/cover save() derives the wp-image-{id}
                    // class from attrs.id; mismatch trips the block validator.
                    $newCls = trim((string) preg_replace(
                        '/\bwp-image-\d+\b/',
                        '',
                        $cls
                    ));
                    if ($id !== null && $id > 0) {
                        $newCls = trim($newCls . ' wp-image-' . $id);
                    }
                    $newCls = (string) preg_replace('/\s{2,}/', ' ', $newCls);
                    $tp->set_attribute('class', $newCls);

                    $patched = true;
                    break;
                }
            }
            if ($patched) {
                $patchedChunk = $tp->get_updated_html();
                $patchedChunk = $this->stripImportMarker($patchedChunk, 'div');
                $innerContent[$i] = $patchedChunk;
                $block['innerContent'] = $innerContent;
                // Inspection-only; the serializer rebuilds innerHTML from innerContent.
                $block['innerHTML'] = implode('', array_map(
                    static function ($c) {
                        return is_string($c) ? $c : '';
                    },
                    $innerContent
                ));
                break;
            }
        }

        return $block;
    }

    // Mirror of Image::stripImportMarker.
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
