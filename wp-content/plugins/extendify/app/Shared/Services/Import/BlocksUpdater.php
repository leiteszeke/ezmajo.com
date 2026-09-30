<?php

/**
 * Blocks uploader class
 */

namespace Extendify\Shared\Services\Import;

defined('ABSPATH') || die('No direct access.');

/**
 * This class responsible for updating the blocks.
 */

class BlocksUpdater
{
    /**
     * The class to target.
     *
     * @var array The class names that we want to target.
     */
    protected $classesToTarget = ['extendify-image-import', 'ext-import'];

    /**
     * Update the content of the blocks in a specific post.
     *
     * @param \WP_Post $post WordPress post.
     * @return string The updated post content.
     */
    public function getModifiedBlocksInPost($post)
    {
        $blocks = parse_blocks($post->post_content);

        $updatedBlocks = $this->processAndMutateBlocks($blocks, $post->post_author);

        return str_replace('\u002d\u002d', '--', serialize_blocks($updatedBlocks));
    }

    /**
     * The logic for the update blocks code.
     *
     * @param array  $blocks WordPress post blocks.
     * @param string $author WordPress post author.
     * @return array
     */
    protected function processAndMutateBlocks($blocks, $author)
    {
        return array_map(function ($block) use ($author) {
            $block = $this->processBlock($block, $author);

            if (is_wp_error($block)) {
                return $block;
            }

            if (!empty($block['innerBlocks']) && !is_null($block['blockName'])) {
                $block['innerBlocks'] = $this->processAndMutateBlocks($block['innerBlocks'], $author);
            }

            return $block;
        }, $blocks);
    }

    /**
     *  Check if the block should not be processed.
     *
     * @param array $block the core/image block that we need to update.
     * @return bool
     */
    protected function needsImageProcessing($block)
    {
        // Check if the attributes has an element called `className` with the value of `extendify-image-import`.
        // if the returned array is empty, then the block should not be processed.
        $attrs = ($block['attrs'] ?? []);
        if (array_key_exists('className', $attrs)) {
            $className = is_array($attrs['className']) ? $attrs['className'] : explode(' ', $attrs['className']);
            return !empty(array_intersect($this->classesToTarget, $className));
        }

        return false;
    }

    /**
     * This function process the image block and return the new code.
     *
     * @param array  $block  the core/image block that we need to update.
     * @param string $author the post author.
     * @return array|\WP_Error
     */
    protected function processBlock($block, $author)
    {
        // Check if the block has the targeted class anywhere (even in unexpected places).
        $needsToRemoveClassName = $this->hasTargetedClassName($block);

        // Return the block unmodified if we don't find the class.
        if (!$this->needsImageProcessing($block) && !$needsToRemoveClassName) {
            return $block;
        }

        // Check if the block has an image.
        $image = $this->getImageSource($block['innerHTML']);

        if (!$image) {
            // If we found the class, but no image, then just remove the class.
            if ($needsToRemoveClassName) {
                $block = $this->removeTargetedClassAttribute($block);
                $block = $this->removeClassAttributeFromAttrs($block);
                // In some cases the block might become unformatted.
                $block['innerHTML'] = $this->stripClassTokens($block['innerHTML']);
                $block['innerContent'] = array_map(function ($item) {
                    return !is_null($item) ? $this->stripClassTokens($item) : null;
                }, ($block['innerContent'] ?? []));
            }

            return $block;
        }

        $upload = (new ImageUploader())->uploadImage($image, $author);

        if (is_wp_error($upload)) {
            // This is used for recording the error in the logs.
            return new \WP_Error($upload->get_error_code(), $upload->get_error_message());
        }

        $block = $this->updateNewBlockAttributes($block, $upload);
        $block = $this->addImageAttributes($block, $upload);
        $block = $this->removeTargetedClassAttribute($block);
        $block = $this->removeClassAttributeFromAttrs($block);

        return $block;
    }

    /**
     * Return the image source link or an empty string.
     *
     * @param string $htmlContent The html tag that contains the image tag.
     * @return string
     */
    protected function getImageSource($htmlContent)
    {
        $html = new \WP_HTML_Tag_Processor($htmlContent);
        $html->next_tag('img');
        $src = $html->get_attribute('src');

        // Feeds a server-side fetch, so a path-matched domain would let any host through.
        return ($src && ImageUploader::isAllowedImageHost($src)) ? $src : '';
    }

    /**
     * Update the content of the block to remove the targeted class attribute.
     *
     * @param array $block The block we need to update.
     * @return array The parsed block after updates.
     */
    protected function removeTargetedClassAttribute(array $block)
    {
        $block['innerContent'] = array_map(function ($item) {
            return !is_null($item) ? $this->removeClassAttributeFromContent($item) : null;
        }, ($block['innerContent'] ?? []));

        $block['innerHTML'] = $this->removeClassAttributeFromContent($block['innerHTML']);

        return $block;
    }

