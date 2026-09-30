<?php

namespace Extendify\QuickEdit;

defined('ABSPATH') || die('No direct access.');

use Extendify\Agent\Admin;
use Extendify\Config;
use Extendify\PartnerData;
use Extendify\QuickEdit\Controllers\SaveController;
use Extendify\QuickEdit\Controllers\SiteIdentityController;
use Extendify\QuickEdit\Controllers\WCProductController;
use Extendify\QuickEdit\Controllers\WPFormsController;
use Extendify\QuickEdit\Controllers\WPNavigationController;
use Extendify\QuickEdit\Schemas\Registry;
use Extendify\QuickEdit\Services\IdentityTagger;
use Extendify\QuickEdit\Services\MediaTextTagger;
use Extendify\QuickEdit\Services\NavRefTagger;
use Extendify\QuickEdit\Services\TranslatedContext;
use Extendify\QuickEdit\Services\WCProductTagger;
use Extendify\QuickEdit\Services\WPFormsTagger;

class Frontend
{
    public function __construct()
    {
        Registry::init();
        SaveController::init();
        SiteIdentityController::init();
        WCProductController::init();
        WPNavigationController::init();
        WPFormsController::init();
        IdentityTagger::init();
        WCProductTagger::init();
        NavRefTagger::init();
        WPFormsTagger::init();
        MediaTextTagger::init();

        // TagBlocks + TagTemplateParts are initialized by Agent\Admin.
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        // Landing after the agent button's 4 stops admin-bar.js moving it post-paint.
        $beside = Admin::agentPosition() === 'docked-left' ? 5 : 100;
        add_action('admin_bar_menu', [$this, 'registerAdminBar'], $beside);
    }

    /**
     * Whether inline Quick Edit surfaces are enabled for this install —
     * the showQuickEdit partner flag or the matching preview opt-in.
     *
     * @return boolean
     */
    public static function quickEditEnabled(): bool
    {
        return (bool) (PartnerData::setting('showQuickEdit') || Config::preview('quick-edit'));
    }

    public function registerAdminBar($bar)
    {
        if (is_admin() || !is_user_logged_in() || !current_user_can(Config::$requiredCapability)) {
            return;
        }
        if (!self::quickEditEnabled()) {
            return;
        }
        $bar->add_node([
            'id'    => 'extendify-quick-edit-toggle',
            'title' => '<span class="extendify-quick-edit-toggle-pill" aria-hidden="true">'
                . '<span class="extendify-quick-edit-toggle-thumb"></span></span>'
                . '<span class="extendify-quick-edit-toggle-label">'
                . esc_html__('Quick Edit', 'extendify-local')
                . '</span>',
            'href'  => '#',
            'meta'  => [
                'role'       => 'switch',
                'aria-label' => esc_attr__('Quick Edit', 'extendify-local'),
            ],
        ]);
    }

    public function enqueue()
    {
        // The Customizer preview iframe is a front-end render (is_admin() false),
        // so QE would otherwise enqueue and mount inside it — bail before then.
        if (!current_user_can(Config::$requiredCapability) || is_admin() || is_customize_preview()) {
            return;
        }

        $version    = constant('EXTENDIFY_DEVMODE') ? (string) time() : Config::$version;
        $manifest   = Config::$assetManifest;
        $assetMeta  = $manifest['extendify-quick-edit.php'] ?? null;
        $jsFile     = $manifest['extendify-quick-edit.js']  ?? null;
        $cssFile    = $manifest['extendify-quick-edit.css'] ?? null;
        if (!$assetMeta || !$jsFile) {
            return;
        }
        $assetPath = EXTENDIFY_PATH . 'public/build/' . $assetMeta;
        $asset = file_exists($assetPath)
            ? require $assetPath
            : ['dependencies' => [], 'version' => $version];

        $jsHandle = 'extendify-quick-edit';
        // wp-format-library isn't auto-detected — we access wp.formatLibrary
        // at runtime to avoid invalid build-module/* handles.
        $deps = array_merge(
            $asset['dependencies'] ?? [],
            ['wp-format-library']
        );
        wp_enqueue_script(
            $jsHandle,
            EXTENDIFY_BASE_URL . 'public/build/' . $jsFile,
            $deps,
            $asset['version'] ?? $version,
            true
        );
        wp_set_script_translations($jsHandle, 'extendify-local', EXTENDIFY_PATH . 'languages/js');

        if ($cssFile) {
            wp_enqueue_style(
                $jsHandle,
                EXTENDIFY_BASE_URL . 'public/build/' . $cssFile,
                [],
                $asset['version'] ?? $version
            );
        }

        // Required for BlockEditor canvas + toolbar styling.
        wp_enqueue_style('wp-components');
        wp_enqueue_style('wp-block-editor');
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('wp-format-library');
        wp_enqueue_media();

        global $post;
        $sourceForCurrentPost = ($post instanceof \WP_Post)
            ? ['kind' => 'post', 'id' => $post->ID]
            : null;

        $context = ['currentSource' => $sourceForCurrentPost];
        if (function_exists('get_woocommerce_currency_symbol')) {
            // WC returns HTML entities for some currencies (e.g. ₹ as
            // `&#8377;`); the price modal renders it as React text, so
            // decode before shipping.
            $context['currencySymbol'] = html_entity_decode(
                get_woocommerce_currency_symbol(),
                ENT_QUOTES,
                'UTF-8'
            );
        }

        // EXTENDIFY_QUICK_EDIT_DEBUG (wp-config constant) or ?qe-debug=1 turns
        // on selector-layer console traces — used to repro the "second block
        // selected" report without shipping logs in prod builds.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $debug = (defined('EXTENDIFY_QUICK_EDIT_DEBUG') && constant('EXTENDIFY_QUICK_EDIT_DEBUG'))
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            || (isset($_GET['qe-debug']) && $_GET['qe-debug'] === '1');

        // QE off (showQuickEdit) keeps the selector bundle loaded for Ask AI
        // but suppresses every inline-edit surface: no auto-on post-Launch
        // (the agent's Select button is the entry point then) and the
        // hover/keyboard pills gate on quickEditEnabled.
        $quickEditEnabled = self::quickEditEnabled();

        wp_add_inline_script(
            $jsHandle,
            'window.extQuickEditData = ' . wp_json_encode([
                'restRoot' => esc_url_raw(rest_url('extendify/v1')),
                'nonce'    => wp_create_nonce('wp_rest'),
                'schemas'  => Registry::describe(),
                'context'  => $context,
                'translatedContext' => TranslatedContext::detect(),
                'quickEditEnabled' => $quickEditEnabled,
                'defaultOn' => ((bool) constant('EXTENDIFY_DEVMODE') || Config::$launchCompleted) && $quickEditEnabled,
                'debug'     => $debug,
            ]) . ';',
            'before'
        );
    }
}
