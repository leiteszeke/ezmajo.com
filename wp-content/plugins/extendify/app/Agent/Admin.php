<?php

/**
 * Admin.
 */

namespace Extendify\Agent;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\Controllers\ChatHistoryController;
use Extendify\Agent\Controllers\TourController;
use Extendify\Config;
use Extendify\Constants;
use Extendify\Shared\Services\Escaper;
use Extendify\Shared\Services\HttpClient;
use Extendify\Agent\TagBlocks;
use Extendify\Agent\TagTemplateParts;
use Extendify\Agent\WooProductImages;
use Extendify\Agent\AbilitiesDiscovery;
use Extendify\Agent\Controllers\SiteNavigationController;
use Extendify\PartnerData;
use Extendify\Shared\DataProvider\ProductsData;
use Extendify\SiteVisibility;

/**
 * This class handles any file loading for the admin area.
 */
class Admin
{
    /**
     * Adds various actions to set up the page
     *
     * @return void
     */
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        \add_action('wp_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        ChatHistoryController::init();

        // Tag blocks so we can identify them later
        TagBlocks::init();
        TagTemplateParts::init();

        // Add the site navigation ids to the navigation blocks
        SiteNavigationController::init();

        Skeleton::init();

        WooProductImages::init();

        \add_action('extendify_agent_suggestions_refresh', [$this, 'refreshSuggestions']);
    }

    /**
     * Where the agent panel mounts — docked-left only on the onboarding front end.
     *
     * @return string
     */
    public static function agentPosition()
    {
        $agentOnboarding = PartnerData::setting('useAgentOnboarding') ||
            Config::preview('agent-onboarding') ||
            constant('EXTENDIFY_DEVMODE');

        return $agentOnboarding && !is_admin() ? 'docked-left' : 'floating';
    }

