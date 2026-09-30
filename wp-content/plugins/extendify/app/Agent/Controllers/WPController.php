<?php

/**
 * WP Controller
 */

namespace Extendify\Agent\Controllers;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\PostBlockFinder;
use Extendify\Agent\TemplatePartBlockFinder;
use Extendify\Constants;
use Extendify\Shared\Services\HeroDescription;
use Extendify\Shared\Services\Sanitizer;
use Extendify\Shared\Services\SiteImages;

/**
 * The controller for interacting with WordPress.
 */

class WPController
{
    /**
     * $ignoredKeys are only removed top-level (line 94) and not recursively
     *
     * @var string[]
     */
    public static $ignoredKeys = [
        'title',
        '$schema',
        'version',
        'slug',
    ];
    /**
     * Allowed variations for the extendable theme
     *
     * @var string[]
     */
    public static $allowedVariationsList = [
        'bloom',
        'brick',
        'cobalt',
        'coral',
        'evergreen',
        'gold',
        'lilac',
        'lime',
        'midnight',
        'moss',
        'neon',
        'rosewood',
        'slate',
        'onyx',
        'glasgow',
        'royal',
        'obsidian',
        'heath',
        'signal',
        'marzipan',
        'butterscotch',
    ];

    /**
     * Recursively filter an array to include only specified properties.
     *
     * This function traverses the array structure and retains only the properties
     * specified in the allowed keys, preserving the original hierarchical structure.
     * Keys that don't match the allowed set are excluded from the result.
     *
     * @param array $data The input array to filter
     * @param array $allowedKeys Associative array of allowed property keys (keys as indices)
     * @return array             Filtered array containing only allowed properties, maintaining structure
     */
    protected static function filterArrayByProperties(array $data, array $allowedKeys)
    {
        if (empty($allowedKeys) || empty($data)) {
            return [];
        }

        $result = [];
        foreach ($data as $key => $value) {
            if (isset($allowedKeys[$key])) {
                $result[$key] = $value;
            } elseif (is_array($value)) {
                // Recursively filter nested arrays
                $filtered = self::filterArrayByProperties($value, $allowedKeys);
                if (!empty($filtered)) {
                    $result[$key] = $filtered;
                }
            }
        }
        return $result;
    }

    /**
     * Validates if a variation contains only specified properties.
     *
     * This function checks whether the variation array contains exclusively the
     * specified properties throughout its entire hierarchy.
     *
     * @param array $variation The theme variation arrays to validate
     * @param array $allowedKeys List of property names that should be the only ones present
     * @return bool           TRUE if only specified properties exist, FALSE otherwise
     */
    protected static function variationHasProperties(array $variation, array $allowedKeys)
    {
        if (empty($variation) || empty($allowedKeys)) {
            return false;
        }

        $allowedKeys = array_flip($allowedKeys);
        $data  = array_diff_key($variation, array_flip(self::$ignoredKeys));
        $filtered = self::filterArrayByProperties($data, $allowedKeys);

        return serialize($filtered) === serialize($data);
    }

    /**
     * Get the CSS for each variation.
     *
     * @param array $variations The theme variations to process.
     * @param \WP_Theme_JSON $current The current theme JSON data.
     * @param bool $includeLayoutStyles Whether to include layout styles in the CSS.
     * @return array The variations with their corresponding CSS.
     */
    protected static function getCss($variations, $current, $includeLayoutStyles)
    {
        $deduped = [];
        foreach ($variations as $variation) {
            $title = $variation['title'] ?? null;
            if (!$title || isset($deduped[$title])) {
                continue;
            }
            $theme = new \WP_Theme_JSON();
            $theme->merge($current);
            $theme->merge(new \WP_Theme_JSON($variation));
            $css = $theme->get_stylesheet(
                ["variables", "styles", "presets"],
                null,
                ["skip_root_layout_styles" => !$includeLayoutStyles, 'include_block_style_variations' => true]
            );
            $variation['css'] = $css;
            // to make sure we exit early
            $deduped[$title] = $variation;
        }

        return array_values($deduped);
    }

