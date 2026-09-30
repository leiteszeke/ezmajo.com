<?php

/**
 * Import\Images
 */

namespace Extendify\Shared\Services\Import;

defined('ABSPATH') || die('No direct access.');

/**
 * This class will import external images added to WordPress posts,
 * using our Extendify library.
 */

class ImagesImporter
{
    /**
     * Initialize the class and hook into the publish_post and schedule events action.
     *
     * @return void
     */
    public function __construct()
    {
        // Get the data directly from the database.
        $partnerData = get_option('extendify_partner_data_v2', []);
        // If the setting is not enabled, we do nothing.
        if (! ($partnerData['enableImageImports-1-14-6'] ?? false)) {
            return;
        }

        try {
            $this->dailyImageImportCheck();
            $this->everyTenMinImportCheck();
        } catch (\Exception $e) {} // phpcs:ignore
    }

    /**
     * This checks once a day a bit more thoroughly for images, and
     * will set a signal for the importer to run.
     *
     * @return void
     * @throws \Exception Emits Exception in case of an error.
     */
    public function dailyImageImportCheck()
    {
        if (! \wp_next_scheduled('extendify_daily_import_images_check')) {
            \wp_schedule_event(
                // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp
                (new \DateTime('tomorrow 03:00', wp_timezone()))->getTimestamp(),
                'daily',
                'extendify_daily_import_images_check'
            );
        }

        \add_action('extendify_daily_import_images_check', function () {
            // In this case, we will be doing the import soon.
            if (\get_option('extendify_check_for_image_imports')) {
                return;
            }

            if (Post::countPostsNeedingUpdate()->posts_count > 0) {
                \update_option('extendify_check_for_image_imports', true, false);
            }
        });
    }

    /**
     * This does a cheap, quick check often for images to import,
     * then if found, imports them here.
     *
     * @return void
     */
    public function everyTenMinImportCheck()
    {
        \add_action('init', function () {
            // Create a custom 10 minutes schedule that we use below.
            // phpcs:ignore WordPress.WP.CronInterval -- Verified > 10 min.
            \add_filter('cron_schedules', function ($schedules) {
                $schedules['extendify_every_ten_minutes'] = [
                    'interval' => (10 * MINUTE_IN_SECONDS),
                    'display' => __('Every 10 minutes', 'extendify-local'),
                ];

                return $schedules;
            });

            if (! \wp_next_scheduled('extendify_images_importer_light')) {
                \wp_schedule_event(
                // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp
                    time(),
                    'extendify_every_ten_minutes',
                    'extendify_images_importer_light'
                );
            }
        });

        \add_action('extendify_images_importer_light', function () {
            (new ImagesImporterRunner())->run();
        });
    }
}
