<?php

/**
 * Class specifically to update/migrate database values
 * that may have changed over time. Use the version of
 * the plugin that we are migrating from, not the
 * version of the plugin that we are migrating to.
 */

namespace Extendify\Shared\Services;

defined('ABSPATH') || die('No direct access.');

/**
 * Migration class.
 */

class VersionMigrator
{
    /**
     * Initialize the class.
     *
     * @return void
     */
    public function __construct()
    {
        $targetVersion = $this->getVersion();
        $migrationMethods = $this->getMigrationMethods();
        $previousMigrations = get_option('extendify_run_migrations', []);

        foreach ($migrationMethods as $method) {
            $version = $this->extractVersion($method);

            // Stop if we've reached a version beyond our target.
            if (version_compare($version, $targetVersion) > 0) {
                break;
            }

            // Skip if this migration has already been run.
            if (isset($previousMigrations[$version])) {
                continue;
            }

            $this->$method();
            $previousMigrations[$version] = true;
            update_option('extendify_run_migrations', $previousMigrations);
        }//end foreach
    }

    /**
     * This method fixes a math bug in the usage data in the database.
     *
     * @return void
     */
    private function migrate_1_14_2_fixUsageMathBug() // phpcs:ignore
    {
        $normalizeMathBug = function ($number) {
            if (is_int($number)) {
                return $number;
            }

            $count = substr_count((string) $number, '1');
            $subNumbers = substr($number, 0, -$count);
            return ((int) $subNumbers + $count);
        };

        $librarySiteData = get_option('extendify_library_site_data', []);
        $state = ($librarySiteData['state'] ?? []);
        if (!empty($state['totalImports'])) {
            $state['totalImports'] = $normalizeMathBug($state['totalImports']);
            $librarySiteData['state'] = $state;
            update_option('extendify_library_site_data', Sanitizer::sanitizeArray($librarySiteData));
        }

        $toursData = get_option('extendify_assist_tour_progress', []);
        $state = ($toursData['state']['progress'] ?? null);
        if ($state) {
            $state = array_map(function ($progress) use ($normalizeMathBug) {
                $progress['openedCount'] = $normalizeMathBug($progress['openedCount']);
                $progress['closedManuallyCount'] = $normalizeMathBug($progress['closedManuallyCount']);
                $progress['completedCount'] = $normalizeMathBug($progress['completedCount']);
                return $progress;
            }, $state);

            $toursData['state']['progress'] = $state;
            update_option('extendify_assist_tour_progress', Sanitizer::sanitizeArray($toursData));
        }

        // The following all have a property 'count'.
        $normalizeCount = function ($viewed) use ($normalizeMathBug) {
            $viewed['count'] = $normalizeMathBug($viewed['count']);
            return $viewed;
        };

        $kbData = get_option('extendify_assist_support_articles', []);
        $state = ($kbData['state']['viewedArticles'] ?? null);
        if ($state) {
            $kbData['state']['viewedArticles'] = array_map($normalizeCount, $state);
            update_option('extendify_assist_support_articles', Sanitizer::sanitizeArray($kbData));
        }

        // Each of the routers have the same signature.
        foreach (['assist', 'help_center', 'draft'] as $key) {
            $router = get_option("extendify_{$key}_router", []);
            $state = ($router['state']['viewedPages'] ?? null);
            if ($state) {
                $router['state']['viewedPages'] = array_map($normalizeCount, $state);
                update_option("extendify_{$key}_router", Sanitizer::sanitizeArray($router));
            }
        }
    }

    /**
     * Get the plugin version.
     *
     * @return string
     */
    private function getVersion()
    {
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
        $readme = file_get_contents(EXTENDIFY_PATH . 'readme.txt');
        preg_match('/Stable tag: ([0-9.:]+)/', $readme, $matches);
        return ($matches[1] ?? '0.0.0');
    }

    /**
     * Get migration methods.
     *
     * @return array
     */
    private function getMigrationMethods(): array
    {
        $methods = get_class_methods($this);
        $migrationMethods = array_filter($methods, function ($method) {
            return strpos($method, 'migrate_') === 0;
        });
        sort($migrationMethods);

        return $migrationMethods;
    }

    /**
     * Extract version from the method name.
     *
     * @param string $method The method name.
     * @return string
     */
    private function extractVersion($method)
    {
        preg_match('/^migrate_(\d+)_(\d+)_(\d+)/', $method, $matches);
        return $matches ? "{$matches[1]}.{$matches[2]}.{$matches[3]}" : '0.0.0';
    }
}