    /**
     * Get Theme Variations and the compiled CSS for each variation.
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getVariations($request)
    {
        $includeLayoutStyles = $request->has_param('includeLayoutStyles');
        $current = \WP_Theme_JSON_Resolver::get_merged_data();
        $unfiltered = \WP_Theme_JSON_Resolver::get_style_variations();

        $variations = array_filter($unfiltered, function ($variation) {
            return self::variationHasProperties($variation, ['color']);
        });

        $buildSlugMap = function ($unfiltered) {
            $slugMap = [];

            if (!is_array($unfiltered)) {
                return $slugMap;
            }

            foreach ($unfiltered as $rawSlug => $rawVariation) {
                $title = is_array($rawVariation) ? ($rawVariation['title'] ?? null) : null;
                $slug = is_array($rawVariation)
                    ? ($rawVariation['slug'] ?? (is_string($rawSlug) ? $rawSlug : null))
                    : null;

                if ($title && $slug && !isset($slugMap[$title])) {
                    $slugMap[$title] = $slug;
                }
            }
            return $slugMap;
        };
        $slugMap = $buildSlugMap($unfiltered);
        array_walk($variations, function (&$variation) use ($slugMap) {
            if (!is_array($variation) || isset($variation['slug'])) {
                return;
            }

            $title = $variation['title'] ?? null;
            if ($title && isset($slugMap[$title])) {
                $variation['slug'] = $slugMap[$title];
            }
        });

        $deduped = static::getCss($variations, $current, $includeLayoutStyles);
        // if the theme is extendable we need to filter the variations using the allowed variations list
        if (\get_option('stylesheet') === 'extendable') {
            $deduped = array_filter($deduped, function ($variation) {
                return in_array($variation['slug'], self::$allowedVariationsList);
            });
        }


        return new \WP_REST_Response(array_values($deduped));
    }

    /**
     * Get Theme fonts Variations and the compiled CSS for each variation.
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getFontsVariations($request)
    {
        $includeLayoutStyles = $request->has_param('includeLayoutStyles');
        $current = \WP_Theme_JSON_Resolver::get_merged_data();
        $unfiltered = \WP_Theme_JSON_Resolver::get_style_variations();

        $fontsVariations = array_filter($unfiltered, function ($variation) {
            return self::variationHasProperties($variation, ['elements', 'typography']);
        });

        $processedFonts = array_map(function ($variation) {
            if (!isset($variation['styles']['elements']) || !is_array($variation['styles']['elements'])) {
                return $variation;
            }

            $variation['styles']['elements'] = array_map(
                [self::class, 'normalizeElementTypography'],
                $variation['styles']['elements']
            );

            if (!isset($variation['styles']['typography'])) {
                $variation['styles']['typography'] = [
                    'fontFamily' => 'var(--wp--preset--font-family--inter)'
                ];
            }

            // Removing the settings that cause the style to change.
            unset($variation['settings']);

            return $variation;
        }, $fontsVariations);

        $deduped = static::getCss($processedFonts, $current, $includeLayoutStyles);
        return new \WP_REST_Response($deduped);
    }

    /**
     * Get block style variations (vibes) from merged global styles
     *
     * @param \WP_REST_Request $request The request.
     * @return \WP_REST_Response
     */
    public static function getBlockStyleVariations($request)
    {
        // Get theme + DB merged Global Styles
        $merged = wp_get_global_styles();
        $blocks = $merged['blocks'] ?? [];

        $variations = [];

        foreach ($blocks as $blockName => $blockData) {
            if (!isset($blockData['variations'])) {
                continue;
            }

            $variations[$blockName] = $blockData['variations'];
        }

        return new \WP_REST_Response($variations, 200);
    }