    /**
     * Adds various JS scripts and styles
     *
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        // The Customizer preview iframe is a front-end render, so this fires
        // there too — but the Agent only belongs on the live, top-level page.
        if (is_customize_preview()) {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . Config::$assetManifest['extendify-agent.php'];
        $fallback = [
            'dependencies' => [],
            'version' => $version,
        ];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        foreach ($scriptAsset['dependencies'] as $style) {
            \wp_enqueue_style($style);
        }

        \wp_enqueue_script(
            Config::$slug . '-agent-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-agent.js'],
            array_merge([Config::$slug . '-shared-scripts'], $scriptAsset['dependencies']),
            $scriptAsset['version'],
            true
        );

        $context = [
            'adminPage' => function_exists('get_current_screen') && ($screen = get_current_screen())
                ? \esc_attr($screen->id)
                : null,
            'postId' => (int) $this->getCurrentPostId(),
            'postTitle' => \esc_attr(\get_the_title($this->getCurrentPostId())),
            'postType' => \esc_attr(\get_post_type($this->getCurrentPostId())),
            'postUrl' => \esc_url(\get_permalink($this->getCurrentPostId())),
            'isFrontPage' => (bool) \is_front_page(),
            'postStatus' => \esc_attr(\get_post_status((int) $this->getCurrentPostId())),
            'isBlogPage' => (bool) \is_home(),
            'themeSlug' => \esc_attr(\wp_get_theme()->get_stylesheet()),
            'hasThemeVariations' => (bool) $this->hasThemeVariations(),
            'isBlockTheme' => function_exists('wp_is_block_theme') ? (bool) wp_is_block_theme() : false,
            'wordPressVersion' => \esc_attr(\get_bloginfo('version')),
            'usingBlockEditor' => function_exists('use_block_editor_for_post') ?
                (bool) use_block_editor_for_post($this->getCurrentPostId()) :
                false,
            'isOnEditorOrFSE' => $this->isGutenbergOrFse(),
            'activePlugins' => array_values(\get_option('active_plugins', [])),
            'isUsingVibes' => version_compare((string) wp_get_theme('extendable')->get('Version'), '2.0.32', '>='),
            'siteTitle' => \esc_attr(\get_bloginfo('name')),
            'siteDescription' => \esc_attr(\get_bloginfo('description')),
            'themePresets' => $this->getThemePresets(),
            'presetSlugs' => $this->getPresetSlugs(),
        ];
        $recommendations = ProductsData::get() ?? [];
        $pluginRecommendations = array_filter($recommendations, function ($item) {
            return in_array('ai-agent', $item['slots'] ?? [], true) && $item['ctaType'] === 'plugin';
        });
        $mappedPluginRecommendations = array_values(array_map(function ($item) {
            return [
                'title' => $item['title'] ?? '',
                'slug'  => $item['ctaPluginSlug'] ?? $item['slug'] ?? '',
                'description' => $item['aiDescription'] ?? $item['description'] ?? '',
                'redirectTo' => $item['pluginSetupUrl'] ?? '', // this is a partial setup URL not full one.
            ];
        }, $pluginRecommendations));
        $agentContext = [
            'availableAdminPages' => get_option('_transient_extendify_admin_pages_menu', []),
            'pluginRecommendations' => $mappedPluginRecommendations,
            'sitePublished' => SiteVisibility::isPublished(),
            'comingSoonEnabled' => (bool) PartnerData::setting('useComingSoon'),
        ];
        $abilities = [
            'canEditPost' => (bool) \current_user_can('edit_post', \get_queried_object_id()),
            // TODO: this may be true for a user, while they still can't edit every post
            // So we would need to clarify this in the instructions, and
            // include a step that fetches the page they want to edit
            'canEditPosts' => (bool) \current_user_can('edit_posts'),
            'canEditThemes' => (bool) \current_user_can('edit_theme_options'),
            'canActivatePlugins' => (bool) \current_user_can('activate_plugins'),
            'canInstallPlugins' => (bool) \current_user_can('install_plugins'),
            'canEditUsers' => (bool) \current_user_can('edit_users'),
            'canEditSettings' => (bool) \current_user_can('manage_options'),
            'canUploadMedia' => (bool) \current_user_can('upload_files'),
        ];

        $agentOnboarding = PartnerData::setting('useAgentOnboarding') ||
            Config::preview('agent-onboarding') ||
            constant('EXTENDIFY_DEVMODE');

        \wp_add_inline_script(
            Config::$slug . '-agent-scripts',
            'window.extAgentData = ' . \wp_json_encode([
                // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                'startOnboarding' => isset($_GET['extendify-launch-success']) && $agentOnboarding,
                'agentPosition' => self::agentPosition(),
                // Add context about where they are
                'context' => $context,
                // Material a workflow may want; each declares the keys it reads.
                'agentContext' => $agentContext,
                // List of abilities the AI can perform for this user.
                // For example, we could check whether their theme has variations.
                'abilities' => $abilities,
                // Registered WordPress Abilities (6.9+) this user may run.
                'wpAbilities' => AbilitiesDiscovery::discover(),
                // List of suggestions the AI can make for this user.
                // For example, we could check whether they need to set up a specific plugin.
                'suggestions' => $this->getSuggestions(),
                'domainsSuggestionSettings' => [
                    'showPrimary' => (bool) PartnerData::setting('showPrimaryDomainRecommendationAgent'),
                    'showSecondary' => (bool) PartnerData::setting('showSecondaryDomainRecommendationAgent'),
                    'stagingSites' => PartnerData::setting('stagingSites'),
                    'searchUrl' => PartnerData::setting('domainSearchURL'),
                ],
                'chatHistory' => ChatHistoryController::getChatHistory(),
                'userData' => [
                    'tourData' => \wp_json_encode(TourController::get()->get_data()),
                    'domainsRecommendationsActivities' => \wp_json_encode(
                        \get_option('extendify_domains_recommendations_activities', null)
                    ),
                ],
            ]),
            'before'
        );

        \wp_set_script_translations(
            Config::$slug . '-agent-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        \wp_enqueue_style(
            Config::$slug . '-agent-styles',
            EXTENDIFY_BASE_URL . 'public/build/' . Config::$assetManifest['extendify-agent.css'],
            [],
            Config::$version,
            'all'
        );
    }
    /**
     * Get the current post ID based on the context.
     *
     * @return int
     */
    private function getCurrentPostId()
    {
        if (is_admin() && function_exists('get_current_screen')) {
            $screen = get_current_screen();
            if ($screen && $screen->base === 'post') {
                global $post;
                if ($post) {
                    return (int) $post->ID;
                }
            }
        }
        if (\is_front_page()) {
            return (\get_option('show_on_front') === 'page') ? (int) \get_option('page_on_front') : 0;
        }
        if (\is_home()) {
            return (int) \get_option('page_for_posts');
        }
        return (int) \get_queried_object_id();
    }

