<?php

/**
 * Background jobs for the tool calls that outrun a request.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\PartnerData;

/**
 * A job runs on WP-Cron as the user who started it, one item at a time, and
 * reschedules itself when a host will not extend the request.
 */
class Jobs
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const HOOK = 'extendify_mcp_job';

    const PREFIX = 'extendify_mcp_job_';

    const TTL = DAY_IN_SECONDS;

    /**
     * What a chunk may take when set_time_limit() is refused.
     */
    const BUDGET = 20;

    /**
     * A fatal error mid-step reaches no catch; a job silent this long is failed on read.
     */
    const STALE = 10 * MINUTE_IN_SECONDS;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return void
     */
    public static function register()
    {
        \add_action(self::HOOK, [self::class, 'run']);
    }

    /**
     * @param string  $tool    - The tool the job runs for.
     * @param array   $payload - What each step needs.
     * @param integer $total   - How many steps there are.
     * @return array - What the tool answers the client with.
     */
    public static function start($tool, array $payload, $total)
    {
        $id = \wp_generate_password(12, false, false);
        self::save([
            'id' => $id,
            'tool' => $tool,
            'userId' => \get_current_user_id(),
            'payload' => $payload,
            'status' => 'queued',
            'total' => (int) $total,
            'done' => 0,
            'results' => [],
            'error' => '',
            'updated' => time(),
        ]);
        \wp_schedule_single_event(time(), self::HOOK, [$id]);
        \spawn_cron();

        return [
            'job_id' => $id,
            'status' => 'queued',
            'total' => (int) $total,
            'note' => 'Runs in the background on WP-Cron. Follow it with get_task_status; a job that stays queued'
                . ' means the site\'s cron is not firing, which get_site_health reports.',
        ];
    }

    /**
     * Answers only for the caller's own jobs, so the id needs no secrecy.
     *
     * @param string $id - The job id a tool handed out.
     * @return array|null
     */
    public static function status($id)
    {
        $job = self::record($id);
        if (!$job || $job['userId'] !== \get_current_user_id()) {
            return null;
        }

        return [
            'job_id' => $job['id'],
            'tool' => $job['tool'],
            'status' => $job['status'],
            'total' => $job['total'],
            'done' => $job['done'],
            'results' => $job['results'],
            'error' => $job['error'],
            'updated' => gmdate('c', $job['updated']),
        ];
    }

    /**
     * @param string $id - The job to run or continue.
     * @return void
     */
    public static function run($id)
    {
        $job = self::record($id);
        if (!$job || in_array($job['status'], ['done', 'failed'], true)) {
            return;
        }

        // Without this, a job queued by a demoted administrator would still run with their old rights.
        if (!\user_can($job['userId'], 'manage_options')) {
            self::fail($job, 'The user who started this job can no longer manage the site.');
            return;
        }

        PartnerData::refreshIfStale();
        if (!Availability::live()) {
            self::fail($job, 'Connections are turned off for this site.');
            return;
        }

        \wp_set_current_user($job['userId']);
        $job['status'] = 'running';
        self::save($job);
        Guard::mark();

        try {
            Guard::during(function () use (&$job) {
                self::work($job);
            });
        } catch (Refused $refused) {
            self::fail($job, $refused->getMessage());
            return;
        } catch (\Throwable $failed) {
            self::fail($job, $failed->getMessage());
            return;
        } finally {
            Guard::unmark();
        }

        if ($job['done'] < $job['total']) {
            \wp_schedule_single_event(time(), self::HOOK, [$job['id']]);
            \spawn_cron();
            return;
        }

        $failed = array_filter($job['results'], function ($result) {
            return empty($result['ok']);
        });
        if ($job['results'] && count($failed) === count($job['results'])) {
            self::fail($job, (string) ((array) end($failed))['error'] ?: 'Every step failed.');
            return;
        }

        $job['status'] = 'done';
        self::save($job);
    }

    /**
     * @param array $job - The job, updated in place after every step.
     * @return void
     */
    private static function work(array &$job)
    {
        // An upgrader writes options of its own, and refusing them would abort it half-run.
        Guard::lift();
        $deadline = time() + self::BUDGET;
        while ($job['done'] < $job['total']) {
            // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- A host that forbids it answers with a warning.
            $extended = @set_time_limit(60);
            if (!$extended && time() >= $deadline) {
                return;
            }

            $job['results'][] = Maintenance::step($job['tool'], $job['payload'], $job['done']);
            $job['done']++;
            $job['updated'] = time();
            self::save($job);
        }
    }

    /**
     * @param array  $job     - The job that cannot go on.
     * @param string $message - Why, for the model to read.
     * @return array - The job as saved.
     */
    private static function fail(array $job, $message)
    {
        $job['status'] = 'failed';
        $job['error'] = $message;
        $job['updated'] = time();
        self::save($job);

        return $job;
    }

    /**
     * @param string $id - The job id.
     * @return array|null
     */
    private static function record($id)
    {
        if (!is_string($id) || $id === '') {
            return null;
        }

        $job = \get_transient(self::PREFIX . $id);
        if (!is_array($job)) {
            return null;
        }

        if ($job['status'] === 'running' && $job['updated'] < time() - self::STALE) {
            return self::fail($job, 'The job stopped without finishing. The site\'s error log may say why.');
        }

        return $job;
    }

    /**
     * @param array $job - The job to keep.
     * @return void
     */
    private static function save(array $job)
    {
        \set_transient(self::PREFIX . $job['id'], $job, self::TTL);
    }
}