    /**
     * Normalize typography properties for theme element styles.
     *
     * @param array $elementStyles The element styles array containing typography configuration
     * @return array Normalized typography properties with filtered null values
     */
    protected static function normalizeElementTypography(array $elementStyles)
    {
        $typography = $elementStyles['typography'] ?? [];

        return [
            'typography' => array_filter([
                'fontFamily' => $typography['fontFamily'] ?? null,
                'fontSize' => $typography['fontSize'] ?? null,
                'lineHeight' => $typography['lineHeight'] ?? null,
                'letterSpacing' => $typography['letterSpacing'] ?? null,
                'fontStyle' => $typography['fontStyle'] ?? null,
                'fontWeight' => $typography['fontWeight'] ?? null,
                // Defaulting to 'none' would cancel the applied vibe's uppercase.
                'textTransform' => $typography['textTransform'] ?? null,
            ], function ($v) {
                return $v !== null;
            })
        ];
    }


    /**
     * Where else the synced pattern or menu a composite blockId names is used
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getSharedBlockUsage(\WP_REST_Request $request)
    {
        $composite = TemplatePartBlockFinder::parseCompositeId(
            $request->get_param('blockId')
        );
        if (!$composite) {
            return new \WP_REST_Response(['scope' => 'block', 'pages' => []], 200);
        }

        $seen = [];
        $pages = [];
        $sitewide = self::collectRefUsage($composite['ref'], $seen, $pages);

        return new \WP_REST_Response([
            'scope' => $sitewide ? 'site' : ($pages ? 'pages' : 'block'),
            'pages' => array_values($pages),
        ], 200);
    }

    // A template or part renders it everywhere, so a page list only matters otherwise.
    private static function collectRefUsage(int $ref, array &$seen, array &$pages): bool
    {
        if (isset($seen[$ref])) {
            return false;
        }
        $seen[$ref] = true;

        $sitewide = false;
        foreach (self::postsReferencing($ref) as $row) {
            $id = (int) $row->ID;
            if (in_array($row->post_type, ['wp_template', 'wp_template_part'], true)) {
                $sitewide = true;
                continue;
            }
            // A pattern nested in a pattern inherits wherever the outer one lands.
            if ($row->post_type === 'wp_block') {
                $sitewide = self::collectRefUsage($id, $seen, $pages) || $sitewide;
                continue;
            }
            $pages[$id] = ['id' => $id, 'title' => \get_the_title($id)];
        }

        return $sitewide;
    }

    // The ref is literal text inside a block comment, which WP indexes nowhere.
    private static function postsReferencing(int $ref)
    {
        global $wpdb;

        $like = $wpdb->esc_like('"ref":' . $ref);
        return $wpdb->get_results($wpdb->prepare(
            "SELECT ID, post_type FROM {$wpdb->posts}
             WHERE post_status IN ('publish', 'private', 'draft')
               AND post_type IN ('post', 'page', 'wp_block', 'wp_template', 'wp_template_part')
               AND (post_content LIKE %s OR post_content LIKE %s)",
            '%' . $like . '}%',
            '%' . $like . ',%'
        ));
    }

    /**
     * Get the HTML of a specific tagged block code
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getBlockCode(\WP_REST_Request $request)
    {
        $rawId = $request->get_param('blockId');
        $partSlug = (string) $request->get_param('partSlug');

        $composite = TemplatePartBlockFinder::parseCompositeId($rawId);
        if ($composite) {
            return self::getRefPostBlockCode(
                $composite,
                (string) $rawId,
                $partSlug,
                (int) $request->get_param('postId')
            );
        }

        $blockId = (int) $rawId;
        if ($blockId < 1) {
            return new \WP_REST_Response(['error' => 'Invalid blockId'], 400);
        }

        // A template-part source resolves the part and walks it with the shared
        // preorder finder, instead of the post path below.
        if ($partSlug !== '') {
            return self::getTemplatePartBlockCode($partSlug, $blockId);
        }

        $postId = (int) $request->get_param('postId');
        $post = \get_post($postId);
        if (!$post) {
            return new \WP_REST_Response(['error' => 'Post not found'], 404);
        }

        $found = PostBlockFinder::find(parse_blocks($post->post_content), $blockId);

        if (!$found || empty($found['block']['blockName'])) {
            return new \WP_REST_Response(['error' => 'Block id not found in this post'], 404);
        }

        return self::blockCodeResponse($found['block'], ['postId' => $postId], $blockId);
    }

    // One response shape for every source, so the client reads the same fields
    // whichever post the block turned out to live in.
    private static function blockCodeResponse(array $block, array $scope, $blockId)
    {
        return new \WP_REST_Response(array_merge($scope, [
            'blockId' => $blockId,
            'name'    => $block['blockName'],
            'attrs'   => $block['attrs'] ?? (object)[],
            'block'   => serialize_blocks([$block]),
        ]), 200);
    }

    // Resolves the part the same way SaveController does — active-theme-scoped
    // get_block_template, not a raw get_posts by name — then walks it with the
    // shared preorder finder so the blockId lands on the block save will write.
    private static function getTemplatePartBlockCode(string $slug, int $blockId)
    {
        $content = self::templatePartContent($slug);
        if ($content === null) {
            return new \WP_REST_Response(['error' => 'Template part not found'], 404);
        }

        $found = TemplatePartBlockFinder::find(
            parse_blocks($content),
            $blockId
        );
        if (!is_array($found) || empty($found['block']['blockName'])) {
            return new \WP_REST_Response(['error' => 'Block id not found in this template part'], 404);
        }

        return self::blockCodeResponse($found['block'], ['partSlug' => $slug], $blockId);
    }

    // Post and theme file number identically, so an id survives the first edit.
    private static function templatePartContent(string $slug)
    {
        $stylesheet = \wp_get_theme()->get_stylesheet();
        $template = \get_block_template("{$stylesheet}//{$slug}", 'wp_template_part');
        if (!$template) {
            return null;
        }
        $post = empty($template->wp_id) ? null : \get_post($template->wp_id);
        return $post ? $post->post_content : $template->content;
    }

    // A synced pattern's or menu's blocks live in the post its id names, walked
    // with the same finder — the part they render inside owns none of them.
    private static function getRefPostBlockCode(
        array $composite,
        string $blockId,
        string $partSlug,
        int $postId
    ) {
        $post = \get_post($composite['ref']);
        if (!$post || $post->post_type !== $composite['postType']) {
            return new \WP_REST_Response(['error' => 'Referenced post not found'], 404);
        }

        $containerPost = $partSlug === '' ? \get_post($postId) : null;
        $container = $partSlug !== ''
            ? self::templatePartContent($partSlug)
            : ($containerPost ? $containerPost->post_content : null);
        if ($container === null) {
            return new \WP_REST_Response(['error' => 'Block id not found in this post'], 404);
        }

        // Unchecked, every pattern and menu on the site reads back from any page.
        if (!TemplatePartBlockFinder::contentRendersRef($container, $composite['ref'])) {
            return new \WP_REST_Response(['error' => 'Block id not found in this post'], 404);
        }

        $found = TemplatePartBlockFinder::find(
            parse_blocks($post->post_content),
            $composite['seq']
        );
        if (!is_array($found) || empty($found['block']['blockName'])) {
            return new \WP_REST_Response(['error' => 'Block id not found in this referenced post'], 404);
        }

        return self::blockCodeResponse($found['block'], ['partSlug' => $partSlug], $blockId);
    }

    /**
     * Get the rendered HTML of some block code
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getBlockHtml($request)
    {
        $blockCode = $request->get_param('blockCode');
        $content = \do_blocks($blockCode);

        // Layout supports register per-container CSS for a page-side enqueue
        // that never happens on a REST fragment — ship it with the markup.
        $styles = function_exists('wp_style_engine_get_stylesheet_from_context')
            ? \wp_style_engine_get_stylesheet_from_context('block-supports')
            : '';

        return new \WP_REST_Response(['content' => trim($content), 'styles' => $styles]);
    }

    /**
     * Get the Hero Patterns from the API
     *
     * @param string $title The title to replace in the pattern code
     * @param string $description The description to replace in the pattern code
     * @param array $images The images to replace in the pattern code, as an array of urls
     * @param array $cta The cta to replace in the pattern code, as an array with 'label' and 'link' keys
     * @param bool $featuredOnly Whether to limit to featured patterns
     * @param string|null $source What triggered the request, e.g. 'change-site-design-workflow'
     * @return array|\WP_Error|array<string|int, mixed> The hero patterns data or a WP_Error on failure
     */
    protected static function getHeroPatternsData(
        $title,
        $description,
        $images,
        $cta,
        $featuredOnly = false,
        $source = null
    ) {
        $response = \wp_remote_post(
            Constants::PATTERNS_HOST . '/api/heros',
            [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ],
                'body' => wp_json_encode([
                    "wpVersion" => \get_bloginfo('version'),
                    "wpLanguage" => \get_locale(),
                    "featured" => $featuredOnly,
                    "source" => $source,
                ])
            ]
        );