    /**
     * Get theme presets (colors, fonts, etc.) as slug => value maps.
     *
     * @return array
     */
    private function getThemePresets()
    {
        if (!function_exists('wp_get_global_settings')) {
            return ['colors' => [], 'fontSizes' => [], 'fontFamilies' => [], 'duotone' => []];
        }

        $settings = \wp_get_global_settings();

        $colors = [];
        $colorPalette = $settings['color']['palette']['theme'] ?? [];
        foreach ($colorPalette as $item) {
            if (isset($item['slug'], $item['color'])) {
                $colors[$item['slug']] = $item['color'];
            }
        }

        $duotone = [];
        $duotonePresets = $settings['color']['duotone']['theme'] ?? [];
        foreach ($duotonePresets as $item) {
            if (isset($item['slug'], $item['colors']) && is_array($item['colors'])) {
                $duotone[] = [
                    'slug' => $item['slug'],
                    'colors' => $item['colors'],
                ];
            }
        }

        $fontSizes = [];
        $fontSizePresets = $settings['typography']['fontSizes']['theme'] ?? [];
        foreach ($fontSizePresets as $item) {
            if (isset($item['slug'], $item['size'])) {
                $fontSizes[$item['slug']] = $item['size'];
            }
        }

        $fontFamilies = [];
        $fontFamilyPresets = $settings['typography']['fontFamilies']['theme'] ?? [];
        foreach ($fontFamilyPresets as $item) {
            if (isset($item['slug'], $item['fontFamily'])) {
                $fontFamilies[$item['slug']] = $item['fontFamily'];
            }
        }

        $colorPairs = [];
        if (function_exists('wp_get_global_styles')) {
            $colorPairs = self::extractColorPairs();
        }

        return [
            'colors' => $colors,
            'duotone' => $duotone,
            'fontSizes' => $fontSizes,
            'fontFamilies' => $fontFamilies,
            'colorPairs' => $colorPairs,
        ];
    }

    /**
     * Preset slugs per design-token family across every origin. Feeds the Agent's
     * block-attribute schema so the model picks named tokens, not raw CSS.
     *
     * @return array<string,string[]>
     */
    private function getPresetSlugs()
    {
        if (!function_exists('wp_get_global_settings')) {
            return [];
        }

        $color = \wp_get_global_settings(['color']);
        $typography = \wp_get_global_settings(['typography']);

        return [
            'color' => $this->originSlugs($color, 'palette', 'defaultPalette'),
            'colorValues' => $this->originValues($color, 'palette', 'defaultPalette', 'color'),
            'gradient' => $this->originSlugs($color, 'gradients', 'defaultGradients'),
            'fontSize' => $this->originSlugs($typography, 'fontSizes', 'defaultFontSizes'),
            'fontFamily' => $this->originSlugs($typography, 'fontFamilies', 'defaultFontFamilies'),
        ];
    }

    /**
     * Slug => value, so a colour written as its own hex finds the token naming it.
     *
     * @return array<string, string>
     */
    private function originValues($node, $listKey, $defaultKey, $valueKey)
    {
        $list = $node[$listKey] ?? [];

        $origins = ['custom', 'theme'];
        if (($node[$defaultKey] ?? true) !== false) {
            $origins[] = 'default';
        }

        $values = [];
        foreach ($origins as $origin) {
            foreach ($list[$origin] ?? [] as $item) {
                if (isset($item['slug'], $item[$valueKey])) {
                    $values[(string) $item['slug']] = (string) $item[$valueKey];
                }
            }
        }

        return $values;
    }

