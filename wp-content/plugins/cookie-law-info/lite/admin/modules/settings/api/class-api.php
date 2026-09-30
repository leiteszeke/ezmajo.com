<?php
/**
 * Class Api file.
 *
 * @package Settings
 */

namespace CookieYes\Lite\Admin\Modules\Settings\Api;

use WP_REST_Server;
use WP_Error;
use stdClass;
use CookieYes\Lite\Includes\Rest_Controller;
use CookieYes\Lite\Admin\Modules\Settings\Includes\Settings;
use CookieYes\Lite\Admin\Modules\Settings\Includes\Controller;
use CookieYes\Lite\Includes\Connect_Notice;
use CookieYes\Lite\Includes\Notice;
use CookieYes\Lite\Includes\Review_Request;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Cookies API
 *
 * @class       Api
 * @version     3.0.0
 * @package     CookieYes
 * @extends     Rest_Controller
 */
class Api extends Rest_Controller {

	/**
	 * Endpoint namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'cky/v1';
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'settings';

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 10 );
	}

	/**
	 * Register a simple POST-only route.
	 *
	 * @param string $endpoint The endpoint path segment.
	 * @param string $callback The callback method name on this class.
	 * @return void
	 */
	private function register_post_route( $endpoint, $callback ) {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/' . $endpoint,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, $callback ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
			)
		);
	}

	/**
	 * Register the routes for cookies.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_endpoint_args_for_item_schema( WP_REST_Server::CREATABLE ),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/laws',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_laws' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/info',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_info' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/sync',
			array(
				'args'   => array(
					'id' => array(
						'description' => __( 'Unique identifier for the resource.', 'cookie-law-info' ),
						'type'        => 'integer',
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'send_items' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => $this->get_endpoint_args_for_item_schema( WP_REST_Server::CREATABLE ),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/notices/(?P<notice>[a-zA-Z0-9-_]+)',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_notice' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/review_action',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'review_action' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => array(
						'action' => array(
							'type'     => 'string',
							'enum'     => array( 'later', 'never', 'review', 'closed' ),
							'required' => true,
						),
					),
				),
			)
		);
		$this->register_post_route( 'disconnect', 'disconnect' );
		$this->register_post_route( 'cache/purge', 'clear_cache' );
		$this->register_post_route( 'expand', 'expand_notice' );
		$this->register_post_route( 'connect_notice', 'update_connect_notice' );
		$this->register_post_route( 'reinstall', 'install_missing_tables' );
		$this->register_post_route( 'apply_filter', 'apply_filter' );
		$this->register_post_route( 'payments', 'add_payments' );
	}
	/**
	 * Get a collection of items.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function get_items( $request ) {
		$object = new Settings();
		$data   = $object->get();
		return rest_ensure_response( $data );
	}
	/**
	 * Create a single cookie or cookie category.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function create_item( $request ) {
		$data    = $this->prepare_item_for_database( $request );
		$context = ! empty( $request['context'] ) ? $request['context'] : 'view';
		$data    = $this->add_additional_fields_to_object( $data, $request );
		$data    = $this->filter_response_by_context( $data, $context );
		return rest_ensure_response( $data );
	}

	/**
	 * Fetch default laws from database
	 *
	 * @param array $request WP_REST_Request $request Full details about the request.
	 * @return array
	 */
	public function get_laws( $request = array() ) {
		$object = array(
			array(
				'slug'        => 'gdpr',
				'title'       => __( 'GDPR (General Data Protection Regulation)', 'cookie-law-info' ),
				'description' => __( 'Continue with the GDPR template if most of your targeted audience are from the EU or UK. It creates a customizable banner that allows your visitors to accept/reject cookies or adjust their consent preferences.', 'cookie-law-info' ),
				'tooltip'     => __(
					'Choose GDPR if most of your targeted audience are from the EU or UK.
					It creates a customizable banner that allows your visitors to accept/reject cookies or adjust their consent preferences.',
					'cookie-law-info'
				),
			),
			array(
				'slug'        => 'ccpa',
				'title'       => __( 'CCPA (California Consumer Privacy Act)', 'cookie-law-info' ),
				'description' => __( 'Choose CCPA if most of your targeted audience are from California or US. This will create a customizable banner with a "Do Not Sell My Personal Information" link that allows your visitors to refuse the use of cookies.', 'cookie-law-info' ),
				'tooltip'     => __(
					'Choose CCPA if most of your targeted audience are from California or US.
					It creates a customizable banner with a "Do Not Sell My Personal Information" link that allows your visitors to refuse the use of cookies.',
					'cookie-law-info'
				),
			),
			array(
				'slug'        => 'info',
				'title'       => __( 'INFO (Information Display Banner)', 'cookie-law-info' ),
				'description' => __( 'Choose INFO if you do not want to block any cookies on your website. This will create a dismissible banner that provides some general information to your site visitors.', 'cookie-law-info' ),
				'tooltip'     => __(
					'Choose Info if you do not want to block any cookies on your website.
						It creates a dismissible banner that provides some general info to your site visitors.',
					'cookie-law-info'
				),
			),
		);
		$data   = $this->prepare_item_for_response( $object, $request );
		return rest_ensure_response( $data );
	}

	/**
	 * Get site info including the features allowed for the current plan.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function get_info( $request ) {
		$args       = array();
		$registered = $this->get_collection_params();
		if ( isset( $registered['force'], $request['force'] ) ) {
			$args['force'] = (bool) $request['force'];
		}
		$response = Controller::get_instance()->get_info( $args );
		if ( empty( $response ) ) {
			$data = array();
		} else {
			$data = $this->prepare_item_for_response( $response, $request );
		}
		$objects = $this->prepare_response_for_collection( $data );
		return rest_ensure_response( $objects );
	}

	/**
	 * Send data directly to CookieYes web app.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function send_items( $request ) {
		$response = Controller::get_instance()->sync();
		if ( empty( $response ) ) {
			$data = array();
		} else {
			$data = $this->prepare_item_for_response( $response, $request );
		}
		$objects = $this->prepare_response_for_collection( $data );
		return rest_ensure_response( $objects );
	}

	/**
	 * Clear cache of all the modules
	 *
	 * @return WP_Error|WP_REST_Response
	 */
	public function clear_cache() {
		$banner_controller   = new \CookieYes\Lite\Admin\Modules\Banners\Includes\Controller();
		$category_controller = new \CookieYes\Lite\Admin\Modules\Cookies\Includes\Category_Controller();
		$cookie_controller   = new \CookieYes\Lite\Admin\Modules\Cookies\Includes\Cookie_Controller();
		$banner_controller->delete_cache();
		$category_controller->delete_cache();
		$cookie_controller->delete_cache();
		wp_cache_flush();
		$data = array( 'status' => true );
		return rest_ensure_response( $data );
	}

	/**
	 * Initiate disconnect request.
	 *
	 * @return WP_Error|WP_REST_Response
	 */
	public function disconnect() {
		$response = Controller::get_instance()->disconnect();
		return rest_ensure_response( $response );
	}

	/**
	 * Add payments/subscription.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function add_payments( $request ) {
		$data = array(
			'currency'            => sanitize_text_field( $request->get_param( 'currency' ) ),
			'is_trial'            => (bool) $request->get_param( 'is_trial' ),
			'is_trial_experiment' => (bool) $request->get_param( 'is_trial_experiment' ),
			'plan_id'             => sanitize_text_field( $request->get_param( 'plan_id' ) ),
			'website_id'          => sanitize_text_field( $request->get_param( 'website_id' ) ),
		);
		$response = Controller::get_instance()->add_payments( $data );
		return rest_ensure_response( $response );
	}

	/**
	 * Apply WordPress filter hook
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function apply_filter( $request ) {
		$filter_name = $request->get_param( 'filter_name' );
		$filter_data = $request->get_param( 'filter_data' );

		if ( empty( $filter_name ) ) {
			return new WP_Error( 'missing_filter_name', __( 'Filter name is required.', 'cookie-law-info' ), array( 'status' => 400 ) );
		}

		$allowed_filters = array( 'cookieyes_cloudways_redirect' );
		if ( ! in_array( $filter_name, $allowed_filters, true ) ) {
			return new WP_Error( 'invalid_filter', __( 'Filter not allowed.', 'cookie-law-info' ), array( 'status' => 400 ) );
		}

		// Apply the WordPress filter
		$result = apply_filters( $filter_name, $filter_data );

		// If filter returns false, it means navigation should be prevented
		$response_data = array(
			'prevent_navigation' => ( $result === false ),
			'filter_result' => $result,
		);

		return rest_ensure_response( $response_data );
	}

	/**
	 * Update the status of admin notices.
	 *
	 * @param object $request Request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function update_notice( $request ) {
		$response = array( 'status' => false );
		$notice   = isset( $request['notice'] ) ? $request['notice'] : false;
		$expiry   = isset( $request['expiry'] ) ? intval( $request['expiry'] ) : 0;
		if ( $notice ) {
			Notice::get_instance()->dismiss( $notice, $expiry );
			$response['status'] = true;
		}
		return rest_ensure_response( $response );
	}

	/**
	 * Update the expand status of connect notice.
	 *
	 * @param object $request Request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function expand_notice( $request ) {
		$response = array( 'status' => false );
		$expand   = isset( $request['expand'] ) ? boolval( $request['expand'] ) : true;

		Connect_Notice::get_instance()->save_state( $expand );
		$response['status'] = true;
		return rest_ensure_response( $response );
	}

	/**
	 * Update the status of connect notice.
	 *
	 * @param object $request Request.
	 * @return WP_Error|WP_REST_Response
	 */

	public function update_connect_notice( $request ) {
		$response = array( 'status' => false );
		$connect_notice = isset( $request['connect_notice'] ) ? boolval( $request['connect_notice'] ) : true;
		Connect_Notice::get_instance()->save_connect_notice( $connect_notice );
		$response['status'] = true;
		return rest_ensure_response( $response );
	}

	/**
	 * Process review notice action (later, never, review, closed).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function review_action( $request ) {
		$action   = $request->get_param( 'action' );
		$success  = Review_Request::process_action( $action );
		return rest_ensure_response( array( 'status' => $success ) );
	}

	/**
	 * Update the status of admin notices.
	 *
	 * @param object $request Request.
	 * @return WP_Error|WP_REST_Response
	 */
	public function install_missing_tables( $request ) {
		$missing_tables = cky_missing_tables();
		if ( count( $missing_tables ) > 0 ) {
			do_action( 'cky_reinstall_tables' );
			do_action( 'cky_clear_cache' );
		}
		return rest_ensure_response( array( 'success' => true ) );
	}

	/**
	 * Format data to provide output to API
	 *
	 * @param object $object Object of the corresponding item Cookie or Cookie_Categories.
	 * @param array  $request Request params.
	 * @return array
	 */
	public function prepare_item_for_response( $object, $request ) {
		$context = ! empty( $request['context'] ) ? $request['context'] : 'view';
		$data    = $this->add_additional_fields_to_object( $object, $request );
		$data    = $this->filter_response_by_context( $data, $context );
		return rest_ensure_response( $data );
	}

	/**
	 * Prepare a single item for create or update.
	 *
	 * @param  WP_REST_Request $request Request object.
	 * @return stdClass
	 */
	public function prepare_item_for_database( $request ) {
		$clear = $request->get_param('clear');
		if ( is_null( $clear ) ) {
			$clear = true;
		} else {
			$clear = filter_var( $clear, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
		}
		$object     = new Settings();
		$data       = $object->get();
		$schema     = $this->get_item_schema();
		$properties = isset( $schema['properties'] ) && is_array( $schema['properties'] ) ? $schema['properties'] : array();
		if ( ! empty( $properties ) ) {
			$properties_keys = array_keys(
				array_filter(
					$properties,
					function( $property ) {
						return isset( $property['readonly'] ) && true === $property['readonly'] ? false : true;
					}
				)
			);
			foreach ( $properties_keys as $key ) {
				$value        = isset( $request[ $key ] ) ? $request[ $key ] : '';
				$data[ $key ] = $value;
			}
		}
		$object->update( $data, $clear );
		return $object->get();
	}

	/**
	 * Get the query params for collections.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		return array(
			'context'  => $this->get_context_param( array( 'default' => 'view' ) ),
			'paged'    => array(
				'description'       => __( 'Current page of the collection.', 'cookie-law-info' ),
				'type'              => 'integer',
				'default'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
				'minimum'           => 1,
			),
			'per_page' => array(
				'description'       => __( 'Maximum number of items to be returned in result set.', 'cookie-law-info' ),
				'type'              => 'integer',
				'default'           => 10,
				'minimum'           => 1,
				'maximum'           => 100,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'search'   => array(
				'description'       => __( 'Limit results to those matching a string.', 'cookie-law-info' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'force'    => array(
				'type'        => 'boolean',
				'description' => __( 'Force fetch data', 'cookie-law-info' ),
			),
		);
	}

	/**
	 * Get the Consent logs's schema, conforming to JSON Schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		$schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'consentlogs',
			'type'       => 'object',
			'properties' => array(
				'id'           => array(
					'description' => __( 'Unique identifier for the resource.', 'cookie-law-info' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
				'site'         => array(
					'description' => __( 'Unique identifier for the resource.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
				'api'          => array(
					'description' => __( 'Language.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
				'account'      => array(
					'description' => __( 'Language.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
				'consent_logs' => array(
					'description' => __( 'Language.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
				'languages'    => array(
					'description' => __( 'Language.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
				'onboarding'   => array(
					'description' => __( 'Language.', 'cookie-law-info' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
				),
			),
		);

		return $this->add_additional_fields_schema( $schema );
	}

} // End the class.
