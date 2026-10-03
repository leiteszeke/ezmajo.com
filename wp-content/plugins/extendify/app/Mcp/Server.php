<?php

/**
 * The site's MCP endpoint.
 */

namespace Extendify\Mcp;

defined('ABSPATH') || die('No direct access.');

use Extendify\Config;
use Extendify\Mcp\OAuth\Metadata;
use Extendify\Mcp\OAuth\Tokens;
use Extendify\PartnerData;

/**
 * Answers JSON-RPC over a single POST route.
 *
 * Two kinds of client are served, told apart per request. A stateless client
 * (2026-07-28) names its protocol version in _meta on every message, opens with
 * server/discover, and is held to the Mcp-* headers. An initialize client
 * (2024-11-05 through 2025-11-25) negotiates a version once with initialize and
 * expects a session; this server never depended on one, so it answers both.
 */
class Server
{
    // phpcs:disable PSR12.Properties.ConstantVisibility.NotFound
    /**
     * Clients that open with initialize. Their differences do not reach a server
     * answering only initialize, tools/list and tools/call.
     */
    const INITIALIZE_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];

    /**
     * Offered to an initialize that asks for a version this server does not speak;
     * the spec wants the newest supported.
     */
    const INITIALIZE_FALLBACK = '2025-11-25';

    /**
     * Clients that name the version in _meta on every request and open with server/discover.
     */
    const STATELESS_VERSIONS = ['2026-07-28'];

    const META = 'io.modelcontextprotocol/';

    /**
     * The tool list moves with the partner config, which is refreshed every ten minutes.
     */
    const LIST_TTL_MS = 300000;
    // phpcs:enable PSR12.Properties.ConstantVisibility.NotFound

    /**
     * @var array|null
     */
    private static $connection = null;

    /**
     * @return void
     */
    public static function register()
    {
        \add_action('rest_api_init', [self::class, 'registerRoute']);
        \add_filter('rest_request_after_callbacks', [self::class, 'challenge'], 10, 3);
        \add_filter('rest_pre_serve_request', [self::class, 'explain'], 10, 4);
    }

    /**
     * @return void
     */
    public static function registerRoute()
    {
        \register_rest_route(Config::$slug . '/' . Config::$apiVersion, '/mcp', [
            'methods' => 'GET, POST, DELETE',
            'callback' => [self::class, 'handle'],
            'permission_callback' => [self::class, 'authorize'],
            'show_in_index' => false,
        ]);
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return true|\WP_Error
     */
    public static function authorize(\WP_REST_Request $request)
    {
        $presented = self::bearer($request) !== null;
        $connection = Tokens::findAccess(self::bearer($request));
        if (!$connection) {
            return self::unauthorized($presented);
        }

        PartnerData::refreshIfStale();
        if (!Availability::live()) {
            return self::unauthorized($presented);
        }

        \wp_set_current_user($connection['userId']);
        if (!\current_user_can('manage_options')) {
            return self::unauthorized($presented);
        }

        self::$connection = $connection;
        Guard::mark();

        return true;
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return string|null
     */
    private static function bearer(\WP_REST_Request $request)
    {
        $sent = (string) $request->get_header('authorization');

        return preg_match('/^Bearer\s+(\S+)$/i', $sent, $found) ? $found[1] : null;
    }

    /**
     * A site with the feature off looks the same as a bad token.
     *
     * @param boolean $presented - Whether the request carried a credential.
     * @return \WP_Error
     */
    private static function unauthorized($presented = false)
    {
        $message = $presented
            ? __(
                'This connection is not valid. Authorize this site again from the assistant that uses it.',
                'extendify-local'
            )
            : __('This address is the MCP endpoint of a WordPress site, not a page to read.', 'extendify-local')
                . ' ' . __(
                    'Add it as a connector in an AI assistant, which will send the site owner here to approve it.',
                    'extendify-local'
                );

        return new \WP_Error('extendify_mcp_unauthorized', $message, ['status' => 401]);
    }

    /**
     * Without this, a browser or a page-fetching model gets JSON it cannot act on.
     *
     * @param boolean          $served  - Whether a body has already been sent.
     * @param mixed            $result  - The response about to be served.
     * @param \WP_REST_Request $request - The incoming request.
     * @param \WP_REST_Server  $server  - The server serving it.
     * @return boolean
     */
    public static function explain($served, $result, $request, $server)
    {
        if ($served || !($result instanceof \WP_REST_Response) || !self::wantsPage($request)) {
            return $served;
        }

        $data = (array) $result->get_data();
        if ($result->get_status() !== 401 || ($data['code'] ?? '') !== 'extendify_mcp_unauthorized') {
            return $served;
        }

        $server->send_header('Content-Type', 'text/html; charset=' . \get_option('blog_charset'));
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped as it is built.
        echo self::page();

        return true;
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return boolean
     */
    private static function wantsPage(\WP_REST_Request $request)
    {
        if (self::bearer($request) !== null) {
            return false;
        }

        return stripos((string) $request->get_header('accept'), 'text/html') !== false;
    }

    /**
     * @return string
     */
    private static function page()
    {
        $title = \__('MCP endpoint', 'extendify-local');

        return '<!DOCTYPE html><html ' . \get_language_attributes() . '><head>'
            . '<meta charset="' . \esc_attr(\get_option('blog_charset')) . '">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="robots" content="noindex">'
            . '<title>' . \esc_html($title) . '</title></head>'
            . '<body style="font: 16px/1.6 system-ui, sans-serif; margin: 3rem auto;'
            . ' max-width: 34rem; padding: 0 1rem;">'
            . '<h1 style="font-size: 1.4rem;">' . \esc_html($title) . '</h1>'
            . '<p>' . \esc_html__(
                'This address is how an AI assistant connects to this site. It is not a page to read.',
                'extendify-local'
            ) . '</p>'
            . '<p>' . \esc_html__(
                'Add it as a connector in your assistant, and the assistant will send you back here to approve it.',
                'extendify-local'
            ) . '</p>'
            . '<p><a href="' . \esc_url(\admin_url('options-general.php?page=' . Profile::PAGE)) . '">'
            . \esc_html__('Manage connections for this site', 'extendify-local')
            . '</a></p></body></html>';
    }

    /**
     * A permission error reaches the client as a body, and only the header can
     * tell it where to authorize.
     *
     * @param mixed            $response - The handler's answer, or the permission error.
     * @param array            $handler  - The matched route handler.
     * @param \WP_REST_Request $request  - The incoming request.
     * @return mixed
     */
    public static function challenge($response, $handler, \WP_REST_Request $request)
    {
        if (!\is_wp_error($response) || $response->get_error_code() !== 'extendify_mcp_unauthorized') {
            return $response;
        }

        $response = \rest_convert_error_to_response($response);
        $response->header('WWW-Authenticate', Metadata::challenge(self::bearer($request) !== null));

        return $response;
    }

    /**
     * @param \WP_REST_Request $request - The incoming request.
     * @return \WP_REST_Response
     */
    public static function handle(\WP_REST_Request $request)
    {
        // The GET event stream and the DELETE session end are optional in the spec.
        if ($request->get_method() !== 'POST') {
            return new \WP_REST_Response(null, 405);
        }

        // A browser sends Origin on a cross-site POST; a page holding the URL could otherwise drive the site.
        $origin = $request->get_header('origin');
        if ($origin !== null && !self::ownOrigin($origin)) {
            return self::error(null, -32600, 'Origin not allowed', 403);
        }

        $message = $request->get_json_params();
        if (!is_array($message) || !isset($message['method'])) {
            return self::error(null, -32600, 'Invalid Request');
        }

        $params = is_array($message['params'] ?? null) ? $message['params'] : [];
        $meta = is_array($params['_meta'] ?? null) ? $params['_meta'] : [];
        $stateless = self::isStateless($meta);
        Connections::touch(self::$connection);

        // A message with no id is a notification and takes no response.
        if (!isset($message['id'])) {
            return new \WP_REST_Response(null, 202);
        }

        $id = $message['id'];
        $refused = $stateless ? self::held($request, $message, $meta) : null;
        if ($refused) {
            return $refused;
        }

        switch ($message['method']) {
            case 'server/discover':
                return self::result($id, self::discover());
            case 'initialize':
                return self::result($id, self::initialize($params));
            case 'ping':
                return self::result($id, []);
            case 'tools/list':
                return self::result($id, [
                    'tools' => Surface::tools(self::$connection['grants']),
                    'ttlMs' => self::LIST_TTL_MS,
                    'cacheScope' => 'private',
                ]);
            case 'tools/call':
                $called = Surface::call($params, self::$connection['grants'], self::$connection);
                return \is_wp_error($called)
                    ? self::error($id, -32602, $called->get_error_message())
                    : self::result($id, $called);
        }

        return self::error($id, -32601, 'Method not found', $stateless ? 404 : 200);
    }

    /**
     * @param array $meta - The message's _meta.
     * @return boolean
     */
    private static function isStateless(array $meta)
    {
        return array_key_exists(self::META . 'protocolVersion', $meta);
    }

    /**
     * The headers mirror the body for intermediaries, so a body they disagree with is refused.
     *
     * @param \WP_REST_Request $request - The incoming request.
     * @param array            $message - The JSON-RPC message.
     * @param array            $meta    - The message's _meta.
     * @return \WP_REST_Response|null - The refusal, or null when the request stands.
     */
    private static function held(\WP_REST_Request $request, array $message, array $meta)
    {
        $id = $message['id'];
        $version = (string) $meta[self::META . 'protocolVersion'];
        $mismatch = self::mismatch($request, 'MCP-Protocol-Version', $version)
            ?: self::mismatch($request, 'Mcp-Method', (string) $message['method']);
        if (!$mismatch && $message['method'] === 'tools/call') {
            $mismatch = self::mismatch($request, 'Mcp-Name', (string) ($message['params']['name'] ?? ''));
        }

        if ($mismatch) {
            return self::error($id, -32020, $mismatch, 400);
        }

        if (!in_array($version, self::STATELESS_VERSIONS, true)) {
            return self::error($id, -32022, 'Unsupported protocol version', 400, [
                'supported' => self::STATELESS_VERSIONS,
                'requested' => $version,
            ]);
        }

        if (!array_key_exists(self::META . 'clientCapabilities', $meta)) {
            return self::error($id, -32602, 'Invalid params: _meta carries no clientCapabilities', 400);
        }

        return null;
    }

    /**
     * @param \WP_REST_Request $request  - The incoming request.
     * @param string           $header   - The header that mirrors a body value.
     * @param string           $expected - The body value it must match.
     * @return string - What went wrong, or an empty string.
     */
    private static function mismatch(\WP_REST_Request $request, $header, $expected)
    {
        $sent = $request->get_header($header);
        if ($sent === null) {
            return sprintf('Header mismatch: %s is missing', $header);
        }

        if (self::decoded($sent) !== $expected) {
            return sprintf('Header mismatch: %s does not match the body', $header);
        }

        return '';
    }

    /**
     * A value that is not plain ASCII travels as =?base64?...?=.
     *
     * @param string $value - The header value as sent.
     * @return string
     */
    private static function decoded($value)
    {
        if (preg_match('/^=\?base64\?(.*)\?=$/', $value, $wrapped)) {
            return (string) base64_decode($wrapped[1], true);
        }

        return $value;
    }

    /**
     * @param string $origin - The Origin header as sent.
     * @return boolean
     */
    private static function ownOrigin($origin)
    {
        $sent = strtolower((string) \wp_parse_url($origin, PHP_URL_HOST));

        return $sent !== '' && $sent === strtolower((string) \wp_parse_url(\home_url(), PHP_URL_HOST));
    }

    /**
     * @return array
     */
    private static function discover()
    {
        return [
            'supportedVersions' => self::STATELESS_VERSIONS,
            'capabilities' => ['tools' => (object) []],
            'ttlMs' => HOUR_IN_SECONDS * 1000,
            'cacheScope' => 'private',
        ];
    }

    /**
     * @param array $params - The initialize params.
     * @return array
     */
    private static function initialize(array $params)
    {
        $asked = (string) ($params['protocolVersion'] ?? '');

        return [
            'protocolVersion' => in_array($asked, self::INITIALIZE_VERSIONS, true) ? $asked : self::INITIALIZE_FALLBACK,
            'capabilities' => ['tools' => (object) []],
            'serverInfo' => self::serverInfo(),
        ];
    }

    /**
     * @return array
     */
    private static function serverInfo()
    {
        $header = \get_file_data(EXTENDIFY_PATH . 'extendify-plugin.php', ['Version' => 'Version']);

        return ['name' => 'extendify-wordpress', 'version' => $header['Version'] ?: '0.0.0'];
    }

    /**
     * An initialize client reads past resultType and _meta; a stateless one requires them.
     *
     * @param mixed $id     - The JSON-RPC request id.
     * @param array $result - The result to send back.
     * @return \WP_REST_Response
     */
    private static function result($id, array $result)
    {
        $result['resultType'] = 'complete';
        $result['_meta'] = [self::META . 'serverInfo' => self::serverInfo()];

        return new \WP_REST_Response(['jsonrpc' => '2.0', 'id' => $id, 'result' => $result]);
    }

    /**
     * @param mixed   $id      - The JSON-RPC request id, or null.
     * @param integer $code    - The JSON-RPC error code.
     * @param string  $message - The error message.
     * @param integer $status  - The HTTP status to send it with.
     * @param mixed   $data    - Error data, if the code defines any.
     * @return \WP_REST_Response
     */
    private static function error($id, $code, $message, $status = 200, $data = null)
    {
        $error = ['code' => $code, 'message' => $message];
        if ($data !== null) {
            $error['data'] = $data;
        }

        return new \WP_REST_Response(['jsonrpc' => '2.0', 'id' => $id, 'error' => $error], $status);
    }
}
