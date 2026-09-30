<?php

namespace Extendify\QuickEdit\Services;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;

// core/media-text renders its image as a child <figure>, but the image can
// live purely in the markup with no mediaUrl / mediaId block attrs — e.g.
// blocks imported via Extendify carry only the <img> tag. The agent's
// TagBlocks never marks the media side as its own selectable target, so tag
// the media <figure> directly (when it actually holds an <img>) so the
// front-end selector can resolve a click on the image to a media-text image
// edit. Video media is out of scope, so gate on mediaType image.
class MediaTextTagger
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const ATTR = 'data-extendify-quick-edit-mediatext-media';

    public static function init()
    {
        add_filter('render_block', [self::class, 'tag'], 11, 2);
    }

    /**
     * @param string|mixed $html
     * @param array $block
     */
    public static function tag($html, $block)
    {
        if (is_admin() || !is_string($html) || $html === '') {
            return $html;
        }
        if (($block['blockName'] ?? '') !== 'core/media-text') {
            return $html;
        }
        if (!is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return $html;
        }
        if (($block['attrs']['mediaType'] ?? 'image') !== 'image') {
            return $html;
        }

        $tp = new \WP_HTML_Tag_Processor($html);
        while ($tp->next_tag('figure')) {
            if (!$tp->has_class('wp-block-media-text__media')) {
                continue;
            }
            if ($tp->get_attribute(self::ATTR) !== null) {
                return $html;
            }
            // Only tag a figure that actually holds an image: the first tag
            // inside the media figure is the <img> for image-type blocks. This
            // skips placeholder figures with no media set.
            $tp->set_bookmark('media');
            if (!$tp->next_tag() || $tp->get_tag() !== 'IMG') {
                return $html;
            }
            $tp->seek('media');
            $tp->set_attribute(self::ATTR, '1');
            return $tp->get_updated_html();
        }

        return $html;
    }
}
