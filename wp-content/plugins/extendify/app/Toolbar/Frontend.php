<?php

/**
 * Front-end loader for the simple Extendify toolbar.
 *
 * Renders a minimal toolbar at the top of the page (AI Agent /
 * Quick Edit / Edit page / WP Admin) to replace the WordPress core
 * admin bar for editors who prefer it. The core admin bar stays in
 * the DOM so the Agent's mounted button still exists for the toolbar's
 * "AI Agent" link to drive — we just hide it via CSS.
 *
 * Render decision: front end + logged in + Extendify's required
 * capability (default manage_options) + the user's core "Show Toolbar
 * when viewing site" preference is on + the user's Toolbar Style
 * setting resolves to "simple". The default style is Launch-aware:
 * 'simple' when the site has finished Launch, 'full' before it.
 */

namespace Extendify\Toolbar;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\PartnerData;

class Frontend
{
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const STYLE_META = 'extendify_toolbar_style';

    public function __construct()
    {
        \add_action('wp_enqueue_scripts', [$this, 'loadScriptsAndStyles']);
        \add_action('wp_body_open', [$this, 'render'], 1);
        \add_action('wp_head', [$this, 'hideCoreAdminBar'], 1);
        // This class is loaded conditionally, so callers often see the false default.
        \add_filter('extendify_simple_toolbar_active', [$this, 'reportActive']);
    }

    /**
     * @param bool $active
     * @return bool
     */
    public function reportActive($active)
    {
        return $active || self::shouldRender();
    }

    /**
     * Resolved style for the current user — 'simple' or 'full'.
     *
     * Honors the per-user setting; falls back to a Launch-aware
     * default when the user hasn't picked one.
     *
     * @param int|null $userId
     * @return string
     */
    public static function style($userId = null)
    {
        $userId = $userId ? (int) $userId : \get_current_user_id();
        if (!$userId) {
            return self::defaultStyle();
        }
        $val = \get_user_meta($userId, self::STYLE_META, true);
        if ($val === 'simple' || $val === 'full') {
            return $val;
        }
        return self::defaultStyle();
    }

    /**
     * The toolbar style the user lands on when they haven't picked
     * one explicitly. Simple after Launch, full before.
     *
     * @return string
     */
    public static function defaultStyle()
    {
        return Config::$launchCompleted ? 'simple' : 'full';
    }

    /**
     * True iff the user has the core "Show Toolbar when viewing
     * site" pref on. We respect it — turning the toolbar off in the
     * core profile setting hides ours too.
     *
     * @param int|null $userId
     * @return bool
     */
    protected static function corePrefOn($userId = null)
    {
        $userId = $userId ? (int) $userId : \get_current_user_id();
        if (!$userId) {
            return false;
        }
        return 'true' === \get_user_option('show_admin_bar_front', $userId);
    }

    /**
     * Whether to render the simple toolbar on this request.
     *
     * @return bool
     */
    public static function shouldRender()
    {
        if (\is_admin() || !\is_user_logged_in() || !\current_user_can(Config::$requiredCapability)) {
            return false;
        }
        // The Customizer preview iframe is a front-end render — the toolbar
        // belongs only on the live, top-level page.
        if (\is_customize_preview()) {
            return false;
        }
        if (!self::corePrefOn()) {
            return false;
        }
        return self::style() === 'simple';
    }

    /**
     * @return void
     */
    public function loadScriptsAndStyles()
    {
        if (!self::shouldRender()) {
            return;
        }

        $version = constant('EXTENDIFY_DEVMODE') ? uniqid() : Config::$version;
        $manifest = Config::$assetManifest;
        $assetKey = 'extendify-toolbar.php';
        $jsKey = 'extendify-toolbar.js';
        $cssKey = 'extendify-toolbar.css';

        if (empty($manifest[$assetKey]) || empty($manifest[$jsKey])) {
            return;
        }

        $scriptAssetPath = EXTENDIFY_PATH . 'public/build/' . $manifest[$assetKey];
        $fallback = ['dependencies' => [], 'version' => $version];
        $scriptAsset = file_exists($scriptAssetPath) ? require $scriptAssetPath : $fallback;

        \wp_enqueue_script(
            Config::$slug . '-toolbar-scripts',
            EXTENDIFY_BASE_URL . 'public/build/' . $manifest[$jsKey],
            $scriptAsset['dependencies'],
            $scriptAsset['version'],
            true
        );

        \wp_set_script_translations(
            Config::$slug . '-toolbar-scripts',
            'extendify-local',
            EXTENDIFY_PATH . 'languages/js'
        );

        if (!empty($manifest[$cssKey])) {
            \wp_enqueue_style(
                Config::$slug . '-toolbar-styles',
                EXTENDIFY_BASE_URL . 'public/build/' . $manifest[$cssKey],
                [],
                $version,
                'all'
            );
        }
    }