        if (\is_wp_error($response)) {
            return $response;
        }

        $body = json_decode(\wp_remote_retrieve_body($response), true);

        $cursor = 0;
        $imageCount = count($images);
        $heroPatterns = [];

        foreach ($body as $heroPattern) {
            $code = $heroPattern['code'] ?? '';

            if ($title) {
                $code = preg_replace(
                    '/(<!-- wp:heading[^>]*-->[\s\S]*?<h1[^>]*>)[\s\S]*?(<\/h1>[\s\S]*?<!-- \/wp:heading -->)/m',
                    '${1}' . esc_html($title) . '${2}',
                    $code,
                    1
                );
            }

            if (trim((string) $description) === '') {
                // Catalog paragraphs describe the slot, not the site.
                $code = preg_replace(
                    '/<!-- wp:paragraph[\s\S]*?<!-- \/wp:paragraph -->/m',
                    '',
                    $code,
                    1
                );
            } else {
                $code = preg_replace(
                    '/(<!-- wp:paragraph[^>]*-->[\s\S]*?<p[^>]*>)[\s\S]*?(<\/p>[\s\S]*?<!-- \/wp:paragraph -->)/m',
                    '${1}' . esc_html($description) . '${2}',
                    $code,
                    1
                );
            }

            if ($cta['label'] ?? null) {
                $code = preg_replace(
                    '/(<!-- wp:button[^>]*-->[\s\S]*?<a[^>]*>)[\s\S]*?(<\/a>[\s\S]*?<!-- \/wp:button -->)/m',
                    '${1}' . esc_html($cta['label']) . '${2}',
                    $code,
                    1
                );
            }

            if ($cta['link'] ?? null) {
                $code = preg_replace(
                    '/(<!-- wp:button[\s\S]*?<a[^>]*\shref=")[^"]*(")/m',
                    '${1}' . esc_url($cta['link']) . '${2}',
                    $code,
                    1
                );
            }

            $patternUrls = $heroPattern['urls'] ?? [];
            foreach ($patternUrls as $key => $url) {
                if (!$imageCount) {
                    break;
                }
                $code = str_replace($url, $images[($cursor + $key) % $imageCount], $code);
            }
            $cursor = $imageCount ? ($cursor + count($patternUrls)) % $imageCount : 0;

            $renderedHtml = do_blocks(str_replace('ext-animate--on', '', $code));

            $blockSupportsCss = function_exists('wp_style_engine_get_stylesheet_from_context')
                ? wp_style_engine_get_stylesheet_from_context('block-supports')
                : '';

            // Clear block-supports store so CSS doesn't accumulate across patterns.
            \WP_Style_Engine_CSS_Rules_Store::remove_all_stores();

            $linkStyles = array_values(
                array_filter(
                    array_map(
                        function ($style) {
                            return wp_styles()->registered[$style]->src ?? null;
                        },
                        wp_styles()->queue ?? []
                    )
                )
            );

            /**
             * Clear queue for the next pattern.
             *
             * `do_blocks` appends to the global queue the styles needed for the blocks.
             */
            wp_styles()->queue = [];

            $heroPatterns[] = [
                'id'               => $heroPattern['id'],
                'name'             => $heroPattern['name'],
                'code'             => $code,
                'renderedHtml'     => $renderedHtml,
                'blockSupportsCss' => $blockSupportsCss,
                'linkStyles'       => $linkStyles,
            ];
        }

