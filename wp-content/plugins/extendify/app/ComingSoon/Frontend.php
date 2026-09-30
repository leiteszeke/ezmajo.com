<?php

/**
 * Coming Soon page for a site the owner hasn't published yet.
 */

namespace Extendify\ComingSoon;

defined('ABSPATH') || die('No direct access.');

/**
 * This class serves the Coming Soon page in place of any front-end request.
 *
 * Only loaded while the site is hidden, so nothing here rechecks it.
 */

class Frontend
{
    /**
     * REST namespaces that stay open while the site is hidden
     *
     * Empty on purpose: a hidden site answers nothing.
     *
     * @var array
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPEN_NAMESPACES = [];

    /**
     * Index fields a hidden site still exposes, as an allow list because core and plugins keep adding more
     *
     * @var array
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const OPEN_INDEX_FIELDS = ['url', 'home', 'authentication'];

    /**
     * Entry points that load WordPress without ever reaching the template or the REST server
     *
     * @var array
     */
    // phpcs:ignore PSR12.Properties.ConstantVisibility.NotFound -- 7.0 floor: no const visibility
    const CLOSED_SCRIPTS = ['wp-comments-post.php', 'wp-trackback.php'];

    /**
     * Adds various actions to set up the page
     *
     * @return void
     */
    public function __construct()
    {
        // Feeds and robots.txt reach template_redirect before core dispatches them.
        \add_action('template_redirect', [$this, 'maybeRender']);
        \add_action('admin_init', [$this, 'maybeBlockAjax']);
        \add_filter('rest_authentication_errors', [$this, 'guardServedRest']);
        \add_filter('rest_index', [$this, 'maybeTrimRestIndex']);
        \add_filter('wp_sitemaps_is_enabled', '__return_false');
        \add_filter('xmlrpc_enabled', '__return_false');
        // xmlrpc_enabled misses pingback.ping, which reads a post without logging in.
        \add_filter('xmlrpc_methods', '__return_empty_array');
        \add_action('wp_loaded', [$this, 'maybeBlockClosedScripts']);
    }

    /**
     * Arms the REST gate for requests that arrived over HTTP.
     *
     * Core only runs this filter from serve_request, so plugins dispatching
     * internally keep working while the site is hidden.
     *
     * @param \WP_Error|null|true $errors Authentication errors so far.
     * @return \WP_Error|null|true
     */
    public function guardServedRest($errors)
    {
        \add_filter('rest_pre_dispatch', [$this, 'maybeBlockRest'], 10, 3);

        return $errors;
    }

    /**
     * Keeps site content out of the REST API while the site is hidden.
     *
     * @param mixed $result The response to send instead of dispatching.
     * @param \WP_REST_Server $server The server handling the request.
     * @param \WP_REST_Request $request The request being dispatched.
     * @return mixed
     */
    public function maybeBlockRest($result, $server, $request)
    {
        if ($this->isOpenRoute($request->get_route())) {
            return $result;
        }

        return new \WP_Error(
            'extendify_site_unpublished',
            \__('This site is not ready for visitors yet.', 'extendify-local'),
            ['status' => 503]
        );
    }

    /**
     * Whether a REST route still answers while the site is hidden.
     *
     * @param string $route The route being dispatched.
     * @return boolean
     */
    private function isOpenRoute($route)
    {
        $route = trim($route, '/');

        if ($route === '') {
            return true;
        }

        foreach (self::OPEN_NAMESPACES as $namespace) {
            if ($route === $namespace || strpos($route, $namespace . '/') === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Keeps the index from naming the site or inventorying its plugins.
     *
     * @param \WP_REST_Response $response The index response.
     * @return \WP_REST_Response
     */
    public function maybeTrimRestIndex($response)
    {
        $response->set_data(array_intersect_key(
            $response->get_data(),
            array_flip(self::OPEN_INDEX_FIELDS)
        ));

        // The site logo returns through _links even when its field is stripped.
        foreach (array_keys($response->get_links()) as $relation) {
            $response->remove_link($relation);
        }

        return $response;
    }

    /**
     * Keeps site content out of admin-ajax.php while the site is hidden.
     *
     * Other plugins register wp_ajax_nopriv_ handlers that read content, so the
     * gate has to sit in front of the dispatch rather than on any one action.
     *
     * @return void
     */
    public function maybeBlockAjax()
    {
        if (!\wp_doing_ajax()) {
            return;
        }

        \nocache_headers();
        \wp_send_json_error(
            [
                'code' => 'extendify_site_unpublished',
                'message' => \__('This site is not ready for visitors yet.', 'extendify-local'),
            ],
            503
        );
    }

    /**
     * Turns away the comment and trackback endpoints while the site is hidden.
     *
     * wp_loaded runs before either file looks up the post.
     *
     * @return void
     */
    public function maybeBlockClosedScripts()
    {
        if (!in_array($this->currentScript(), self::CLOSED_SCRIPTS, true)) {
            return;
        }

        \nocache_headers();
        \wp_die(
            \esc_html__('This site is not ready for visitors yet.', 'extendify-local'),
            \esc_html__('Coming soon', 'extendify-local'),
            ['response' => 503]
        );
    }

    /**
     * The PHP file handling this request.
     *
     * @return string
     */
    private function currentScript()
    {
        if (!isset($_SERVER['SCRIPT_NAME'])) {
            return '';
        }

        return basename(\sanitize_text_field(\wp_unslash($_SERVER['SCRIPT_NAME'])));
    }

    /**
     * Serves the Coming Soon page instead of whatever was requested.
     *
     * @return void
     */
    public function maybeRender()
    {
        // 503 keeps search engines from indexing the placeholder as the site.
        \status_header(503);
        \nocache_headers();
        $this->pageContent();
        exit;
    }

    /**
     * Coming Soon page output
     *
     * @return void
     */
    private function pageContent()
    {
        $title = \__('Coming soon', 'extendify-local');
        $message = \__('This site is not ready for visitors yet. Please check back soon.', 'extendify-local');
        ?>
        <!DOCTYPE html>
        <html <?php \language_attributes(); ?>>
        <head>
            <meta charset="<?php echo \esc_attr(\get_bloginfo('charset')); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="robots" content="noindex, nofollow">
            <title><?php echo \esc_html($title); ?></title>
            <style>
                body {
                    align-items: center;
                    background: #fff;
                    color: #1e1e1e;
                    display: flex;
                    font-family: system-ui, sans-serif;
                    justify-content: center;
                    margin: 0;
                    min-height: 100vh;
                    padding: 1.5rem;
                    text-align: center;
                }
                h1 {
                    font-size: 1.75rem;
                    margin: 0 0 0.5rem;
                }
                p {
                    margin: 0;
                    opacity: 0.7;
                }
            </style>
        </head>
        <body>
            <main data-test="extendify-coming-soon">
                <h1><?php echo \esc_html($title); ?></h1>
                <p><?php echo \esc_html($message); ?></p>
            </main>
        </body>
        </html>
        <?php
    }
}
