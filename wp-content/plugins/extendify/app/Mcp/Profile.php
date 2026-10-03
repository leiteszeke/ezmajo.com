<?php

/**
 * The MCP settings screen, and the same section on another user's profile.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Mcp\OAuth\Metadata;
use Extendify\PartnerData;

/**
 * Core's profile form wraps this section, so a nested form is not an option.
 */
class Profile
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const PAGE = 'extendify-mcp';

    const STEP_MARKUP = ['strong' => [], 'code' => [], 'a' => ['href' => [], 'target' => [], 'rel' => []]];
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * Settings > MCP connects an outside assistant; our own beside it reads as one of them.
     *
     * @return boolean
     */
    public static function isOwnScreen()
    {
        if (!\is_admin() || !function_exists('get_current_screen')) {
            return false;
        }

        $screen = \get_current_screen();

        return $screen && $screen->id === 'settings_page_' . self::PAGE;
    }

    /**
     * @return void
     */
    public static function register()
    {
        \add_action('admin_menu', [self::class, 'registerPage']);
        \add_action('edit_user_profile', [self::class, 'render']);
        \add_action('admin_init', [self::class, 'handleAction']);
        \add_action('rest_api_init', [self::class, 'registerRoute']);
    }

    /**
     * @return void
     */
    public static function registerPage()
    {
        if (!Availability::offered()) {
            return;
        }

        $hook = \add_options_page(
            /* translators: MCP is a protocol name; keep it in English. */
            \__('MCP', 'extendify-local'),
            /* translators: MCP is a protocol name; keep it in English. */
            \__('MCP', 'extendify-local'),
            'manage_options',
            self::PAGE,
            [self::class, 'renderPage']
        );
        if ($hook) {
            \add_action('load-' . $hook, [self::class, 'quietNotices']);
        }
    }

    /**
     * Update nags and other plugins' notices print over the band and break the layout.
     * Removed just before they print, so one hooked after the page loads goes too.
     *
     * @return void
     */
    public static function quietNotices()
    {
        \add_action('in_admin_header', function () {
            foreach (['admin_notices', 'all_admin_notices', 'user_admin_notices', 'network_admin_notices'] as $hook) {
                \remove_all_actions($hook);
            }
        }, 1000);
    }

    /**
     * @return void
     */
    public static function registerRoute()
    {
        \register_rest_route(Config::$slug . '/' . Config::$apiVersion, '/mcp/connections', [
            'methods' => 'GET',
            'callback' => [self::class, 'connections'],
            'permission_callback' => [self::class, 'mayList'],
            'show_in_index' => false,
        ]);
    }

    /**
     * Anyone else asking would learn when an administrator authorized an assistant.
     *
     * @return boolean
     */
    public static function mayList()
    {
        return Availability::offered() && \current_user_can('manage_options');
    }

    /**
     * @return \WP_REST_Response
     */
    public static function connections()
    {
        return new \WP_REST_Response(Connections::state(\get_current_user_id()));
    }

    /**
     * @return void
     */
    public static function renderPage()
    {
        if (!Availability::offered() || !\current_user_can('manage_options')) {
            return;
        }

        echo '<div class="wrap extendify-mcp-wrap">';
        /* translators: MCP is a protocol name; keep it in English. */
        self::renderBand(\__('MCP', 'extendify-local'), self::intro(true), 'extendify-mcp');
        echo '<div class="extendify-mcp-page">';
        self::renderSection(\get_current_user_id(), false);
        echo '</div></div>';
    }

    /**
     * @param string $title - The page's heading.
     * @param string $intro - A line under the heading, or none.
     * @param string $id    - The heading's id, or none.
     * @return void
     */
    public static function renderBand($title, $intro = '', $id = '')
    {
        echo '<div class="extendify-mcp-band">';
        if (PartnerData::$logo) {
            printf(
                '<img class="extendify-mcp-partner" src="%1$s" alt="%2$s">',
                \esc_url(PartnerData::$logo),
                \esc_attr(PartnerData::$name)
            );
        }

        echo '<div><h1' . ($id !== '' ? ' id="' . \esc_attr($id) . '"' : '') . '>' . \esc_html($title) . '</h1>';
        if ($intro !== '') {
            echo '<p>' . \esc_html($intro) . '</p>';
        }

        echo '</div></div>';
    }

    /**
     * @return void
     */
    public static function handleAction()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $action = \sanitize_key(\wp_unslash($_GET['extendify_mcp_action'] ?? ''));
        if (!in_array($action, ['revoke', 'turn_off', 'turn_on'], true)) {
            return;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $userId = (int) \sanitize_text_field(\wp_unslash($_GET['user_id'] ?? '')) ?: \get_current_user_id();
        // Without the nonce, a link on any page could revoke or switch off connections as the signed-in administrator.
        \check_admin_referer('extendify_mcp_' . $action . '_' . $userId);

        if ($action === 'revoke') {
            self::revokeConnection($userId, \sanitize_key(\wp_unslash($_GET['connection'] ?? '')));
        }

        if ($action === 'turn_off') {
            self::turnSiteOff();
        }

        if ($action === 'turn_on') {
            self::turnSiteOn();
        }

        \wp_safe_redirect(self::screenUrl($userId) . '#extendify-mcp');
        exit;
    }

    /**
     * @return void
     */
    public static function turnSiteOff()
    {
        if (!\current_user_can('manage_options')) {
            return;
        }

        Availability::turnOff(\get_current_user_id());
    }

    /**
     * @return void
     */
    public static function turnSiteOn()
    {
        if (!\current_user_can('manage_options')) {
            return;
        }

        Availability::turnOn();
    }

    /**
     * @param integer $userId - The user the connection belongs to.
     * @param string  $id     - The connection's id.
     * @return void
     */
    public static function revokeConnection($userId, $id)
    {
        // Without this, any signed-in user could end another administrator's connections.
        if (!\current_user_can('edit_user', $userId)) {
            return;
        }

        Connections::revoke($userId, $id);
    }

    /**
     * @param \WP_User $user - The user whose profile is on screen.
     * @return void
     */
    public static function render($user)
    {
        if (!\current_user_can('edit_user', $user->ID) || !Availability::offered()) {
            return;
        }

        if (!\user_can($user->ID, 'manage_options')) {
            return;
        }

        /* translators: heading over the assistants another user has authorized. */
        echo '<h2 id="extendify-mcp">' . \esc_html__('AI assistant connections', 'extendify-local') . '</h2>';
        self::renderSection($user->ID);
    }

    /**
     * @param integer $userId    - The user whose connections to show.
     * @param boolean $withIntro - Whether to print the intro, which the settings screen puts in its heading.
     * @return void
     */
    private static function renderSection($userId, $withIntro = true)
    {
        self::enqueueStyles();

        if (Availability::turnedOff()) {
            self::renderTurnedOff($userId);
            return;
        }

        $isSelf = (int) $userId === \get_current_user_id();

        if ($withIntro) {
            echo '<p class="description">' . \esc_html(self::intro($isSelf)) . '</p>';
        }

        if (!$isSelf) {
            self::renderList($userId);
            return;
        }

        \wp_register_script('extendify-mcp-profile', false, [], false, true);
        \wp_enqueue_script('extendify-mcp-profile');
        \wp_add_inline_script('extendify-mcp-profile', self::script(\get_current_user_id()));

        /* translators: heading over the steps that connect the person's AI assistant to this site; not a sign-in. */
        self::openSection(\__('Connect your AI assistant', 'extendify-local'), 'extendify-mcp');
        self::renderReachability();
        self::renderPicker();
        echo '</div></details>';

        /* translators: heading over the assistants this person has authorized. */
        self::openSection(\__('Your authorized assistants', 'extendify-local'));
        self::renderList($userId);
        echo '</div></details>';
    }

    /**
     * @param string $title - The heading that collapses the section.
     * @param string $class - An extra class for the section's body.
     * @return void
     */
    private static function openSection($title, $class = '')
    {
        printf(
            '<details class="extendify-mcp-section" open><summary>%1$s</summary>'
                . '<div class="%2$s">',
            \esc_html($title),
            \esc_attr(trim('extendify-mcp-section-body ' . $class))
        );
    }

    /**
     * @return void
     */
    private static function enqueueStyles()
    {
        \wp_register_style('extendify-mcp-profile', false, [], false);
        \wp_enqueue_style('extendify-mcp-profile');
        \wp_add_inline_style('extendify-mcp-profile', self::styles());
    }

    /**
     * @param boolean $isSelf - Whether this is the screen the viewer connects from.
     * @return string
     */
    private static function intro($isSelf)
    {
        if (!$isSelf) {
            /* translators: shown to an administrator looking at someone else's profile. */
            return \__(
                'AI assistants this user has authorized. Only they can add new ones, but you can revoke any of them.',
                'extendify-local'
            );
        }

        if (!Allowed::writable()) {
            /* translators: the assistant acts with this person's permissions but cannot change anything. */
            return \__(
                'Connect an AI assistant to your site so it can look things up for you. It cannot change anything.',
                'extendify-local'
            );
        }

        /* translators: the assistant acts with this person's own permissions. */
        return \__('Connect an AI assistant to work on your site.', 'extendify-local');
    }

    /**
     * @return void
     */
    private static function renderReachability()
    {
        $obstacle = Reachability::obstacle();
        if (!$obstacle) {
            return;
        }

        $reasons = [
            /* translators: shown when the site is reachable only inside its own network. */
            'local' => \__(
                'This site needs to be publicly accessible for an AI assistant to connect to it.',
                'extendify-local'
            ),
            /* translators: HTTPS is a protocol name; keep it in English. */
            'http' => \__(
                'This site needs to be served over HTTPS for an AI assistant to connect to it.',
                'extendify-local'
            ),
            /* translators: shown when the whole site sits behind a password prompt. */
            'auth' => \__(
                'Remove the site\'s password protection so an AI assistant can connect to it.',
                'extendify-local'
            ),
            /* translators: names the likely causes when requests from outside never arrive. */
            'blocked' => \__(
                'Outside requests can\'t reach this site. A coming-soon page or security plugin may be blocking them.',
                'extendify-local'
            ),
        ];

        printf('<div class="notice notice-warning inline"><p>%s</p></div>', \esc_html($reasons[$obstacle]));
    }

    /**
     * @return void
     */
    private static function renderPicker()
    {
        $clients = Clients::all();
        $selected = self::selected($clients);

        echo '<div class="extendify-mcp-card"><h2>'
            /* translators: heading over a picker of AI assistants. */
            . \esc_html__('Which assistant are you using?', 'extendify-local') . '</h2>'
            /* translators: under the heading of the AI assistant picker. */
            . '<p class="description">' . \esc_html__(
                'Pick your AI assistant to see how to connect it.',
                'extendify-local'
            ) . '</p>';

        echo '<div class="extendify-mcp-tiles">';
        foreach ($clients as $client) {
            printf(
                '<a class="extendify-mcp-tile" href="%1$s" data-client="%2$s" aria-pressed="%3$s">'
                    . '<span class="extendify-mcp-logo" aria-hidden="true">',
                \esc_url(\add_query_arg('assistant', $client['id'], self::screenUrl(\get_current_user_id()))),
                \esc_attr($client['id']),
                $client['id'] === $selected ? 'true' : 'false'
            );
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG markup, no input.
            echo Clients::logo($client);
            echo '</span><span>' . \esc_html($client['name']) . '</span></a>';
        }

        echo '</div>';

        foreach ($clients as $client) {
            self::renderPanel($client, $client['id'] === $selected);
        }

        echo '</div>';
    }

    /**
     * @param array   $client - One of the Clients entries.
     * @param boolean $open   - Whether this is the one the picker is showing.
     * @return void
     */
    private static function renderPanel(array $client, $open)
    {
        printf(
            '<div class="extendify-mcp-panel" id="extendify-mcp-panel-%1$s" data-client="%1$s"%2$s>',
            \esc_attr($client['id']),
            $open ? '' : ' hidden'
        );

        if (isset($client['gate'])) {
            self::renderGate($client['gate']);
        }

        self::renderSteps($client);
        echo '</div>';
    }

    /**
     * @param array $gate - Its tone and its line.
     * @return void
     */
    private static function renderGate(array $gate)
    {
        printf(
            '<div class="extendify-mcp-gate is-%1$s"><p>%2$s</p></div>',
            \esc_attr($gate['tone']),
            \wp_kses($gate['text'], self::STEP_MARKUP)
        );
    }

    /**
     * @param array $links - The client's buttons, each opening the assistant in a new tab.
     * @return void
     */
    private static function renderLinks(array $links)
    {
        echo '<p class="extendify-mcp-actions">';
        foreach ($links as $link) {
            printf(
                '<a class="button button-compact %1$s" href="%2$s" target="_blank" rel="noopener noreferrer">%3$s'
                    . '<span class="screen-reader-text"> %4$s</span></a>',
                $link['primary'] ? 'button-primary' : '',
                \esc_url($link['url']),
                \esc_html($link['label']),
                /* translators: screen-reader text appended to a link that opens a new tab. */
                \esc_html__('(opens in a new tab)', 'extendify-local')
            );
        }

        echo '</p>';
    }

    /**
     * @param array $client - One of the Clients entries.
     * @return void
     */
    private static function renderSteps(array $client)
    {
        echo '<ol class="extendify-mcp-steps">';
        foreach ($client['steps'] as $step) {
            echo '<li><h4>' . \esc_html($step['title']) . '</h4>';
            self::renderInstructions($step, $client['id']);
            echo '</li>';
        }

        echo '</ol>';
    }

    /**
     * @param array  $block    - A step, or a part of one, with optional text, substeps, links, fields and asides.
     * @param string $clientId - The client the fields are for.
     * @return void
     */
    private static function renderInstructions(array $block, $clientId)
    {
        foreach ((array) ($block['text'] ?? []) as $paragraph) {
            echo '<p class="description">' . \wp_kses($paragraph, self::STEP_MARKUP) . '</p>';
        }

        if (isset($block['substeps'])) {
            echo '<ol class="extendify-mcp-substeps">';
            foreach ($block['substeps'] as $substep) {
                $substep = is_array($substep) ? $substep : ['text' => $substep];
                echo '<li>' . \wp_kses($substep['text'], self::STEP_MARKUP);
                self::renderFields($clientId, $substep['fields'] ?? []);
                echo '</li>';
            }

            echo '</ol>';
        }

        if (isset($block['links'])) {
            self::renderLinks($block['links']);
        }

        self::renderFields($clientId, $block['fields'] ?? []);

        foreach ($block['asides'] ?? [] as $aside) {
            printf('<details class="extendify-mcp-manual"><summary>%s</summary>', \esc_html($aside['summary']));
            self::renderInstructions($aside, $clientId);
            echo '</details>';
        }
    }

    /**
     * @param string $clientId - The client the fields are for.
     * @param array  $fields   - Labels keyed by the value they carry: name, url or prompt.
     * @return void
     */
    private static function renderFields($clientId, array $fields)
    {
        $values = [
            'url' => Metadata::resource(),
            'prompt' => Clients::prompt(),
        ];

        foreach ($fields as $field => $label) {
            if ($label !== '') {
                echo '<p class="extendify-mcp-field">' . \esc_html($label) . '</p>';
            }

            if ($field === 'name') {
                printf(
                    '<p class="description">%s</p>',
                    sprintf(
                        /* translators: %s: this site's name, offered as an example name for the connection. */
                        \esc_html__('Anything you\'ll recognize, like %s.', 'extendify-local'),
                        '<code>' . \esc_html(Clients::siteName()) . '</code>'
                    )
                );
                continue;
            }

            self::renderCopy('extendify-mcp-' . $field . '-' . $clientId, $values[$field], $field === 'prompt');
        }
    }

    /**
     * @param string  $id        - The id the copy button reads the text from.
     * @param string  $text      - The text to copy.
     * @param boolean $multiline - Whether the text is a prompt that wraps rather than a one-line value.
     * @return void
     */
    private static function renderCopy($id, $text, $multiline = false)
    {
        printf(
            $multiline
                ? '<div class="extendify-mcp-copyable"><pre id="%1$s">%2$s</pre>'
                : '<p class="extendify-mcp-address"><code id="%1$s">%2$s</code>',
            \esc_attr($id),
            \esc_html($text)
        );
        printf(
            '<button type="button" class="button button-compact" data-copy="%1$s" data-copied="%2$s">%3$s</button>',
            \esc_attr($id),
            /* translators: button label for two seconds after the text was copied. */
            \esc_attr__('Copied', 'extendify-local'),
            /* translators: button that copies the text beside it. */
            \esc_html__('Copy', 'extendify-local')
        );
        echo $multiline ? '</div>' : '</p>';
    }

    /**
     * @param array $clients - The clients the picker lists.
     * @return string
     */
    private static function selected(array $clients)
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $asked = \sanitize_key(\wp_unslash($_GET['assistant'] ?? ''));

        return in_array($asked, array_column($clients, 'id'), true) ? $asked : $clients[0]['id'];
    }

    /**
     * @param integer $userId - The user whose profile screen this is.
     * @return void
     */
    private static function renderTurnedOff($userId)
    {
        $off = Availability::turnedOff();
        $who = \get_userdata($off['by']);
        $when = self::when($off['at']);

        $notice = $who
            ? sprintf(
                /* translators: 1: a person's name. 2: a date and time. No assistant works until this is undone. */
                \__(
                    '%1$s turned connections off for the whole site on %2$s. None work until they\'re turned back on.',
                    'extendify-local'
                ),
                $who->display_name,
                $when
            )
            : sprintf(
                /* translators: %s: a date and time. No assistant works until this is undone. */
                \__(
                    'Connections were turned off for the whole site on %s. None work until they\'re turned back on.',
                    'extendify-local'
                ),
                $when
            );

        printf('<p class="description">%s</p>', \esc_html($notice));

        if (!\current_user_can('manage_options')) {
            return;
        }

        printf(
            '<p><a class="button" href="%1$s">%2$s</a></p>',
            \esc_url(self::actionUrl('turn_on', $userId)),
            /* translators: button that re-enables connections for the whole site. */
            \esc_html__('Turn connections back on', 'extendify-local')
        );
    }

    /**
     * @param integer $userId - The user whose connections to list.
     * @return void
     */
    private static function renderList($userId)
    {
        $connections = Connections::all($userId);
        if (!$connections) {
            echo '<p class="extendify-mcp-empty">'
                /* translators: empty state under that heading. */
                . \esc_html__('No assistants have been authorized yet.', 'extendify-local') . '</p>';
            return;
        }

        echo '<div class="extendify-mcp-connections">';
        foreach ($connections as $connection) {
            self::renderConnection($userId, $connection);
        }

        echo '</div>';
    }

    /**
     * @param integer $userId     - The user the connection belongs to.
     * @param array   $connection - The connection being listed.
     * @return void
     */
    private static function renderConnection($userId, array $connection)
    {
        /* translators: fallback when an assistant gave no name. */
        $name = $connection['label'] ?: \__('Unnamed assistant', 'extendify-local');
        $stale = !empty($connection['invalidated']);
        $calls = Log::recent($userId, $connection['id']);

        printf('<div class="extendify-mcp-connection%s">', $stale ? ' is-stale' : '');
        printf(
            '<div class="extendify-mcp-who"><span class="extendify-mcp-name">%1$s</span>'
                . '<span class="extendify-mcp-meta">%2$s</span></div>',
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built.
            self::assistantName($name, $connection['client'] ?? ''),
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built.
            implode(' &middot; ', self::summary($connection, (bool) $calls))
        );

        printf(
            '<div class="extendify-mcp-status"><span class="extendify-mcp-pill%1$s">%2$s</span>'
                . '<a class="button button-compact extendify-mcp-revoke" href="%3$s" aria-label="%4$s">%5$s</a></div>',
            $stale ? ' is-stale' : '',
            \esc_html($stale
                /* translators: badge on a connection that no longer works. */
                ? \__('Needs reconnecting', 'extendify-local')
                : Grants::label($connection['grants'])),
            \esc_url(self::actionUrl('revoke', $userId, $connection['id'])),
            /* translators: %s: the assistant's name. */
            \esc_attr(sprintf(\__('Revoke "%s"', 'extendify-local'), $name)),
            /* translators: button that ends an assistant's access. */
            \esc_html__('Revoke', 'extendify-local')
        );

        if ($stale) {
            echo '<p class="extendify-mcp-why">' . \esc_html__(
                /* translators: why a connection stopped working, and the fix.
                   Revoke is the button beside this message; use its label. */
                'This site\'s address or security keys changed, so this connection stopped working. Revoke it and connect the assistant again.', // phpcs:ignore Generic.Files.LineLength.TooLong
                'extendify-local'
            ) . '</p>';
        }

        self::renderActivity($connection, $calls);

        echo '</div>';
    }

    /**
     * @param array $connection - The connection being listed.
     * @param array $calls      - Its newest calls, newest first.
     * @return void
     */
    private static function renderActivity(array $connection, array $calls)
    {
        if (!$calls) {
            return;
        }

        $used = $connection['lastUsed'] ?: strtotime($calls[0]['created_at'] . ' UTC');
        printf(
            '<details class="extendify-mcp-aside extendify-mcp-activity"><summary title="%1$s">%2$s</summary><ul>',
            \esc_attr(self::exactly($used)),
            /* translators: %s: how long ago, such as "2 hours". */
            \esc_html(sprintf(\__('Last used %s ago', 'extendify-local'), \human_time_diff($used)))
        );

        foreach ($calls as $call) {
            $at = strtotime($call['created_at'] . ' UTC');
            printf(
                '<li><span title="%1$s">%2$s</span><code>%3$s</code>%4$s</li>',
                \esc_attr(self::exactly($at)),
                /* translators: %s: how long ago, such as "2 hours". */
                \esc_html(sprintf(\__('%s ago', 'extendify-local'), \human_time_diff($at))),
                \esc_html($call['tool']),
                // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built.
                self::refusal($call)
            );
        }

        echo '</ul></details>';
    }

    /**
     * @param array $call - One row of the log.
     * @return string
     */
    private static function refusal(array $call)
    {
        if ($call['outcome'] === 'ok') {
            return '';
        }

        $why = $call['error']
            ? $call['error']
            : ($call['outcome'] === 'refused'
                /* translators: a tool call this site would not allow. */
                ? \__('Refused', 'extendify-local')
                /* translators: a tool call that ended in an error. */
                : \__('Failed', 'extendify-local'));

        return '<span class="extendify-mcp-refused">' . \esc_html($why) . '</span>';
    }

    /**
     * @param array   $connection - The connection being listed.
     * @param boolean $expandable - Whether a toggle already carries the last-used date.
     * @return array - The metadata line, already escaped, in order.
     */
    private static function summary(array $connection, $expandable)
    {
        $parts = [
            sprintf(
                /* translators: %s: a date. */
                \esc_html__('Authorized %s', 'extendify-local'),
                \esc_html(self::when($connection['created']))
            ),
        ];

        if ($expandable) {
            return $parts;
        }

        $parts[] = $connection['lastUsed']
            ? sprintf(
                '<span title="%1$s">%2$s</span>',
                \esc_attr(self::exactly($connection['lastUsed'])),
                sprintf(
                    /* translators: %s: how long ago, such as "2 hours". */
                    \esc_html__('Last used %s ago', 'extendify-local'),
                    \esc_html(\human_time_diff($connection['lastUsed']))
                )
            )
            /* translators: shown when an assistant has never called this site. */
            : \esc_html__('Never used', 'extendify-local');

        return $parts;
    }

    /**
     * Two connections a person has named the same are told apart by where the client is.
     *
     * @param string $name   - The label the client gave itself.
     * @param string $client - The client id, which is a URL when the client published one.
     * @return string
     */
    private static function assistantName($name, $client)
    {
        if (\wp_parse_url((string) $client, PHP_URL_SCHEME) !== 'https') {
            return \esc_html($name);
        }

        return sprintf(
            '<a href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a>',
            \esc_url($client),
            \esc_html($name)
        );
    }

    /**
     * @param integer $timestamp - A UTC timestamp.
     * @return string
     */
    private static function when($timestamp)
    {
        return (string) \wp_date(\get_option('date_format'), (int) $timestamp);
    }

    /**
     * Two connections used on the same day read as one without the time.
     *
     * @param integer $timestamp - A UTC timestamp.
     * @return string
     */
    private static function exactly($timestamp)
    {
        $format = \get_option('date_format') . ' ' . \get_option('time_format');

        return (string) \wp_date($format, (int) $timestamp);
    }

    /**
     * @param string  $action     - One of the handleAction actions.
     * @param integer $userId     - The user the connection belongs to.
     * @param string  $connection - The connection's id.
     * @return string
     */
    private static function actionUrl($action, $userId, $connection = '')
    {
        $args = ['extendify_mcp_action' => $action, 'user_id' => (int) $userId];
        if ($connection) {
            $args['connection'] = $connection;
        }

        return \wp_nonce_url(
            \add_query_arg($args, self::screenUrl($userId)),
            'extendify_mcp_' . $action . '_' . (int) $userId
        );
    }

    /**
     * @param integer $userId - The user whose profile screen to point at.
     * @return string
     */
    private static function screenUrl($userId)
    {
        return (int) $userId === \get_current_user_id()
            ? \admin_url('options-general.php?page=' . self::PAGE)
            : \add_query_arg('user_id', (int) $userId, \admin_url('user-edit.php'));
    }

    /**
     * @param string $screen - The admin screen's hook suffix, which WordPress puts on the body.
     * @return string
     */
    public static function frameStyles($screen)
    {
        $page = 'body.' . $screen . ' ';

        // Core has no token for the ground its own stage sits on.
        return $page . '{ background: #1e1e1e; }
' . $page . '#wpcontent { padding-left: 0; }
' . $page . '#wpbody-content { padding-bottom: 0; }
' . $page . '#wpfooter { display: none; }
.extendify-mcp-wrap { margin: 0 8px 8px 0; overflow: hidden;
    background: var(--wpds-color-background-surface-neutral-strong, #fff);
    border-radius: var(--wpds-border-radius-xl, 12px);
    min-height: calc(100vh - var(--wp-admin--admin-bar--height, 32px) - 8px); }
/* Partner logos are drawn for their banner colour, and a light one vanishes on white. */
.extendify-mcp-band { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px;
    padding: var(--wpds-dimension-padding-lg, 16px) var(--wpds-dimension-padding-2xl, 24px);
    background: var(--ext-banner-main, transparent);
    color: var(--ext-banner-text, var(--wpds-color-foreground-content-neutral, #1e1e1e));
    border-bottom: 1px solid var(--wpds-color-stroke-surface-neutral-weak, #f0f0f1); }
.extendify-mcp-partner { display: block; flex: none; width: auto; min-width: 156px; max-width: min(208px, 100%);
    height: 40px; object-fit: contain; object-position: left center; }
@media (min-width: 768px) { .extendify-mcp-partner { max-width: min(288px, 100%); } }
.extendify-mcp-band h1 { margin: 0; padding: 0; font-size: var(--wpds-typography-font-size-lg, 15px);
    font-weight: var(--wpds-typography-font-weight-emphasis, 600);
    line-height: var(--wpds-typography-line-height-sm, 20px); color: inherit; }
.extendify-mcp-band p { margin: var(--wpds-dimension-gap-xs, 4px) 0 0; max-width: 62ch;
    font-size: var(--wpds-typography-font-size-md, 13px); color: inherit; opacity: .8; }
.extendify-mcp-band .notice { margin: var(--wpds-dimension-gap-md, 12px) 0 0; }';
    }

    /**
     * @return string
     */
    private static function styles()
    {
        return self::frameStyles('settings_page_' . self::PAGE) . '
.extendify-mcp-page { box-sizing: border-box; max-width: 680px; margin: 0 auto;
    padding: var(--wpds-dimension-padding-2xl, 24px); padding-bottom: 200px; }
.extendify-mcp-section { background: var(--wpds-color-background-surface-neutral-strong, #fff);
    border: 1px solid var(--wpds-color-stroke-surface-neutral, #dcdcde);
    border-radius: var(--wpds-border-radius-lg, 8px); margin: 0 0 16px; }
.extendify-mcp-section > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 20px 24px; cursor: pointer; list-style: none; font-size: 14px; font-weight: 600; color: #1e1e1e; }
.extendify-mcp-section > summary::-webkit-details-marker { display: none; }
.extendify-mcp-section > summary::after { content: ""; flex: none; width: 7px; height: 7px; margin: -4px 4px 0 0;
    border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
.extendify-mcp-section[open] > summary::after { margin-top: 4px; transform: rotate(-135deg); }
.extendify-mcp-section > summary:focus-visible { outline: 2px solid var(--wp-admin-theme-color, #3858e9);
    outline-offset: -2px; border-radius: var(--wpds-border-radius-lg, 8px); }
.extendify-mcp-section-body { padding: 0 24px 24px; }
.extendify-mcp-card { margin: 0 0 20px; }
.extendify-mcp-card h2 { font-size: var(--wpds-typography-font-size-md, 14px);
    font-weight: var(--wpds-typography-font-weight-emphasis, 600); margin: 0; }
.extendify-mcp-card > .description { margin: var(--wpds-dimension-gap-xs, 4px) 0 var(--wpds-dimension-gap-md, 12px); }
.extendify-mcp-address { display: flex; margin: 0; }
.extendify-mcp-address code { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; padding: 6px 10px; border: 1px solid #dcdcde; border-right: 0;
    border-radius: 4px 0 0 4px; background: #f6f7f7; }
.extendify-mcp-address .button { border-radius: 0 4px 4px 0; }
.extendify-mcp-tiles { display: flex; flex-wrap: wrap; gap: 4px;
    padding: 4px; background: var(--wpds-color-background-surface-neutral-weak, #f0f0f1);
    border-radius: var(--wpds-border-radius-lg, 8px); }
.extendify-mcp-tile { display: flex; flex: 1 1 124px; box-sizing: border-box; align-items: center;
    justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 6px; color: #50575e;
    text-decoration: none; font-size: 13px; font-weight: 500; white-space: nowrap; }
.extendify-mcp-tile:hover, .extendify-mcp-tile:focus { background: rgba(255, 255, 255, .6); color: #1e1e1e; }
/* Core sets border-radius: 2px on a:focus, which squares the ring off the tile. */
.extendify-mcp-tile:focus { border-radius: 6px; }
.extendify-mcp-tile[aria-pressed="true"] { background: #fff; color: var(--wp-admin-theme-color, #3858e9);
    font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, .08), 0 0 0 1px rgba(0, 0, 0, .04); }
.extendify-mcp-logo { display: inline-flex; flex: none; width: 18px; height: 18px; color: #1e1e1e; }
.extendify-mcp-logo svg { width: 100%; height: 100%; }
.extendify-mcp-panel { margin-top: 16px; }
.extendify-mcp-gate { margin: 0; }
.extendify-mcp-gate p { margin: 0; }
.extendify-mcp-gate.is-ok { position: relative; padding-left: 22px; color: #1e1e1e; }
.extendify-mcp-gate.is-ok::before { content: ""; position: absolute; left: 4px; top: 3px; width: 5px; height: 9px;
    border: solid #008a20; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.extendify-mcp-gate.is-warn { border-radius: 6px; padding: 8px 10px;
    background: var(--wpds-color-background-surface-caution-weak, #fcf5e6);
    border: 1px solid var(--wpds-color-stroke-surface-caution, #e3cf9a);
    color: var(--wpds-color-foreground-content-caution-weak, #7a5600); }
.extendify-mcp-actions { display: flex; flex-wrap: wrap; gap: var(--wpds-dimension-gap-sm, 8px);
    margin: var(--wpds-dimension-gap-md, 12px) 0 0; }
.extendify-mcp-copyable { display: flex; gap: var(--wpds-dimension-gap-sm, 8px); align-items: flex-start;
    margin-top: var(--wpds-dimension-padding-md, 10px); }
.extendify-mcp-copyable pre { flex: 1 1 auto; min-width: 0; margin: 0; overflow-x: auto;
    background: var(--wpds-color-background-surface-neutral-strong, #fff);
    border: 1px solid var(--wpds-color-stroke-surface-neutral, #dcdcde);
    border-radius: var(--wpds-border-radius-md, 6px);
    padding: var(--wpds-dimension-gap-sm, 8px) var(--wpds-dimension-padding-md, 10px);
    font-family: var(--wpds-typography-font-family-mono, monospace); white-space: pre-wrap; word-break: break-word; }
.extendify-mcp-aside { border-top: 1px solid var(--wpds-color-stroke-surface-neutral, #dcdcde);
    margin-top: var(--wpds-dimension-gap-md, 12px); padding-top: var(--wpds-dimension-padding-md, 10px); }
.extendify-mcp-aside summary, .extendify-mcp-manual summary { cursor: var(--wpds-cursor-control, pointer);
    color: var(--wpds-color-foreground-interactive-brand, #2271b1); }
.extendify-mcp-steps { list-style: none; margin: 16px 0 0; padding: 0; counter-reset: extendify-mcp-step; }
.extendify-mcp-steps > li { position: relative; margin: 0; padding: 16px 0 16px 32px;
    border-top: 1px solid #f0f0f1; counter-increment: extendify-mcp-step; }
.extendify-mcp-steps > li:first-child { padding-top: 0; border-top: 0; }
.extendify-mcp-steps > li::before { content: counter(extendify-mcp-step); position: absolute; left: 0; top: 16px;
    width: 22px; height: 22px; border-radius: 50%; background: #f0f0f1; color: #1e1e1e;
    font-size: 12px; font-weight: 600; line-height: 22px; text-align: center; }
.extendify-mcp-steps > li:first-child::before { top: 0; }
.extendify-mcp-steps h4 { margin: 2px 0 4px; font-size: 14px; font-weight: 600; }
.extendify-mcp-steps p { margin: 4px 0 0; }
.extendify-mcp-manual { margin-top: 10px; }
.extendify-mcp-manual ol, .extendify-mcp-substeps { margin: 8px 0 0 18px; }
.extendify-mcp-substeps li { margin-bottom: 6px; }
.extendify-mcp-steps .extendify-mcp-field { margin: 12px 0 4px; font-size: 12px; font-weight: 500; color: #50575e; }
.extendify-mcp-connections { display: flex; flex-direction: column; gap: var(--wpds-dimension-gap-sm, 8px); }
.extendify-mcp-connection { display: flex; flex-wrap: wrap;
    gap: var(--wpds-dimension-gap-sm, 8px) var(--wpds-dimension-gap-lg, 14px); align-items: center;
    justify-content: space-between; background: var(--wpds-color-background-surface-neutral-strong, #fff);
    border: 1px solid var(--wpds-color-stroke-surface-neutral, #dcdcde);
    border-radius: var(--wpds-border-radius-lg, 8px);
    padding: var(--wpds-dimension-padding-md, 12px) var(--wpds-dimension-padding-lg, 16px); }
.extendify-mcp-connection.is-stale { border-color: var(--wpds-color-stroke-surface-caution, #e3cf9a); }
.extendify-mcp-who { flex: 1 1 320px; min-width: 0; }
.extendify-mcp-name { display: block; font-weight: var(--wpds-typography-font-weight-emphasis, 600); }
.extendify-mcp-meta { display: block; color: var(--wpds-color-foreground-content-neutral-weak, #646970); }
.extendify-mcp-status { display: flex; align-items: center; gap: var(--wpds-dimension-padding-md, 10px); }
.extendify-mcp-pill { background: var(--wpds-color-background-surface-brand, #eef4fa);
    color: var(--wpds-color-foreground-interactive-brand, #135e96); border-radius: 999px;
    padding: 3px var(--wpds-dimension-padding-md, 10px);
    font-size: var(--wpds-typography-font-size-sm, 12px); white-space: nowrap; }
.extendify-mcp-pill.is-stale { background: var(--wpds-color-background-surface-caution-weak, #fcf5e6);
    color: var(--wpds-color-foreground-content-caution-weak, #7a5600); }
.extendify-mcp-revoke { color: var(--wpds-color-foreground-interactive-error, #b32d2e); }
.extendify-mcp-why { flex: 1 1 100%; margin: 0;
    color: var(--wpds-color-foreground-content-caution-weak, #7a5600); }
.extendify-mcp-activity { flex: 1 1 100%;
    border-top-color: var(--wpds-color-stroke-surface-neutral-weak, #f0f0f1);
    margin-top: var(--wpds-dimension-padding-md, 10px); padding-top: var(--wpds-dimension-gap-sm, 8px); }
.extendify-mcp-activity ul { margin: var(--wpds-dimension-gap-sm, 8px) 0 0; }
.extendify-mcp-activity li { display: flex; flex-wrap: wrap;
    gap: var(--wpds-dimension-gap-xs, 4px) var(--wpds-dimension-padding-md, 10px); align-items: baseline;
    padding: var(--wpds-dimension-gap-xs, 4px) 0;
    border-top: 1px solid var(--wpds-color-stroke-surface-neutral-weak, #f0f0f1); }
.extendify-mcp-activity li > span:first-child { flex: 0 0 auto; min-width: 92px;
    color: var(--wpds-color-foreground-content-neutral-weak, #646970); }
.extendify-mcp-refused { min-width: 0; color: var(--wpds-color-foreground-interactive-error, #b32d2e); }
.extendify-mcp-empty { color: var(--wpds-color-foreground-content-neutral-weak, #646970); }
/* Arabic letters render unjoined in the mono font. */
.rtl .extendify-mcp-steps code, .rtl .extendify-mcp-copyable pre { font-family: inherit; }';
    }

    /**
     * Without this, a user who approved on the assistant comes back to an empty list.
     *
     * @param integer $userId - The user whose connections the screen is showing.
     * @return string
     */
    private static function script($userId)
    {
        $state = array_merge(Connections::state($userId), [
            'url' => \rest_url(Config::$slug . '/' . Config::$apiVersion . '/mcp/connections'),
            'nonce' => \wp_create_nonce('wp_rest'),
        ]);
        $state['watching'] = $state['count'] === 0;

        return 'window.extendifyMcpWatch = ' . \wp_json_encode($state) . ";
var watch = window.extendifyMcpWatch;
var deadline = 0;
var timer = null;
var stopWatching = function () {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
};
var check = function () {
    if (Date.now() > deadline) {
        stopWatching();
        return;
    }
    if (document.hidden) {
        return;
    }
    fetch(watch.url, { headers: { 'X-WP-Nonce': watch.nonce }, credentials: 'same-origin' })
        .then(function (response) {
            return response.ok ? response.json() : null;
        })
        .then(function (state) {
            if (!state || (state.count === watch.count && state.newest === watch.newest)) {
                return;
            }
            stopWatching();
            window.location.reload();
        })
        .catch(function () {});
};
var armed = false;
var startWatching = function () {
    armed = true;
    deadline = Date.now() + 120000;
    if (!timer) {
        timer = setInterval(check, 3000);
    }
};
if (watch.watching) {
    startWatching();
}
document.addEventListener('visibilitychange', function () {
    if (document.hidden || !armed) {
        return;
    }
    startWatching();
    check();
});
var copyFrom = function (button) {
    var source = document.getElementById(button.dataset.copy);
    if (!source) {
        return;
    }
    var range = document.createRange();
    range.selectNodeContents(source);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    if (navigator.clipboard) {
        navigator.clipboard.writeText(source.textContent);
    } else {
        document.execCommand('copy');
    }
    var label = button.textContent;
    button.textContent = button.dataset.copied;
    setTimeout(function () {
        button.textContent = label;
    }, 2000);
    startWatching();
};
var show = function (id) {
    var tiles = document.querySelectorAll('.extendify-mcp-tile');
    for (var t = 0; t < tiles.length; t++) {
        tiles[t].setAttribute('aria-pressed', String(tiles[t].dataset.client === id));
    }
    var panels = document.querySelectorAll('.extendify-mcp-panel');
    for (var p = 0; p < panels.length; p++) {
        panels[p].hidden = panels[p].dataset.client !== id;
    }
};
document.addEventListener('click', function (event) {
    var copy = event.target.closest('[data-copy]');
    if (copy) {
        copyFrom(copy);
        return;
    }
    var tile = event.target.closest('.extendify-mcp-tile');
    if (tile) {
        event.preventDefault();
        show(tile.dataset.client);
        window.history.replaceState({}, '', tile.href);
    }
});";
    }
}
