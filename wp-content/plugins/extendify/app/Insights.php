<?php

/**
 * Insights setup
 */

namespace Extendify;

defined('ABSPATH') || die('No direct access.');

use Extendify\Shared\Services\Sanitizer;
use Extendify\PartnerData;

/**
 * Controller for handling various Insights related things.
 * WP code reviewers: This is used in another plugin and not invoked here.
 */

class Insights
{
    /**
     * Option name storing each site's A/B test assignments, keyed by the
     * screen/feature under test (e.g. 'AutoLaunch.HideEnhanceAI').
     *
     * @var string
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const ACTIVE_TESTS_OPTION = 'extendify_active_tests';

    /**
     * Tests the plugin knows how to run. Each is rolled independently against
     * its own rollout percentage, which the partner config supplies.
     *
     * @var string[]
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound
    const AVAILABLE_TESTS = [
        'AutoLaunch.HideEnhanceAI',
        'AutoLaunch.SubmitCreateWebsite',
        'AutoLaunch.DescriptionPlaceholderLaw',
        'AutoLaunch.MigrateScreen',
    ];

    /**
     * Process the readme file to get version and name
     *
     * @return void
     */
    public function __construct()
    {
        // If there isn't a siteId, then create one.
        if (!\get_option('extendify_site_id', false)) {
            \update_option('extendify_site_id', \wp_generate_uuid4());
        }

        if (
            defined('EXTENDIFY_INSIGHTS_URL')
            && class_exists('ExtendifyInsights')
            && !\get_option('extendify_insights_checkedin_once', 0)
        ) {
            \update_option('extendify_insights_checkedin_once', gmdate('Y-m-d H:i:s'));
            // WP code reviewers: This job is defined in another plugin (i.e. it's opt-in).
            \add_action('init', function () {
                // Run this once but wait 10 minutes.
                \wp_schedule_single_event((time() + 10 * MINUTE_IN_SECONDS), 'extendify_insights');
                \spawn_cron();
            });
        }

        $this->filterExternalInsights();
        $this->setupAdminLoginInsights();
    }

    /**
     * Assign A/B variants for the known tests based on the partner's active
     * tests. Each active test is rolled once;
     * inactive tests are dropped.
     *
     * @param string[] $activeTests Active tests in `Name:Percentage` form
     *                              (e.g. 'AutoLaunch.HideEnhanceAI:20'); a bare
     *                              name defaults to a 50% rollout.
     * @return void
     */
    public static function setup(array $activeTests = [])
    {
        $assignments = \get_option(self::ACTIVE_TESTS_OPTION, []);

        $percentages = [];
        foreach ($activeTests as $entry) {
            list($key, $percentage) = array_pad(explode(':', $entry, 2), 2, null);
            $percentages[$key] = is_numeric($percentage) ? (float) $percentage : 50.0;
        }

        foreach (self::AVAILABLE_TESTS as $key) {
            if (!array_key_exists($key, $percentages)) {
                unset($assignments[$key]);
                continue;
            }

            // Roll once so the site keeps the same variant.
            if (!isset($assignments[$key])) {
                $assignments[$key] = [
                    // The percentage is variant B's rollout share: 50 -> 50% A / 50% B,
                    // 20 -> 80% A / 20% B.
                    'variant' => random_int(1, 10000) <= $percentages[$key] * 100 ? 'B' : 'A',
                    'percentage' => $percentages[$key],
                    // ISO 8601 (UTC)
                    'assignedAt' => gmdate('c'),
                ];
            }
        }

        \update_option(self::ACTIVE_TESTS_OPTION, Sanitizer::sanitizeArray($assignments));
    }