    /**
     * Preset slugs from a settings node's origin buckets; drops the `default`
     * origin when the theme opted the family out.
     *
     * @return string[]
     */
    private function originSlugs($node, $listKey, $defaultKey)
    {
        $list = $node[$listKey] ?? [];

        $origins = ['custom', 'theme'];
        if (($node[$defaultKey] ?? true) !== false) {
            $origins[] = 'default';
        }

        $slugs = [];
        foreach ($origins as $origin) {
            foreach ($list[$origin] ?? [] as $item) {
                if (isset($item['slug'])) {
                    $slugs[] = (string) $item['slug'];
                }
            }
        }

        return array_values(array_unique($slugs));
    }

    private static function extractColorSlug(string $value)
    {
        if (preg_match('/var\(--wp--preset--color--([^)]+)\)/', $value, $m)) {
            return $m[1];
        }
        return null;
    }

    private static function extractColorPairs()
    {
        $styles = \wp_get_global_styles();
        $settings = \wp_get_global_settings();
        $custom = $settings['custom'] ?? [];

        $pairs = [];
        $seen = [];

        $bodyTextSlug = self::extractColorSlug($styles['color']['text'] ?? '');
        $bodyBgSlug = self::extractColorSlug($styles['color']['background'] ?? '');

        $candidates = [];

        if ($bodyTextSlug && $bodyBgSlug) {
            $candidates[] = ['text' => $bodyTextSlug, 'bg' => $bodyBgSlug];
        }

        $btnTextSlug = self::extractColorSlug($styles['elements']['button']['color']['text'] ?? '')
            ?? self::extractColorSlug($custom['elements']['button']['color']['text'] ?? '');
        $btnBgSlug = self::extractColorSlug($styles['elements']['button']['color']['background'] ?? '')
            ?? self::extractColorSlug($custom['elements']['button']['color']['background'] ?? '');
        if ($btnTextSlug && $btnBgSlug) {
            $candidates[] = ['text' => $btnTextSlug, 'bg' => $btnBgSlug];
        }

        $btnHoverTextSlug = self::extractColorSlug($styles['elements']['button'][':hover']['color']['text'] ?? '')
            ?? self::extractColorSlug($custom['elements']['button'][':hover']['color']['text'] ?? '');
        $btnHoverBgSlug = self::extractColorSlug($styles['elements']['button'][':hover']['color']['background'] ?? '')
            ?? self::extractColorSlug($custom['elements']['button'][':hover']['color']['background'] ?? '');
        if ($btnHoverTextSlug && $btnHoverBgSlug) {
            $candidates[] = ['text' => $btnHoverTextSlug, 'bg' => $btnHoverBgSlug];
        }

        $linkTextSlug = self::extractColorSlug($styles['elements']['link']['color']['text'] ?? '')
            ?? self::extractColorSlug($custom['elements']['link']['color']['text'] ?? '');
        if ($linkTextSlug && $bodyBgSlug) {
            $candidates[] = ['text' => $linkTextSlug, 'bg' => $bodyBgSlug];
        }

        $headingTextSlug = self::extractColorSlug($styles['elements']['heading']['color']['text'] ?? '')
            ?? self::extractColorSlug($custom['elements']['heading']['color']['text'] ?? '');
        if ($headingTextSlug && $bodyBgSlug) {
            $candidates[] = ['text' => $headingTextSlug, 'bg' => $bodyBgSlug];
        }

        if ($bodyTextSlug) {
            $candidates[] = ['text' => $bodyTextSlug, 'bg' => 'tertiary'];
        }
        if ($headingTextSlug && $headingTextSlug !== $bodyTextSlug) {
            $candidates[] = ['text' => $headingTextSlug, 'bg' => 'tertiary'];
        }

        foreach ($candidates as $pair) {
            $key = $pair['text'] . '|' . $pair['bg'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $pairs[] = $pair;
        }

        return $pairs;
    }

    /**
     * Scan the style dirs to locate if they have variations.
     * Ported from here:
     * https://github.com/WordPress/wordpress-develop/blob/trunk/src/wp-includes/class-wp-theme-json-resolver.php#L810
     *
     * @return bool
     */
    private function hasThemeVariations()
    {
        $base_directory = get_stylesheet_directory() . '/styles';
        $template_directory = get_template_directory() . '/styles';

        if (is_dir($base_directory) && glob($base_directory . '/*.json', GLOB_NOSORT)) {
            return true;
        }

        // Only check parent if it's different from child
        if (
            $template_directory !== $base_directory &&
            is_dir($template_directory) &&
            glob($template_directory . '/*.json', GLOB_NOSORT)
        ) {
            return true;
        }

        return false;
    }

    /**
     * Get suggestions for the user.
     *
     * @return array
     */
    private function getSuggestions()
    {
        $locale = \get_locale();
        $cached = \get_option('extendify_agent_suggestions_' . $locale);

        if (!is_array($cached) || !isset($cached['fetchedAt'])) {
            return $this->refreshSuggestions($locale) ?? [];
        }

        $age = time() - $cached['fetchedAt'];
        if ($age > DAY_IN_SECONDS) {
            if (!\wp_next_scheduled('extendify_agent_suggestions_refresh', [$locale])) {
                \wp_schedule_single_event(time(), 'extendify_agent_suggestions_refresh', [$locale]);
                if (\is_admin()) {
                    \spawn_cron();
                }
            }
        }

        return $cached['data'] ?? [];
    }

    /**
     * Fetch suggestions from the API and persist them.
     * Called synchronously on cold start and via wp-cron when cache is stale.
     *
     * @param string $locale - Locale to fetch (cron may run in a different site locale).
     * @return array|null
     */
    public function refreshSuggestions($locale)
    {
        // When the refresh runs via wp-cron, the active locale may differ from the cached entry's locale.
        // Switch so HttpClient sends the matching wp_language and the response lands in the right cache key.
        $needSwitch = $locale !== \get_locale();
        if ($needSwitch) {
            \switch_to_locale($locale);
        }

        $response = HttpClient::post(
            Constants::AI_HOST . '/api/agent/suggestions',
            [],
            null,
            true
        );

        if ($needSwitch) {
            \restore_previous_locale();
        }

        $optionKey = 'extendify_agent_suggestions_' . $locale;

        if ($response['code'] !== 200) {
            // Back off: stamp the cache as fetched ~23h ago so we retry in ~1h instead of every request.
            $cached = \get_option($optionKey);
            \update_option(
                $optionKey,
                [
                    'data' => is_array($cached) ? ($cached['data'] ?? []) : [],
                    'fetchedAt' => time() - (DAY_IN_SECONDS - HOUR_IN_SECONDS),
                ],
                false
            );
            return null;
        }

        $suggestions = $response['response']['suggestions'] ?? [];
        \update_option(
            $optionKey,
            ['data' => $suggestions, 'fetchedAt' => time()],
            false
        );
        return $suggestions;
    }

    /**
     * Check if the user is in the Gutenberg or FSE editor.
     *
     * @return false|bool
     */
    public function isGutenbergOrFse()
    {
        if (!is_admin() || !function_exists('get_current_screen')) {
            return false;
        }

        $screen = get_current_screen();
        if (!$screen) {
            return false;
        }

        $is_fse =
            in_array($screen->id, ['site-editor', 'appearance_page_gutenberg-edit-site'], true) ||
            (isset($GLOBALS['pagenow']) && $GLOBALS['pagenow'] === 'site-editor.php');

        $is_gutenberg =
            $screen->base === 'post' &&
            method_exists($screen, 'is_block_editor') &&
            $screen->is_block_editor();

        return $is_fse || $is_gutenberg;
    }
}
