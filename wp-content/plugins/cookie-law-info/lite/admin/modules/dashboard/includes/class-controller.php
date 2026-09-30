<?php
/**
 * Dashboard controller class.
 *
 * @link       https://www.cookieyes.com/
 * @since      3.0.0
 *
 * @package    CookieYes\Lite\Admin\Modules\Dashboard\Includes
 */

namespace CookieYes\Lite\Admin\Modules\Dashboard\Includes;

use CookieYes\Lite\Integrations\Cookieyes\Includes\Cloud;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dashboard controller class.
 *
 * @class       Controller
 * @version     3.0.0
 * @package     CookieYes
 */
class Controller extends Cloud {

	/**
	 * Instance of the current class
	 *
	 * @var object
	 */
	private static $instance;
	/**
	 * Cookie items
	 *
	 * @var array
	 */
	public $languages;

	/**
	 * Return the current instance of the class
	 *
	 * @return object
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Load data
	 *
	 * @return array
	 */
	public function get_items() {
		$data = array();
		if ( ! $this->get_website_id() ) {
			return $data;
		}
		$response      = $this->get(
			'websites/' . $this->get_website_id() . '/dashboard'
		);
		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $response_code ) {
			$response = json_decode( wp_remote_retrieve_body( $response ), true );
			$stats    = isset( $response['statistics'] ) ? $response['statistics'] : array();
			$data     = array(
				'cookies'    => isset( $stats['total_cookies'] ) ? $stats['total_cookies'] : 0,
				'scripts'    => isset( $stats['total_scripts'] ) ? $stats['total_scripts'] : 0,
				'categories' => isset( $stats['total_categories'] ) ? $stats['total_categories'] : 0,
				'pages'      => isset( $stats['total_pages'] ) ? $stats['total_pages'] : 0,
			);
		}
		return $data;
	}

	public function get_plans() {
		$data = array();
		$this->set_api_url( CKY_APP_URL . '/api/v3/' );
		$response      = $this->get( 'plans' );
		$response_code = wp_remote_retrieve_response_code( $response );
		
		if ( 200 !== $response_code ) {
			return $data;
		}

		$response = json_decode( wp_remote_retrieve_body( $response ), true );
		$response = isset( $response['data'] ) ? $response['data'] : array();

		// Process free plan features
		if ( isset( $response['freePlan']['features'] ) ) {
			$data['plan']['free']['features'] = $response['freePlan']['features'];
		}

		// Process paid plans
		if ( ! isset( $response['paidPlans'] ) || ! is_array( $response['paidPlans'] ) ) {
			return $data;
		}

		// Define plan slug mappings
		$plan_mapping = array(
			'basic-monthly'    => array( 'plan' => 'basic', 'period' => 'monthly' ),
			'basic-yearly'     => array( 'plan' => 'basic', 'period' => 'yearly' ),
			'pro-monthly'      => array( 'plan' => 'pro', 'period' => 'monthly' ),
			'pro-yearly'       => array( 'plan' => 'pro', 'period' => 'yearly' ),
			'ultimate-monthly' => array( 'plan' => 'ultimate', 'period' => 'monthly' ),
			'ultimate-yearly'  => array( 'plan' => 'ultimate', 'period' => 'yearly' ),
		);

		foreach ( $response['paidPlans'] as $plan ) {
			$slug = $plan['slug'] ?? '';
			
			// Skip if slug is not in our mapping
			if ( ! isset( $plan_mapping[ $slug ] ) ) {
				continue;
			}

			$plan_name   = $plan_mapping[ $slug ]['plan'];
			$plan_period = $plan_mapping[ $slug ]['period'];

			// Add features for monthly plans
			if ( 'monthly' === $plan_period && isset( $plan['features'] ) ) {
				$data['plan'][ $plan_name ]['features'] = $plan['features'];
			}

			// Add cost for the period
			if ( isset( $plan['currency'] ) ) {
				$cost = $plan['cost'] ?? '';
				$data['plan'][ $plan_name ][ $plan_period ][ $plan['currency'] ] = $cost;
			}
		}

		return $data;
	}

	public function get_currencies() {
		$data = array();
		$response      = $this->get(
			'currencies'
		);
		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $response_code ) {
			$response = json_decode( wp_remote_retrieve_body( $response ), true );
			if( $response['success'] ) {
				$data = isset( $response['data'] ) ? $response['data'] : array();
			}
		}
		return $data;
	}
}