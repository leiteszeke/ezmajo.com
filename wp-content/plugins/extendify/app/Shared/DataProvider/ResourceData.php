<?php

/**
 * Cache data.
 */

namespace Extendify\Shared\DataProvider;

defined('ABSPATH') || die('No direct access.');

use Extendify\Assist\Controllers\DomainsSuggestionController;
use Extendify\Assist\Controllers\RecommendationsController;
use Extendify\HelpCenter\Controllers\SupportArticlesController;
use Extendify\Shared\Services\Sanitizer;

/**
 * The cache data class.
 */

class ResourceData
{
    /**
     * Initiate the class.
     *
     * @return void
     */
    public function __construct()
    {
        if (!(is_admin() || defined('DOING_CRON'))) {
            return;
        }

        // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundBeforeLastUsed
        add_action('http_api_curl', function ($handle, $_req, $url) {
            // Allow a longer timeout for this request since it happens in a scheduler.
            if (strpos($url, 'api/domains/suggest') !== false) {
                curl_setopt($handle, CURLOPT_CONNECTTIMEOUT, 150); // phpcs:ignore
                curl_setopt($handle, CURLOPT_TIMEOUT, 150); // phpcs:ignore
            }
        }, 100, 3);
    }

    /**
     * Register the cache schedule.
     *
     * @return void
     */
    public static function scheduleCache()
    {
        \add_action('init', function () {
		        // phpcs:ignore WordPress.WP.CronInterval -- Verified > 30 days.
            \add_filter('cron_schedules', function ($schedules) {
                $schedules['extendify_every_month'] = [
                    'interval' => (30 * DAY_IN_SECONDS), // phpcs:ignore
                    'display' => __('Every month', 'extendify-local'),
                ];
                return $schedules;
            });
        });

        if (! \wp_next_scheduled('extendify_cache_data')) {
            \wp_schedule_event(
                (\current_time('timestamp') + DAY_IN_SECONDS), // phpcs:ignore
                'extendify_every_month',
                'extendify_cache_data'
            );
        }

        \add_action('extendify_cache_data', function () {
            if (!defined('EXTENDIFY_PARTNER_ID')) {
                return;
            }

            $resourceData = new ResourceData();
            $resourceData->cacheData('recommendations', RecommendationsController::fetchRecommendations()->get_data());
            $resourceData->cacheData('supportArticles', SupportArticlesController::fetchArticles()->get_data());
        });

        // For domains, only update when the site title changes.
        \add_action('update_option_blogname', function () {
            if (!defined('EXTENDIFY_PARTNER_ID')) {
                return;
            }

            wp_schedule_single_event(time(), 'extendify_update_domains_cache');
            spawn_cron();
        });

        \add_action('extendify_update_domains_cache', function () {
            if (!defined('EXTENDIFY_PARTNER_ID')) {
                return;
            }

            $data = DomainsSuggestionController::fetchDomainSuggestions()->get_data();
            set_transient('extendify_domains', Sanitizer::sanitizeArray($data));
        });
    }

    /**
     * Return the data.
     *
     * @return array
     */
    public function getData()
    {
        if (!defined('EXTENDIFY_PARTNER_ID')) {
            return [
                'recommendations' => [],
                'supportArticles' => [],
                'domains' => [],
            ];
        }

        $domains = get_transient('extendify_domains');
        if (empty($domains)) {
            wp_schedule_single_event(time(), 'extendify_update_domains_cache');
            spawn_cron();
        }

        return [
            'recommendations' => $this->recommendations(),
            'supportArticles' => $this->supportArticles(),
            // Domains are now cached forever until the site title changes.
            'domains' => is_array($domains) ? $domains : [],
        ];
    }

    /**
     * Return the recommendations. Fetch them if not found (or on a schedule).
     *
     * @return mixed|\WP_REST_Response
     */
    protected function recommendations()
    {
        $recommendations = get_transient('extendify_recommendations');
        if ($recommendations === false) {
            // Fetch these immediately if not found.
            $recommendations = RecommendationsController::fetchRecommendations()->get_data();
            $this->cacheData('recommendations', $recommendations);
        }

        return $recommendations;
    }

    /**
     * Return the support articles. Fetch them if not found (or on a schedule).
     *
     * @return mixed|\WP_REST_Response
     */
    protected function supportArticles()
    {
        $supportArticles = get_transient('extendify_supportArticles');
        if ($supportArticles === false) {
            $supportArticles = SupportArticlesController::fetchArticles()->get_data();
            $this->cacheData('supportArticles', $supportArticles);
        }

        return $supportArticles;
    }

    /**
     * This stores the data as a transient.
     *
     * @param string $functionName The function name that we use in the store.
     * @param array  $data         The extracted data returned from the HTTP request.
     * @return void
     */
    protected function cacheData($functionName, $data)
    {
        // The scheduler runs monthly, one day before the cache expires.
        set_transient(
            'extendify_' . $functionName,
            Sanitizer::sanitizeArray($data),
            (DAY_IN_SECONDS + MONTH_IN_SECONDS)
        );
    }
}
