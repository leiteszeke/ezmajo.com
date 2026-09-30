<?php

namespace Extendify\QuickEdit\Schemas;

defined('ABSPATH') || die('No direct access.');

// Mirrors the media-* attrs and the inner <figure>/<img> markup so the
// parsed-block tree stays internally consistent across re-renders. The
// editable target is the image on the media side; the synthetic client
// blockType `core/media-text:image` resolves to the real `core/media-text`
// before it reaches SaveController, which is why this is keyed on the real
// block name in the Registry.
class MediaText implements Schema
{
    public function fields(): array
    {
        return [
            [
                'key'     => 'media',
                'control' => 'image',
                'label'   => __('Image', 'extendify-local'),
            ],
        ];
    }

    public function apply(array $block, string $fieldKey, $value): array
    {
        if ($fieldKey !== 'media' || !is_array($value)) {
            return $block;
        }

        $id  = isset($value['id']) ? (int) $value['id'] : null;
        $alt = isset($value['alt']) ? wp_strip_all_tags((string) $value['alt']) : null;

        // A positive id must resolve to a real image attachment; trust the
        // server's URL when it does. The raw client URL is only honored for
        // the id-less external-image case (mirror of Image::apply).
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
        $attrs['mediaUrl']  = $url;
        $attrs['mediaLink'] = $url;
        $attrs['mediaType'] = 'image';
        if ($id !== null && $id > 0) {
            $attrs['mediaId'] = $id;
        } else {
            unset($attrs['mediaId']);
        }
        if ($alt !== null) {
            $attrs['mediaAlt'] = $alt;
        }
        $attrs = $this->dropImportClass($attrs);
        $block['attrs'] = $attrs;

        // Static block: serialize_blocks emits the stored innerContent verbatim,
        // so the rendered <img>/background must be patched here — there's no
        // save() re-run from attrs. The media <figure> + <img> live in the
        // leading string chunk (the content side is inner blocks → nulls), so
        // find that chunk and patch in place. NOT innerHTML, whose nulls would
        // collapse and drop the content-side inner blocks (see Cover::apply).
        $innerContent = $block['innerContent'] ?? [];
        foreach ($innerContent as $i => $chunk) {
            if (!is_string($chunk) || strpos($chunk, 'wp-block-media-text__media') === false) {
                continue;
            }
            $tp = new \WP_HTML_Tag_Processor($chunk);
            $inMedia = false;
            $patched = false;
            while ($tp->next_tag()) {
                $tag = $tp->get_tag();
                if ($tag === 'FIGURE') {
                    $inMedia = $tp->has_class('wp-block-media-text__media');
                    if ($inMedia) {
                        // imageFill renders the media as the figure's CSS
                        // background; keep that url in sync with the <img>.
                        $style = $tp->get_attribute('style');
                        if (is_string($style) && stripos($style, 'background-image') !== false) {
                            $tp->set_attribute('style', preg_replace_callback(
                                '/background-image\s*:\s*url\([^)]*\)/i',
                                static function () use ($url) {
                                    return 'background-image:url(' . $url . ')';
                                },
                                $style
                            ));
                            $patched = true;
                        }
                    }
                    continue;
                }
                if ($tag === 'IMG' && $inMedia) {
                    $tp->set_attribute('src', $url);
                    if ($alt !== null) {
                        $tp->set_attribute('alt', $alt);
                    }

                    // Core's save() derives wp-image-{id} + size-{mediaSizeSlug||full}
                    // from attrs; mismatched markup trips the block validator.
                    foreach ($tp->class_list() as $class) {
                        if (str_starts_with($class, 'wp-image-') || str_starts_with($class, 'size-')) {
                            $tp->remove_class($class);
                        }
                    }
                    if ($id !== null && $id > 0) {
                        $tp->add_class('wp-image-' . $id);
                        $tp->add_class('size-' . ($attrs['mediaSizeSlug'] ?? 'full'));
                    }

                    if ($id === null || $id <= 0) {
                        $tp->remove_attribute('srcset');
                        $tp->remove_attribute('sizes');
                    }
                    $patched = true;
                    break;
                }
            }
            if ($patched) {
                $patchedChunk = $this->stripImportMarker($tp->get_updated_html(), 'div');
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

    // The Launch-import marker lives in attrs.className for media-text (it
    // renders into the wrapper div); strip it so a Quick Edit replace claims
    // the image the same way the agent's change-image flow does.
    private function dropImportClass(array $attrs): array
    {
        if (!isset($attrs['className']) || !is_string($attrs['className'])) {
            return $attrs;
        }
        $classes = array_filter(
            preg_split('/\s+/', $attrs['className']) ?: [],
            static function ($c) {
                return $c !== '' && $c !== 'extendify-image-import';
            }
        );
        if ($classes) {
            $attrs['className'] = implode(' ', $classes);
        } else {
            unset($attrs['className']);
        }
        return $attrs;
    }

    // Mirror of Image::stripImportMarker — drop the marker class that survives
    // in the rendered wrapper but not in attrs after the className edit above.
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