    /**
     * Render the toolbar at the top of <body>.
     *
     * @return void
     */
    public function render()
    {
        if (!self::shouldRender()) {
            return;
        }

        $editLink = '';
        $queried = \get_queried_object();
        if ($queried instanceof \WP_Post) {
            $maybe = \get_edit_post_link($queried->ID);
            if ($maybe) {
                $editLink = $maybe;
            }
        }

        // phpcs:disable Generic.Files.LineLength.TooLong -- inline SVG + HTML template markup
        ?>
        <div id="extendify-toolbar" role="navigation" aria-label="<?php \esc_attr_e('Site toolbar', 'extendify-local'); ?>">
            <div class="ext-tb-section ext-tb-left">
                <button type="button" class="ext-tb-btn ext-tb-ai-agent" id="ext-tb-ai-agent" disabled aria-busy="true" aria-label="<?php \esc_attr_e('Open the AI Agent', 'extendify-local'); ?>">
                    <svg class="ext-tb-magic" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                        <path d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z" fill="currentColor"/>
                        <path d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z" fill="currentColor"/>
                        <path d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z" fill="currentColor"/>
                    </svg>
                    <span class="ext-tb-ai-label"><?php \esc_html_e('AI Agent', 'extendify-local'); ?></span>
                </button>
                <?php if (PartnerData::setting('showQuickEdit') || Config::preview('quick-edit')) : ?>
                    <button type="button" class="ext-tb-btn ext-tb-quick-edit" id="ext-tb-quick-edit" role="switch" aria-checked="false">
                        <span class="ext-tb-toggle" aria-hidden="true"><span class="ext-tb-toggle-thumb"></span></span>
                        <span><?php \esc_html_e('Quick Edit', 'extendify-local'); ?></span>
                    </button>
                <?php endif; ?>
            </div>
            <div class="ext-tb-section ext-tb-right">
                <?php if ($editLink) : ?>
                    <a class="ext-tb-btn ext-tb-edit" href="<?php echo \esc_url($editLink); ?>" target="_blank" rel="noopener noreferrer">
                        <svg class="ext-tb-pencil" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                        </svg>
                        <span><?php /* translators: button label linking to the WordPress block editor. */ \esc_html_e('Block Editor', 'extendify-local'); ?></span>
                        <svg class="ext-tb-external" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M7 1.5h3.5V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10.5 1.5L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.5 7v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="screen-reader-text"><?php \esc_html_e('(opens in a new tab)', 'extendify-local'); ?></span>
                    </a>
                <?php endif; ?>
                <a class="ext-tb-btn ext-tb-admin-link" href="<?php echo \esc_url(\admin_url()); ?>" target="_blank" rel="noopener noreferrer">
                    <span><?php \esc_html_e('WP Admin', 'extendify-local'); ?></span>
                    <svg class="ext-tb-external" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                        <path d="M7 1.5h3.5V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10.5 1.5L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9.5 7v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="screen-reader-text"><?php \esc_html_e('(opens in a new tab)', 'extendify-local'); ?></span>
                </a>
                <?php \do_action('extendify_toolbar_right'); ?>
            </div>
        </div>
        <?php
        // phpcs:enable Generic.Files.LineLength.TooLong
    }

    /**
     * Hide the core admin bar visually and keep the top-margin reservation
     * so theme layouts that account for it still flow correctly. We can't
     * unconditionally drop the bar from the DOM — the Agent script mounts
     * its own button into `#wp-admin-bar-extendify-agent-btn`, and the
     * toolbar's "AI Agent" link drives that mounted button at click time.
     *
     * @return void
     */
    public function hideCoreAdminBar()
    {
        if (!self::shouldRender()) {
            return;
        }

        ?>
        <style id="extendify-toolbar-reset">
            #wpadminbar { display: none !important; }
            html { margin-top: 32px !important; }
            * html body { margin-top: 32px !important; }
            @media screen and (max-width: 782px) {
                html { margin-top: 46px !important; }
                * html body { margin-top: 46px !important; }
            }
        </style>
        <?php
    }
}
