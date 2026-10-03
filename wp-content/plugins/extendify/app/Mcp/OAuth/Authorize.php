<?php

/**
 * The consent screen an OAuth client sends the user to.
 */

namespace Extendify\Mcp\OAuth;

defined('ABSPATH') || die('No direct access.');

use Extendify\Mcp\Allowed;
use Extendify\Mcp\Availability;
use Extendify\Mcp\Grants;
use Extendify\Mcp\Profile;
use Extendify\PartnerData;

/**
 * A hidden wp-admin page, so WordPress's own login does the authenticating.
 *
 * An invalid request is explained here and never redirected: the return
 * address is the thing that could not be trusted.
 */
class Authorize
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    const NONCE = 'extendify_mcp_authorize';

    const APPROVE = 'approve';

    const STYLE = 'extendify-mcp-authorize';
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @return void
     */
    public static function register()
    {
        \add_action('admin_menu', [self::class, 'registerPage']);
        \add_action('admin_init', [self::class, 'handleDecision']);
    }

    /**
     * Open to every signed-in user, so a non-administrator is told who can
     * approve instead of seeing WordPress's "not allowed" page.
     *
     * @return void
     */
    public static function registerPage()
    {
        $hook = \add_submenu_page(
            '',
            \__('Connect an AI assistant', 'extendify-local'),
            \__('Connect an AI assistant', 'extendify-local'),
            'read',
            Metadata::AUTHORIZE_PAGE,
            [self::class, 'renderPage']
        );
        if ($hook) {
            \add_action('load-' . $hook, [self::class, 'clearPage']);
        }
    }

    /**
     * Access is granted here, so no plugin's notice, widget or script may sit beside Approve.
     *
     * @return void
     */
    public static function clearPage()
    {
        $hooks = [
            'admin_notices',
            'all_admin_notices',
            'user_admin_notices',
            'network_admin_notices',
            'in_admin_footer',
            'admin_footer',
        ];
        foreach ($hooks as $hook) {
            \remove_all_actions($hook);
        }

        Profile::quietNotices();
        \add_filter('print_scripts_array', function (array $handles) {
            return self::coreOnly($handles, \wp_scripts());
        });
        \add_filter('print_styles_array', function (array $handles) {
            return self::coreOnly($handles, \wp_styles());
        });
    }

    /**
     * Core registers its assets by site-relative path; a plugin's carry a URL.
     *
     * @param array            $handles  - The handles about to print.
     * @param \WP_Dependencies $registry - The scripts or styles they are registered with.
     * @return array
     */
    private static function coreOnly(array $handles, \WP_Dependencies $registry)
    {
        return array_values(array_filter($handles, function ($handle) use ($registry) {
            if ($handle === self::STYLE) {
                return true;
            }

            $src = $registry->registered[$handle]->src ?? '';

            return is_string($src) && preg_match('#^/wp-(admin|includes)/#', $src) === 1;
        }));
    }

    /**
     * @return void
     */
    public static function handleDecision()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $page = \sanitize_key(\wp_unslash($_GET['page'] ?? ''));
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ($page !== Metadata::AUTHORIZE_PAGE || !isset($_POST['extendify_mcp_decision'])) {
            return;
        }

        // Without the nonce, any page the administrator visits could post an approval as them.
        \check_admin_referer(self::NONCE);
        $decision = \sanitize_key(\wp_unslash($_POST['extendify_mcp_decision']));
        $scope = \sanitize_key(\wp_unslash($_POST['extendify_mcp_scope'] ?? ''));
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validate() accepts nothing it has not checked.
        $params = \wp_unslash($_GET);
        $back = $decision === self::APPROVE ? self::approve($params, $scope) : self::deny($params);
        if (!$back) {
            return;
        }

        // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- The address is the client's own, checked against its document.
        \wp_redirect($back);
        exit;
    }

    /**
     * @return void
     */
    public static function renderPage()
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        self::render(\wp_unslash($_GET));
    }

    /**
     * @param array $params - The authorization request, as sent.
     * @return void
     */
    public static function render(array $params)
    {
        \wp_register_style(self::STYLE, false, [], false);
        \wp_enqueue_style(self::STYLE);
        \wp_add_inline_style(self::STYLE, self::styles());

        echo '<div class="wrap extendify-mcp-wrap extendify-mcp-authorize">';
        Profile::renderBand(
            /* translators: MCP is a protocol name; keep it in English. */
            \__('MCP', 'extendify-local'),
            \__('Connect an AI assistant', 'extendify-local')
        );
        echo '<div class="extendify-mcp-page"><div class="extendify-mcp-consent">';
        self::renderBody($params);
        echo '</div></div></div>';
    }

    /**
     * @param array  $params - The authorization request, as sent.
     * @param string $scope  - The access the user chose.
     * @return string|null - Where to send the client, or null when the request does not stand.
     */
    public static function approve(array $params, $scope)
    {
        $request = self::allowed($params);
        if (!$request) {
            return null;
        }

        $write = $scope === Grants::WRITE && self::writeOffered($request);
        $code = Tokens::mintCode([
            'userId' => \get_current_user_id(),
            'client' => $request['client']['id'],
            'label' => $request['client']['name'],
            'redirectUri' => $request['redirectUri'],
            'codeChallenge' => $request['codeChallenge'],
            'grants' => $write ? Grants::names() : [Grants::READ],
            'offline' => $request['offline'],
            'resource' => Metadata::resource(),
        ]);

        return self::back($request, ['code' => $code]);
    }

    /**
     * @param array $params - The authorization request, as sent.
     * @return string|null - Where to send the client, or null when the request does not stand.
     */
    public static function deny(array $params)
    {
        $request = self::allowed($params);

        return $request ? self::back($request, ['error' => 'access_denied']) : null;
    }

    /**
     * @param array $params - The authorization request, as sent.
     * @return array|null
     */
    private static function allowed(array $params)
    {
        // Without this, any signed-in user could hand an assistant access to the site.
        if (!Availability::live() || !\current_user_can('manage_options')) {
            return null;
        }

        $request = self::validate($params);

        return \is_wp_error($request) ? null : $request;
    }

    /**
     * @param array $params - The authorization request, as sent.
     * @return array|\WP_Error
     */
    private static function validate(array $params)
    {
        $sent = function ($key) use ($params) {
            return is_string($params[$key] ?? null) ? $params[$key] : '';
        };

        if ($sent('response_type') !== 'code') {
            return self::refused(\__('The request from the assistant is incomplete or malformed.', 'extendify-local'));
        }

        $client = Clients::find($sent('client_id'));
        if (!$client) {
            return self::refused(\__(
                'The assistant could not be identified. Its identity document is missing or does not name it.',
                'extendify-local'
            ));
        }

        $redirect = Clients::redirect($client, $sent('redirect_uri'));
        if ($redirect === null) {
            return self::refused(\__(
                'The assistant asked to be sent back to an address it did not register.',
                'extendify-local'
            ));
        }

        $challenge = $sent('code_challenge');
        if ($sent('code_challenge_method') !== 'S256' || !preg_match('/^[A-Za-z0-9._~-]{43,128}$/', $challenge)) {
            return self::refused(\__('The request is missing the code challenge that protects it.', 'extendify-local'));
        }

        if (!Metadata::isResource($sent('resource'))) {
            return self::refused(\__('The request is for a different site or endpoint.', 'extendify-local'));
        }

        return [
            'client' => $client,
            'redirectUri' => $redirect,
            'codeChallenge' => $challenge,
            'state' => $sent('state'),
            'grants' => Grants::fromScope($sent('scope')),
            'offline' => in_array('offline_access', preg_split('/\s+/', trim($sent('scope'))), true),
        ];
    }

    /**
     * @param string $message - What to tell the user.
     * @return \WP_Error
     */
    private static function refused($message)
    {
        return new \WP_Error('extendify_mcp_invalid_request', $message);
    }

    /**
     * @param array $request - The validated request.
     * @return boolean
     */
    private static function writeOffered(array $request)
    {
        return in_array(Grants::WRITE, $request['grants'], true) && Allowed::writable();
    }

    /**
     * @param array $request - The validated request.
     * @param array $answer  - The parameters to send back.
     * @return string
     */
    private static function back(array $request, array $answer)
    {
        $answer['iss'] = Metadata::issuer();
        if ($request['state'] !== '') {
            $answer['state'] = $request['state'];
        }

        // add_query_arg encodes nothing it is handed.
        return \add_query_arg(array_map('rawurlencode', $answer), $request['redirectUri']);
    }

    /**
     * @param array $params - The authorization request, as sent.
     * @return void
     */
    private static function renderBody(array $params)
    {
        if (!Availability::live()) {
            self::renderOff();
            return;
        }

        if (!\current_user_can('manage_options')) {
            printf('<p>%s</p>', \esc_html(sprintf(
                /* translators: %s: the signed-in user's name. */
                \__(
                    'Only an administrator can connect an AI assistant to this site. You are signed in as %s.',
                    'extendify-local'
                ),
                \wp_get_current_user()->display_name
            )));
            return;
        }

        $request = self::validate($params);
        if (\is_wp_error($request)) {
            printf(
                '<div class="notice notice-error inline"><p>%1$s</p></div><p>%2$s</p>',
                \esc_html($request->get_error_message()),
                \esc_html__('Nothing was sent back to the assistant. Try connecting again from it.', 'extendify-local')
            );
            return;
        }

        self::renderConsent($request);
    }

    /**
     * @return void
     */
    private static function renderOff()
    {
        if (!Availability::turnedOff()) {
            echo '<p>'
                . \esc_html__('This site does not offer connections to AI assistants.', 'extendify-local')
                . '</p>';
            return;
        }

        printf('<p>%s</p>', \esc_html__(
            'Connections are turned off for the whole site, so no assistant can connect right now.',
            'extendify-local'
        ));

        if (!\current_user_can('manage_options')) {
            return;
        }

        printf(
            '<p><a class="button" href="%1$s">%2$s</a></p>',
            \esc_url(\admin_url('options-general.php?page=' . Profile::PAGE)),
            \esc_html__('Open MCP settings', 'extendify-local')
        );
    }

    /**
     * @param array $request - The validated request.
     * @return void
     */
    private static function renderConsent(array $request)
    {
        $user = \wp_get_current_user();
        $client = $request['client'];

        printf('<p class="extendify-mcp-ask">%s</p>', \wp_kses(sprintf(
            /* translators: 1: the AI assistant's name. 2: the site's name. 3: the user's name. 4: their username.
               If the grammar needs a case a name can't take, add a word like "site" or "user" before the name. */
            \__('<strong>%1$s</strong> wants to work on %2$s as %3$s (%4$s).', 'extendify-local'),
            \esc_html($client['name']),
            \esc_html(\wp_specialchars_decode(\get_option('blogname'), ENT_QUOTES)),
            \esc_html($user->display_name),
            \esc_html($user->user_login)
        ), ['strong' => []]));

        echo '<form method="post">';
        \wp_nonce_field(self::NONCE);
        self::renderAccess($request);

        printf('<p class="description">%s</p>', \esc_html(sprintf(
            /* translators: %s: a website's host name, such as claude.ai. */
            \__('You will be sent back to %s.', 'extendify-local'),
            (string) \wp_parse_url($request['redirectUri'], PHP_URL_HOST)
        )));

        if (Clients::onThisComputerOnly($client)) {
            printf(
                '<div class="notice notice-warning inline"><p>%1$s %2$s</p></div>',
                \esc_html__(
                    'This assistant runs on your own computer, and any program there could present itself as it.',
                    'extendify-local'
                ),
                \esc_html__('Approve only if you started this from a program you trust.', 'extendify-local')
            );
        }

        printf(
            '<p class="extendify-mcp-decide">'
                . '<button type="submit" class="button button-primary" name="extendify_mcp_decision"'
                . ' value="%1$s">%2$s</button>'
                . '<button type="submit" class="button" name="extendify_mcp_decision" value="deny">%3$s</button>'
                . '</p></form>',
            \esc_attr(self::APPROVE),
            \esc_html__('Approve', 'extendify-local'),
            \esc_html__('Deny', 'extendify-local')
        );
    }

    /**
     * @param array $request - The validated request.
     * @return void
     */
    private static function renderAccess(array $request)
    {
        if (!self::writeOffered($request)) {
            printf('<p class="extendify-mcp-access">%s</p>', \esc_html(Grants::label([Grants::READ])));
            return;
        }

        echo '<fieldset class="extendify-mcp-access"><legend class="screen-reader-text">'
            . \esc_html__('Access', 'extendify-local') . '</legend>';
        foreach ([Grants::READ => [Grants::READ], Grants::WRITE => Grants::names()] as $value => $grants) {
            printf(
                '<label><input type="radio" name="extendify_mcp_scope" value="%1$s"%2$s> %3$s</label>',
                \esc_attr($value),
                $value === Grants::READ ? ' checked' : '',
                \esc_html(Grants::label($grants))
            );
        }

        echo '</fieldset>';
    }

    /**
     * Plugin styles are held off this page, so it sets the partner's colours itself.
     *
     * @return string
     */
    public static function styles()
    {
        $colors = [];
        foreach (PartnerData::cssVariableMapping() as $variable => $value) {
            $colors[] = $variable . ': ' . $value;
        }

        return \wp_strip_all_tags(':root { ' . implode('; ', $colors) . '; }') . '
' . Profile::frameStyles('admin_page_' . Metadata::AUTHORIZE_PAGE) . '
.extendify-mcp-consent { max-width: 480px; margin: var(--wpds-dimension-gap-2xl, 24px) auto 0; padding: 24px;
    background: var(--wpds-color-background-surface-neutral-strong, #fff);
    border: 1px solid var(--wpds-color-stroke-surface-neutral, #dcdcde);
    border-radius: var(--wpds-border-radius-lg, 8px); }
.extendify-mcp-consent > :first-child { margin-top: 0; }
.extendify-mcp-authorize .extendify-mcp-access label { display: block; margin: 6px 0; }
.extendify-mcp-authorize .extendify-mcp-decide { display: flex; gap: 8px; margin: 16px 0 0; }';
    }
}
