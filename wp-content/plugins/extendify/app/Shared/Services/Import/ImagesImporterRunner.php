<?php

/**
 * Import\Images Runner
 */

namespace Extendify\Shared\Services\Import;

defined('ABSPATH') || die('No direct access.');

/**
 * This class will handle the actual imports
 */

class ImagesImporterRunner
{
    /**
     * Process posts content to import external images.
     *
     * @return void
     */
    public function run()
    {
        // Return early if conditions are not met for processing images.
        if (
            !\get_option('extendify_check_for_image_imports')
            || \get_transient('extendify_import_images_check_delay')
            || \wp_get_upload_dir()['error']
        ) {
            return;
        }

        // Try to execute set the limit to something that will work forever.
	      // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
        if (strpos(@ini_get('disable_functions'), 'set_time_limit') === false) {
		        // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.NoSilencedErrors.Discouraged
            @set_time_limit(0);
        }

        // Set a marker in the future so we don't check while working.
        $this->delayProcessing(HOUR_IN_SECONDS);

        // Get the posts that we need to update.
        $posts = Post::all();

        if (!$posts) {
            \delete_transient('extendify_import_images_check_delay');
            return;
        }

        // loop over the posts.
        foreach ($posts as $post) {
            // If the post is locked we update the marker to run next hour.
            if (Post::isLocked($post->ID)) {
                $this->delayProcessing(15 * MINUTE_IN_SECONDS);
                continue;
            }

            $updatedBlockContent = (new BlocksUpdater())->getModifiedBlocksInPost($post);
            $status = Post::update($post, $updatedBlockContent);

            // If something went wrong, check again (much) later.
            if (is_wp_error($status)) {
                $this->delayProcessing(6 * HOUR_IN_SECONDS);
            }
        }//end foreach

        // Delete the signal that says there's something to import.
        if (!Post::countPostsNeedingUpdate()->posts_count) {
            \delete_option('extendify_check_for_image_imports');
        }
    }

    /**
     * Sets a marker to delay processing until later.
     *
     * @param mixed $expiration Time until expiration in seconds. Default 86400 (one day).
     *
     * @return void
     */
    public function delayProcessing($expiration)
    {
        \set_transient('extendify_import_images_check_delay', time(), $expiration);
    }
}