        return $heroPatterns;
    }

    /**
     * Get the Hero Patterns
     *
     * @param \WP_REST_Request $request The REST API request object.
     * @return \WP_REST_Response
     */
    public static function getHeroPatterns(\WP_REST_Request $request)
    {
        $title = $request->get_param('title');
        $description = $request->get_param('description');
        $images = $request->get_param('images');
        $cta = $request->get_param('cta');

        $heroPatterns = self::getHeroPatternsData($title, $description, $images, $cta);

        if (\is_wp_error($heroPatterns)) {
            return new \WP_REST_Response([], 500);
        }

        $blockEditorContext = new \WP_Block_Editor_Context(array( 'name' => 'core/edit-post' ));
        $editorSettings = get_block_editor_settings([], $blockEditorContext);

        return new \WP_REST_Response(['patterns' => $heroPatterns, 'blockEditorSettings' => $editorSettings ?? null]);
    }

    /**
     * Build the image list for the hero section.
     *
     * Returns up to 6 images: unused site images first, already-used images last.
     * When already at capacity, reverses the array so the last-used image leads next time.
     */
    protected static function getHeroSectionImages(array $images, array $siteImages, int $postId): array
    {
        $maxSlots = 6;

        if (count($images) >= $maxSlots) {
            return array_reverse($images);
        }

        $candidates = SiteImages::urls($siteImages);

        if (!$postId || empty($candidates)) {
            return $images;
        }

        $usedImages = self::resolveUsedImages($postId);
        $candidates = array_map(function ($url) {
            return self::stripQueryString($url);
        }, $candidates);

        $unusedImages = array_values(array_filter(
            $candidates,
            function ($url) use ($usedImages, $images) {
                return !in_array($url, $usedImages, true) && !in_array($url, $images, true);
            }
        ));

        $unusedSlots = $maxSlots - count($images);
        return array_merge(array_slice($unusedImages, 0, $unusedSlots), $images);
    }

    protected static function stripQueryString(string $url): string
    {
        $parsed = wp_parse_url($url);
        return ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '') . ($parsed['path'] ?? '');
    }

    /**
     * Get all Unsplash URLs used in a post.
     */
    protected static function resolveUsedImages(int $postId): array
    {
        $post = get_post($postId);
        if (!$post) {
            return [];
        }

        $processor = new \WP_HTML_Tag_Processor($post->post_content);
        $usedImages = [];

        while ($processor->next_tag('img')) {
            $src = $processor->get_attribute('src');
            if (!$src) {
                continue;
            }

            $baseUrl = self::stripQueryString($src);

            if (str_contains($src, 'unsplash.com')) {
                $usedImages[] = $baseUrl;
                continue;
            }

            $attachmentId = attachment_url_to_postid(esc_url($baseUrl));

            if (!$attachmentId) {
                continue;
            }

            $sourceUrl = get_post_meta($attachmentId, '_extendify_source_url', true);

            if (!$sourceUrl) {
                continue;
            }

            $usedImages[] = self::stripQueryString($sourceUrl);
        }

        return array_values(array_unique($usedImages));
    }

    public static function getSiteDesignVariations(\WP_REST_Request $request)
    {
        $title = $request->get_param('title');
        $description = HeroDescription::resolve($request->get_param('description'));
        $images = $request->get_param('images') ?? [];
        $cta = $request->get_param('cta');
        $featuredOnly = true; // Only show featured patterns
        $currentHeroPattern = $request->get_param('currentHeroPattern');
        $postId = (int) $request->get_param('postId');
        $siteImages = $request->get_param('siteImages') ?? [];
        $source = $request->get_param('source');

        $images = self::getHeroSectionImages($images, $siteImages, $postId);

        $heroPatterns = self::getHeroPatternsData($title, $description, $images, $cta, $featuredOnly, $source);

        if (\is_wp_error($heroPatterns)) {
            return new \WP_REST_Response([], 500);
        }

        $heroPatterns = array_values(
            array_filter(
                $heroPatterns,
                function ($heroPattern) use ($currentHeroPattern) {
                    if (!$currentHeroPattern) {
                        return true;
                    }

                    return $heroPattern['name'] !== $currentHeroPattern;
                }
            )
        );

        $current = \WP_Theme_JSON_Resolver::get_merged_data('theme');

        $unfiltered = \WP_Theme_JSON_Resolver::get_style_variations();

        // Keep only full style variations — exclude color-only and font-only
        // presets that get_style_variations() returns from styles/colors/* and
        // styles/typography/*.
        $colorAndFontsVariations = array_filter($unfiltered, function ($variation) {
            $hasPalette    = ($variation['settings']['color']['palette'] ?? []) !== [];
            $hasTypography = ($variation['styles']['typography'] ?? []) !== []
            || ($variation['settings']['typography'] ?? []) !== [];
            $hasElements   = ($variation['styles']['elements'] ?? []) !== [];
            return $hasPalette && $hasTypography && $hasElements;
        });

        $buildSlugMap = function ($unfiltered) {
            $slugMap = [];

            if (!is_array($unfiltered)) {
                return $slugMap;
            }

            foreach ($unfiltered as $rawSlug => $rawVariation) {
                $title = is_array($rawVariation) ? ($rawVariation['title'] ?? null) : null;
                $slug = is_array($rawVariation)
                    ? ($rawVariation['slug'] ?? (is_string($rawSlug) ? $rawSlug : null))
                    : null;

                if ($title && $slug && !isset($slugMap[$title])) {
                    $slugMap[$title] = $slug;
                }
            }
            return $slugMap;
        };
        $slugMap = $buildSlugMap($unfiltered);
        array_walk($colorAndFontsVariations, function (&$variation) use ($slugMap) {
            if (!is_array($variation) || isset($variation['slug'])) {
                return;
            }

            $title = $variation['title'] ?? null;
            if ($title && isset($slugMap[$title])) {
                $variation['slug'] = $slugMap[$title];
            }
        });

        $processedFonts = array_map(function ($variation) {
            if (!isset($variation['styles']['elements']) || !is_array($variation['styles']['elements'])) {
                return $variation;
            }

            $variation['styles']['elements'] = array_map(
                [self::class, 'normalizeElementTypography'],
                $variation['styles']['elements']
            );

            if (!isset($variation['styles']['typography'])) {
                $variation['styles']['typography'] = [
                    'fontFamily' => 'var(--wp--preset--font-family--inter)'
                ];
            }

            return $variation;
        }, $colorAndFontsVariations);

        $deduped = static::getCss($processedFonts, $current, true);

        $blockEditorContext = new \WP_Block_Editor_Context(array( 'name' => 'core/edit-post' ));
        $editorSettings = get_block_editor_settings([], $blockEditorContext);
        $editorSettings['styles'] = [];

        return new \WP_REST_Response(
            [
                'patterns' => $heroPatterns,
                'colorAndFontsVariations' => $deduped,
                'blockEditorSettings' => $editorSettings ?? null,
            ]
        );
    }

    /**
     * Sets a lock on a post to prevent concurrent editing.
     *
     * @param \WP_REST_Request $request The REST API request object containing postId.
     * @return \WP_REST_Response Response indicating success of the lock operation.
     */
    public static function lockPost($request)
    {
        $postId = (int) $request->get_param('postId');
        require_once ABSPATH . '/wp-admin/includes/post.php';
        $data = \wp_set_post_lock($postId);
        return new \WP_REST_Response(['success' => $data !== false]);
    }

    /**
     * Persist the data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function updateOption($request)
    {
        $params = $request->get_json_params();
        $key = $params['option'];
        $sanitized = Sanitizer::sanitizeUnknown($params['value']);

        if (strpos($key, 'extendify_') === 0) {
            $key = substr($key, 10);
        }
        \update_option('extendify_' . $key, $sanitized);

        return new \WP_REST_Response('OK');
    }

    /**
     * Get the data
     *
     * @param \WP_REST_Request $request - The request.
     * @return \WP_REST_Response
     */
    public static function getOption($request)
    {
        $key = $request->get_param('option');

        if (strpos($key, 'extendify_') === 0) {
            $key = substr($key, 10);
        }
        $value = \get_option('extendify_' . $key, null);

        return new \WP_REST_Response($value);
    }
}
