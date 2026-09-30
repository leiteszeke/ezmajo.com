<?php
/**
 * Class Affiliate_Banner file.
 *
 * @package CookieYes
 */

namespace CookieYes\Lite\Admin\Modules\Affiliate_Banner;

use CookieYes\Lite\Includes\Modules;
use CookieYes\Lite\Includes\Notice;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles Affiliate Banner REST endpoints and show/dismiss logic.
 *
 * @class   Affiliate_Banner
 * @package CookieYes
 */
class Affiliate_Banner extends Modules {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'cky/v1';

	/**
	 * REST route base.
	 *
	 * @var string
	 */
	protected $rest_base = '/settings/notices/affiliate_banner';

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * Return the singleton instance.
	 *
	 * @return self
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor — passes module ID to parent.
	 */
	public function __construct() {
		parent::__construct( 'affiliate_banner' );
	}

	/**
	 * Initialize the module: register REST routes.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register GET and POST routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			$this->rest_base,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_banner_status' ),
					'permission_callback' => array( $this, 'permission_check' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'dismiss_banner' ),
					'permission_callback' => array( $this, 'permission_check' ),
				),
			)
		);
	}

	/**
	 * GET handler — return whether the affiliate banner should be shown.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_banner_status() {
		$notice = Notice::get_instance();
		$show   = ! $notice->is_dismissed( 'affiliate_banner' );
		return new \WP_REST_Response( array( 'show' => $show ), 200 );
	}

	/**
	 * POST handler — dismiss the affiliate banner.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function dismiss_banner( $request ) {
		$expiry = (int) $request->get_param( 'expiry' );
		$notice = Notice::get_instance();
		$notice->dismiss( 'affiliate_banner', $expiry );
		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Permission check — only users who can manage options.
	 *
	 * @return bool
	 */
	public function permission_check() {
		return current_user_can( 'manage_options' );
	}
}