    /**
     * Remove the targeted class from the html content.
     *
     * @param string $content The html tag that contains the targeted class.
     * @return string
     */
    protected function removeClassAttributeFromContent($content)
    {
        foreach ($this->classesToTarget as $targetedClass) {
            $html = new \WP_HTML_Tag_Processor($content);
            do {
                $html->remove_class($targetedClass);
            } while ($html->next_tag(['class' => $targetedClass]));
            $content = $html->get_updated_html();
        }

        return $content;
    }

    /**
     * Build a pattern matching the class only where it stands as a whole token.
     *
     * @param string $targetedClass The class name to match.
     * @return string
     */
    protected function classTokenPattern($targetedClass)
    {
        // Uploaded filenames embed the class name (ext-imported-*.jpg); a bare substring match eats the src.
        return '/(?<=[\s"\'])' . preg_quote($targetedClass, '/') . '(?=[\s"\'])/';
    }

    /**
     * Remove the targeted classes from html the tag processor left untouched.
     *
     * @param string $content The html content.
     * @return string
     */
    protected function stripClassTokens($content)
    {
        foreach ($this->classesToTarget as $targetedClass) {
            $content = preg_replace($this->classTokenPattern($targetedClass), '', $content);
        }

        return $content;
    }

    /**
     * Remove the targeted class from the className attrs.
     *
     * @param array $block The block.
     * @return array The parsed block after updates.
     */
    protected function removeClassAttributeFromAttrs($block)
    {
        if (isset($block['attrs']['className'])) {
            $className = is_array($block['attrs']['className'])
                ? $block['attrs']['className']
                : explode(' ', $block['attrs']['className']);
            $className = array_diff($className, $this->classesToTarget);
            $block['attrs']['className'] = implode(' ', $className);
        }

        return $block;
    }

    /**
     * Update the block attributes with information about the image.
     *
     * @param array $block  Block.
     * @param array $upload The uploaded file information.
     * @return array The parse block after updates.
     */
    protected function updateNewBlockAttributes(array $block, array $upload)
    {
        $block['attrs']['id'] = $upload['attachment_id'];

        if ($block['blockName'] === 'core/media-text') {
            $block['attrs']['mediaId'] = $upload['attachment_id'];
            $block['attrs']['mediaLink'] = $upload['url'];
        }

        if ($block['blockName'] === 'core/cover') {
            $block['attrs']['url'] = $upload['url'];
        }

        return $block;
    }

    /**
     * Update the inner content for the block.
     *
     * @param array $block  Block inner content.
     * @param array $upload The uploaded file information.
     * @return array
     */
    protected function addImageAttributes($block, $upload)
    {
        $isMediaText = $block['blockName'] === 'core/media-text';

        $block['innerContent'] = array_map(function ($item) use ($upload, $isMediaText) {
            return !is_null($item) ? $this->updateImageTagAttributes($item, $upload, $isMediaText) : null;
        }, ($block['innerContent'] ?? []));

        $block['innerHTML'] = $this->updateImageTagAttributes($block['innerHTML'], $upload, $isMediaText);

        return $block;
    }

    /**
     * Checks the html and content for the class name.
     *
     * @param array $block The block.
     * @return boolean
     */
    protected function hasTargetedClassName(array $block)
    {
        $innerHTML = ($block['innerHTML'] ?? '');
        foreach ($this->classesToTarget as $targetedClass) {
            if (preg_match($this->classTokenPattern($targetedClass), $innerHTML)) {
                return true;
            }
        }

        $classList = is_array(($block['attrs']['className'] ?? null))
            ? $block['attrs']['className']
            : explode(' ', ($block['attrs']['className'] ?? ''));

        return !empty(array_intersect($this->classesToTarget, $classList));
    }

    /**
     * Return the new html content after making the required changes.
     *
     * @param string $htmlContent The html tag that contains the image tag.
     * @param array  $upload      The uploaded file information.
     * @param bool   $isMediaText Is the block a media text block, if so, we need to update the style attribute.
     * @return string
     */
    protected function updateImageTagAttributes($htmlContent, $upload, $isMediaText = false)
    {
        $html = new \WP_HTML_Tag_Processor($htmlContent);

        // Media text block needs a bit more work to update the style attribute.
        if (
            $isMediaText && $html->next_tag([
            'tag_name' => 'figure',
            'class_name' => 'wp-block-media-text__media',
            ])
        ) {
            $style = $html->get_attribute('style');
            if (preg_match('/:url\(*.+\)/m', $style, $matches)) {
                $result = str_replace($matches[0], ':url(' . $upload['url'] . ')', $style);
                $html->set_attribute('style', ($result ?? ''));
            }
        }

        // Update the image tag attributes.
        if ($html->next_tag('img')) {
            $html->set_attribute('src', $upload['url']);
            $html->add_class('wp-image-' . $upload['attachment_id']);
            if ($isMediaText && !$html->has_class('size-full')) {
                $html->add_class('size-full');
            }
        }

        return $html->get_updated_html();
    }
}