    /**
     * Add additional data to the opt-in insights
     *
     * @return void
     */
    public function filterExternalInsights()
    {
        add_filter('extendify_insights_data', function ($data) {
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
            $readme = file_get_contents(EXTENDIFY_PATH . 'readme.txt');
            preg_match('/Stable tag: ([0-9.:]+)/', $readme, $version);

            $insights = array_merge($data, [
                'launch' => Config::$showLaunch,
                'launchRedirectedAt' => \get_option('extendify_attempted_redirect', null),
                'launchLoadedAt' => \get_option('extendify_launch_loaded', null),
                'partner' => defined('EXTENDIFY_PARTNER_ID') ? constant('EXTENDIFY_PARTNER_ID') : null,
                'siteCreatedAt' => SiteSettings::getSiteCreatedAt(),
                'assistRouterData' => \get_option('extendify_assist_router', null),
                'libraryData' => \get_option('extendify_library_site_data', null),
                'draftSettingsData' => \get_option('extendify_draft_settings', null),
                'activity' => \get_option('extendify_shared_activity', null),
                'domainsActivities' => \get_option('extendify_domains_recommendations_activities', null),
                'extendifyVersion' => ($version[1] ?? null),
                'siteProfile' => \get_option('extendify_site_profile', null),
                'pluginSearchTerms' => \get_option('extendify_plugin_search_terms', []),
                'blockSearchTerms' => \get_option('extendify_block_search_terms', []),
                'phpVersion' => PHP_VERSION,
                'themeSearchTerms' => \get_option('extendify_theme_search_terms', []),
                'license' => PartnerData::setting('license'),
                'pagesCount' => $this->getPostsCount('page'),
                'postsCount' => $this->getPostsCount('post'),
                'lastUpdatedPage' => $this->getLastUpdatedPost('page'),
                'lastUpdatedPost' => $this->getLastUpdatedPost('post'),
                'lastLoginAdmin' => $this->getLastAdminLogin(),
                'hasImprint' => $this->hasImprint(),
            ]);
            return $insights;
        });
    }

    /**
     * Get the number of posts/pages
     *
     * @param string $type The type of post/page to get the count for (post or page)
     * @return int The number of posts/pages
     */
    protected function getPostsCount($type = 'post')
    {
        $count = wp_count_posts($type);
        return isset($count->publish) ? (int) $count->publish : 0;
    }

    /**
     * Set up admin login insights to monitor when admin users log in
     *
     * @return void
     */
    protected function setupAdminLoginInsights()
    {
        add_action('wp_login', function ($user_login, $user) {
            // Only get insights for admin users
            if (user_can($user, 'manage_options')) {
                update_user_meta($user->ID, 'extendify_last_login', gmdate('Y-m-d H:i:s'));
            }
        }, 10, 2);
    }

    /**
     * Get the last time a post/page was updated
     *
     * @return string|null The last updated post timestamp or null if no posts found
     */
    protected function getLastUpdatedPost($type = 'post')
    {
        $posts = get_posts([
            'post_type' => $type,
            'post_status' => 'publish',
            'orderby' => 'modified',
            'order' => 'DESC',
            'numberposts' => 1,
            'fields' => 'ids'
        ]);

        if (!empty($posts)) {
            $post = get_post($posts[0]);
            return $post ? $post->post_modified : null;
        }
        return null;
    }

    /**
     * Get the last time an admin user logged in
     *
     * @return string|null The most recent admin login timestamp or null if no data found
     */
    protected function getLastAdminLogin()
    {
        $admins = get_users([
            'role' => 'administrator',
            'meta_key' => 'extendify_last_login',
            'orderby' => 'meta_value',
            'order' => 'DESC',
            'number' => 1
        ]);

        if (!empty($admins)) {
            return get_user_meta($admins[0]->ID, 'extendify_last_login', true);
        }
        return null;
    }

    /**
     * Check if the site has an imprint based on the site profile and language settings
     *
     * @return bool True if the site has an imprint, false otherwise
     */
    protected function hasImprint()
    {
        $siteProfile = \get_option('extendify_site_profile', []);
        if (empty($siteProfile)) {
            return false;
        }

        $imprintLanguages = array_filter(PartnerData::setting('showImprint') ?? [], function ($value) {
            return $value === get_locale();
        });

        return !empty($imprintLanguages) && (strtolower($siteProfile['aiSiteCategory']) === 'business' ||
            strtolower($siteProfile['category']) === 'business');
    }
}
