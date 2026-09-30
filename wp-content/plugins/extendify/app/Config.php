<?php

/**
 * The App details file
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;

/**
 * Controller for handling various app data
 */

class Config
{
    /**
     * Plugin slug
     *
     * @var string
     */
    public static $slug = 'extendify';

    /**
     * The JS/CSS asset manifest (with hashes)
     *
     * @var array
     */
    public static $assetManifest = [];

    /**
     * Plugin version
     *
     * @var string
     */
    public static $version = '';

    /**
     * Plugin API REST version
     *
     * @var string
     */
    public static $apiVersion = 'v1';

    /**
     * Partner Id
     *
     * @var string|null
     */
    public static $partnerId = null;

    /**
     * Whether to load Launch
     *
     * @var boolean
     */
    public static $showLaunch = false;

    /**
     * Plugin environment
     *
     * @var string
     */
    public static $environment = '';

    /**
     * Host plugin
     *
     * @var string
     */
    public static $requiredCapability = EXTENDIFY_REQUIRED_CAPABILITY;

    /**
     * Plugin config
     *
     * @var array
     */
    public static $config = [];

    /**
     * Whether Launch was finished
     *
     * @var boolean
     */
    public static $launchCompleted = false;

    /**
     * Enabled preview features.
     *
     * @var array
     */
    public static $previewFeatures = [];

    public static $enablePreviewFeatures = false;

    /**
     * Process the readme file to get version and name
     *
     * @return void
     */
    public function __construct()
    {
        self::$partnerId = defined('EXTENDIFY_PARTNER_ID') ? constant('EXTENDIFY_PARTNER_ID') : null;
        $partnerData = PartnerData::getPartnerData();

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
        $readme = file_get_contents(EXTENDIFY_PATH . 'readme.txt');

        preg_match('/Stable tag: ([0-9.:]+)/', $readme, $matches);
        self::$version = $matches[1];

        self::$assetManifest = wp_json_file_decode(
            EXTENDIFY_PATH . 'public/build/manifest.json',
            ['associative' => true]
        );

        if (!get_option('extendify_first_installed_version')) {
            update_option('extendify_first_installed_version', Sanitizer::sanitizeText(self::$version));
        }

        // Set up the Preview features
        // phpcs:ignore WordPress.Security.NonceVerification
        self::handlePreviewUrlOptIn($_GET);

        // An easy way to check if we are in dev mode is to look for a dev specific file.
        $isDev = is_readable(EXTENDIFY_PATH . '.devbuild');

        self::$environment = $isDev ? 'DEVELOPMENT' : 'PRODUCTION';
        self::$launchCompleted = (bool) get_option('extendify_onboarding_completed', false);
        self::$showLaunch = $isDev ? true : ((bool) ($partnerData['showLaunch'] ?? false));
    }

    /**
     * Retrieves the value of a preview setting.
     *
     * This method first checks if the preview setting exists as a static property of the class.
     * If it does, it returns the value of that property. Otherwise, it looks for the
     * preview setting in the saved setting and returns its value if found.
     *
     * @param string $previewKey The key of the preview setting to retrieve.
     *
     * @return boolean The value of the setting if found or false if not found.
     */
    public static function preview(string $previewKey)
    {
        if (self::$environment === 'DEVELOPMENT') {
            return true;
        }

        if (property_exists(self::class, $previewKey)) {
            return self::$previewFeatures[$previewKey];
        }

        $previewFeatures = get_option('extendify_enable_preview_features_v1', []);
        return (bool) ($previewFeatures[$previewKey] ?? false);
    }


    /**
     * Processes preview features from URL parameters and enables them.
     *
     * This method checks for 'extendify-preview' parameters in the GET request
     * and enables the specified preview features. It supports both single feature
     * format (extendify-preview=feature1) and array format (extendify-preview[]=feature1).
     * All specified features are enabled and saved to the database.
     *
     * @param array $getParams The GET parameters that may contain 'extendify-preview' settings.
     *
     * @return void
     */
    protected static function handlePreviewUrlOptIn(array $getParams = [])
    {
        if (!isset($getParams['extendify-preview'])) {
            return;
        }

        $previewParam = $getParams['extendify-preview'];
        $features = is_array($previewParam) ? $previewParam : [$previewParam];
        self::$previewFeatures = get_option('extendify_enable_preview_features_v1', []);

        foreach ($features as $feature) {
            self::$previewFeatures[$feature] = true;
        }

        update_option('extendify_enable_preview_features_v1', Sanitizer::sanitizeArray(self::$previewFeatures));
    }
}
