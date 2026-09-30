<?php
/**
 * Class Controller file.
 *
 * @package CookieYes
 */

namespace CookieYes\Lite\Admin\Modules\Settings\Includes;

use CookieYes\Lite\Admin\Modules\Settings\Includes\Settings;
use CookieYes\Lite\Includes\Notice;
use CookieYes\Lite\Integrations\Cookieyes\Includes\Cloud;
use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Handles Cookies Operation
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
	 * Localize common plugin settings.
	 *
	 * @param array $data Data.
	 * @return array
	 */
	public function load_common_settings( $data ) {
		$settings                = new Settings();
		$data['settings']        = $settings->get();
		$data['settings']['url'] = get_site_url();
		return $data;
	}

	/**
	 * Sync data to CookieYes web app.
	 *
	 * @return array
	 */
	public function sync() {
		$settings = new Settings();
		$this->make_auth_request();
		$data     = $this->prepare_data();
		$response = $this->post(
			'websites/' . $this->get_website_id() . '/sync',
			wp_json_encode( $data )
		);

		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $response_code ) {
			return false;
		}

		$response = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! array_key_exists( 'scriptUrl', $response ) ) {
			return false;
		}
		do_action( 'cky_after_connect' );
		return $settings->get();
	}

	/**
	 * This API should be called to disconnect from the web app.
	 *
	 * @return boolean
	 */
	public function disconnect() {
		$settings = new Settings();
		$options  = $settings->get();
		$this->make_auth_request();
		$response      = $this->post(
			'plugin/disconnect',
			wp_json_encode(
				array(
					'website_id' => $settings->get_website_id(),
					'platform'   => 'wordpress',
				)
			)
		);
		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $response_code ) {
			return false;
		}
		$options['api']['token'] = '';
		$settings->update( $options );
		Notice::get_instance()->undismiss( 'affiliate_banner' );
		do_action( 'cky_after_connect' );
		return true;
	}

	/**
	 * Prepare entire data before sending.
	 *
	 * @return array
	 */
	public function prepare_data() {
		$settings = new Settings();
		$data     = array();
		$item     = \CookieYes\Lite\Admin\Modules\Banners\Includes\Controller::get_instance()->get_active_item();
		$banner   = new \CookieYes\Lite\Admin\Modules\Banners\Includes\Banner( $item );
		/** General Settings */
		$data['settings']   = array(
			'plan'       => $settings->get_plan(),
			'domain'     => home_url(),
			'consentLog' => array(
				'status' => true,
			),
		);
		$data['categories'] = $this->prepare_cookies();
		$data['banners']    = $this->prepare_banners();
		return $data;
	}

	/**
	 * Prepare and format cookies prior to syncing.
	 *
	 * @return array
	 */
	public function prepare_cookies() {
		$data  = array();
		$items = \CookieYes\Lite\Admin\Modules\Cookies\Includes\Category_Controller::get_instance()->get_items();

		foreach ( $items as $item ) {
			$object = new \CookieYes\Lite\Admin\Modules\Cookies\Includes\Cookie_Categories( $item );
			$data[] = array(
				'name'            => $object->get_name(),
				'description'     => $object->get_description(),
				'slug'            => $object->get_slug(),
				'isNecessaryLike' => 'necessary' === $object->get_slug() ? true : false,
				'active'          => $object->get_visibility(),
				'defaultConsent'  => array(
					'gdpr' => $object->get_slug() === 'necessary' ? true : $object->get_prior_consent(),
					'ccpa' => $object->get_sell_personal_data() === true && $object->get_slug() !== 'necessary' ? false : true,
				),
				'cookies'         => $this->get_cookies( $object->get_id() ),
			);
		}
		return $data;
	}

	/**
	 * Get cookies by category
	 *
	 * @param string $category Category slug.
	 * @return array
	 */
	public function get_cookies( $category = '' ) {
		$data  = array();
		$items = \CookieYes\Lite\Admin\Modules\Cookies\Includes\Cookie_Controller::get_instance()->get_items_by_category( $category );
		foreach ( $items as $item ) {
			$object = new \CookieYes\Lite\Admin\Modules\Cookies\Includes\Cookie( $item );
			$data[] = array(
				'cookie_id'   => $object->get_name(),
				'type'        => $object->get_type(),
				'domain'      => $object->get_domain(),
				'duration'    => $object->get_duration(),
				'description' => $object->get_description(),
				'website_id'  => $this->get_website_id(),
				'provider'    => $object->get_url_pattern(),
			);

		}
		return $data;
	}

	/**
	 * Prepare and format banners prior to sync.
	 *
	 * @return array
	 */
	public function prepare_banners() {
		$items   = \CookieYes\Lite\Admin\Modules\Banners\Includes\Controller::get_instance()->get_items();
		$banners = array();
		foreach ( $items as $item ) {
			$object                                    = new \CookieYes\Lite\Admin\Modules\Banners\Includes\Banner( $item );
			$banner                                    = array(
				'id'      => $object->get_id(),
				'name'    => $object->get_name(),
				'slug'    => $object->get_slug(),
				'default' => $object->get_default(),
				'status'  => ( true === $object->get_status() ? 'active' : 'inactive' ),
			);
			$data                                      = array_merge( $banner, array_merge( $object->get_settings(), array( 'content' => $object->get_contents() ) ) );
			$data['settings']['languages']['selected'] = cky_selected_languages();
			$data['settings']['languages']['default']  = cky_default_language();

			$data['settings']['ruleSet'] = array(
				array(
					'code'    => 'ALL',
					'regions' => array(),
				),
			);

			$banners[] = $data;
		}
		return $banners;
	}

	/**
	 *  Fetch site info from either locally or from API.
	 *
	 * When the request is not a REST (cloud) call but the site is connected,
	 * load plan data from the web app so admin contexts (e.g. plugin action links)
	 * match behaviour that relies on `get_info()` (see Vue admin).
	 *
	 * @param array $args Array of arguments.
	 * @return array|\WP_Error
	 */
	public function get_info( $args = array() ) {
		if ( cky_is_cloud_request() ) {
			return $this->get_app_info( $args );
		}
		$settings = new Settings();
		if ( $settings->is_connected() && $this->get_website_id() ) {
			$data = $this->get_app_info( $args );
			if ( ! is_wp_error( $data ) ) {
				return $data;
			}
		}
		return $this->get_site_info( $args );
	}

	/**
	 *  Get the current plan details and features list from a local DB.
	 *
	 * @param array $args Array of arguments.
	 * @return array
	 */
	public function get_site_info( $args = array() ) {
		return $this->get_default();
	}

	/**
	 * Get default site info.
	 *
	 * @return array
	 */
	public function get_default() {
		$settings = new Settings();
		return array(
			'id'             => '',
			'url'            => get_site_url(),
			'plan'           => array(
				'id'          => '',
				'slug'        => 'free',
				'name'        => __( 'Free', 'cookie-law-info' ),
				'description' => __( 'Free Plan', 'cookie-law-info' ),
				'scan_limit'  => '100',
				'log_limit'   => 5000,
				'features'    => array(
					'multi_law'         => false,
					'custom_css'        => false,
					'custom_branding'   => false,
					'config_geo_rules'  => false,
					'max_free_websites' => 1,
					'remove_powered_by' => false,
					'popup_layout'      => false,
				),
			),
			'banners'        => array(
				'status' => \CookieYes\Lite\Admin\Modules\Banners\Includes\Controller::get_instance()->check_status(),
			),
			'consent_logs'   => array(
				'status' => $settings->get_consent_log_status(),
			),
			'scans'          => array(
				'date'   => '',
				'status' => false,
			),
			'languages'      => array(
				'default' => $settings->get_default_language(),
			),
			'tables_missing' => count( cky_missing_tables() ) > 0 ? true : false,
		);
	}

	/**
	 * Check API before initializing the plugin.
	 *
	 * @return void
	 */
	public function check_api() {
		if ( ! cky_is_cloud_request() ) {
			return;
		}
		$response = $this->get_app_info();
		if ( is_wp_error( $response ) ) {
			return;
		}
		$this->maybe_update_settings( $response );
	}

	/**
	 * Maybe update the plugin settings if required.
	 *
	 * @param array $response Response from the web app.
	 * @return void
	 */
	public function maybe_update_settings( $response ) {
		$settings             = new Settings();
		$data                 = $settings->get();
		$data['consent_logs'] = isset( $response['consent_logs'] ) ? $response['consent_logs'] : array();
		$data['languages']    = isset( $response['languages'] ) ? $response['languages'] : array();
		update_option( 'cky_settings', $data );
	}

	/**
	 * Load site info from the web app.
	 *
	 * @param array $args Array of arguments.
	 * @return array
	 */
	public function get_app_info( $args = array() ) {
		$data = array();
		if ( ! $this->get_website_id() ) {
			return new WP_Error(
				'cky_invalid_website_id',
				__( 'Invalid Website ID', 'cookie-law-info' ),
				array( 'status' => 404 )
			);

		}
		$response      = $this->get(
			'websites/' . $this->get_website_id()
		);
		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $response_code ) {
			$response        = json_decode( wp_remote_retrieve_body( $response ), true );

			$user            = isset( $response['user'] ) ? $response['user'] : array();
			$plan            = isset( $response['websiteplan'] ) ? $response['websiteplan'] : array();
			$features        = isset( $plan['features'] ) ? $plan['features'] : array();
			$scan_timestamp  = isset( $response['last_scan_at'] ) ? strtotime( sanitize_text_field( $response['last_scan_at'] ) ) : false;
			$scan_success_timestamp  = isset( $response['last_successful_scan_at'] ) ? strtotime( sanitize_text_field( $response['last_successful_scan_at'] ) ) : false;
			$date            = isset( $scan_timestamp ) && is_int( $scan_timestamp ) ? gmdate( 'd M Y', $scan_timestamp ) : '';
			$time            = isset( $scan_timestamp ) && is_int( $scan_timestamp ) ? gmdate( 'H:i:s', $scan_timestamp ) : '';
			$success_date            = isset( $scan_success_timestamp ) && is_int( $scan_success_timestamp ) ? gmdate( 'd M Y', $scan_success_timestamp ) : '';
			$success_time            = isset( $scan_success_timestamp ) && is_int( $scan_success_timestamp ) ? gmdate( 'H:i:s', $scan_success_timestamp ) : '';
			$trial_ends_at = isset( $response['trial_ends_at'] ) ? strtotime( sanitize_text_field( $response['trial_ends_at'] ) ) : false;
			$trial_ends_at_date = isset( $trial_ends_at ) && is_int( $trial_ends_at ) ? gmdate( 'F d, Y', $trial_ends_at ) : '';
			$applicable_laws = isset( $response['applicableLaws'] ) ? $response['applicableLaws'] : array( 'gdpr' );
			$applicable_laws = implode( ' & ', $applicable_laws );

			$grace_period      = isset( $response['grace_period_ends_at'] ) ? strtotime( sanitize_text_field( $response['grace_period_ends_at'] ) ) : false;
			$grace_period_ends = isset( $grace_period ) && is_int( $grace_period ) ? gmdate( 'F d, Y', $grace_period ) : '';

			$pageview_reset_timestamp = isset( $response['pageviews']['ends_at'] ) ? strtotime( sanitize_text_field( $response['pageviews']['ends_at'] ) ) : false;
			$pageview_reset_date = is_int( $pageview_reset_timestamp ) ? gmdate( 'F d, Y', $pageview_reset_timestamp ) : '';

			$data = array(
				'id'             => $this->get_website_id(),
				'url'            => isset( $response['url'] ) ? esc_url_raw( $response['url'] ) : esc_url_raw( get_site_url() ),
				'status'         => isset( $response['status'] ) ? sanitize_text_field( $response['status'] ) : '',
				'banner_disabled_manually' => isset($response['banner_disabled_manually']) && true == $response['banner_disabled_manually'],
				'user'           => array(
					'name'        => isset( $user['name'] ) ? sanitize_text_field( $user['name'] ) : '',
					'email'       => isset( $user['email'] ) ? sanitize_email( $user['email'] ) : '',
				),
				'plan'           => array(
					'id'          => isset( $plan['id'] ) ? sanitize_text_field( $plan['id'] ) : '',
					'slug'        => isset( $plan['slug'] ) ? sanitize_text_field( $plan['slug'] ) : '',
					'name'        => isset( $plan['name'] ) ? sanitize_text_field( $plan['name'] ) : '',
					'currency'    => isset( $plan['currency'] ) ? sanitize_text_field( $plan['currency'] ) : 'USD',
					'description' => isset( $plan['description'] ) ? sanitize_text_field( $plan['description'] ) : '',
					'scan_limit'  => isset( $plan['scan_limit'] ) ? absint( $plan['scan_limit'] ) : 100,
					'log_limit'   => isset( $plan['log_limit'] ) ? absint( $plan['log_limit'] ) : 5000,
					'features'    => array(
						'multi_law'         => isset( $features['multi_law'] ) && true === $features['multi_law'] ? true : false,
						'custom_css'        => isset( $features['custom_css'] ) && true === $features['custom_css'] ? true : false,
						'custom_branding'   => isset( $features['custom_branding'] ) && true === $features['custom_branding'] ? true : false,
						'config_geo_rules'  => isset( $features['config_geo_rules'] ) && true === $features['config_geo_rules'] ? true : false,
						'max_free_websites' => isset( $plan['max_free_websites'] ) ? absint( $plan['max_free_websites'] ) : 1,
						'remove_powered_by' => isset( $features['remove_powered_by'] ) && true === $features['remove_powered_by'] ? true : false,
						'popup_layout'      => isset( $features['popup_layout'] ) && true === $features['popup_layout'] ? true : false,
					),
				),
				'banners'        => array(
					'status' => isset( $response['banner_status'] ) && 1 === $response['banner_status'] ? true : false,
					'laws'   => $applicable_laws,
					'is_iab_enabled' => isset( $response['isIABEnabled'] ) && true === $response['isIABEnabled'],
					'targetedLocation' => isset( $response['targetedLocation'] ) ? $response['targetedLocation'] : 'worldwide',
				),
				'consent_logs'   => array(
					'status' => isset( $response['visitor_log'] ) && true === $response['visitor_log'] ? true : false,
				),
				'scans'          => array(
					'date'   => array(
						'date' => $date,
						'time' => $time,
					),
					'status' => isset( $response['last_scan_at'] ) && '' !== $response['last_scan_at'] ? true : false,
				),
				'success_scan'          => array(
					'date'   => array(
						'date' => $success_date,
						'time' => $success_time,
					),
					'status' => isset( $response['last_successful_scan_at'] ) && '' !== $response['last_successful_scan_at'],
				),
				'languages'      => array(
					'selected' => isset( $response['language']['preferred'] ) ? cky_sanitize_text( $response['language']['preferred'] ) : array(),
					'default'  => isset( $response['settings_json']['defaultLanguage'] ) ? cky_sanitize_text( $response['settings_json']['defaultLanguage'] ) : 'en',
				),
				'tables_missing' => false,
				'pageviews'      => array(
					'count'    => isset( $response['pageviews']['views'] ) ? absint( $response['pageviews']['views'] ) : 0,
					'limit'    => isset( $response['pageviews']['views_limit'] ) ? absint( $response['pageviews']['views_limit'] ) : 5000,
					'exceeded' => isset( $response['pageviews']['limit_exceeded'] ) && 1 === absint( $response['pageviews']['limit_exceeded'] ),
					'ends_at'   => $pageview_reset_date,
				),
				'website'        => array(
					'status'               => isset( $response['website_status'] ) ? sanitize_text_field( $response['website_status'] ) : 'active',
					'is_trial'             => isset( $response['is_trial'] ) && true === $response['is_trial'],
					'isInOptoutTrial'      => isset( $response['isInOptoutTrial'] ) && true === $response['isInOptoutTrial'],
					'isInReverseTrial'     => isset( $response['isInReverseTrial'] ) && true === $response['isInReverseTrial'],
					'isInOptinTrial'       => isset( $response['isInOptinTrial'] ) && true === $response['isInOptinTrial'],
					'is_trial_experiment'  => isset( $response['website_metadata']['trial_experiment'] ) && true === $response['website_metadata']['trial_experiment'],
					'trial_ends_at'        => $trial_ends_at_date,
					'ends_in'              => isset( $response['ends_in'] ) ? absint( $response['ends_in'] ) : 0,
					'is_trial_with_card'   => isset( $response['trial_with_card'] ) && true === $response['trial_with_card'],
					'grace_period_ends_at' => $grace_period_ends,
					'payment_status'       => isset( $response['payment_status'] ) && true === $response['payment_status'],
					'hasPaymentMethod'     => isset( $response['hasPaymentMethod'] ) && true === $response['hasPaymentMethod'],
					'selected_plan'        => isset( $plan['slug'] ) ? sanitize_text_field( $plan['slug'] ) : 'free',
					'canStartOptoutTrial'  => isset( $response['canStartOptoutTrial'] ) ? (bool) $response['canStartOptoutTrial'] : false,
				),
				'overage' => array(
					'applicable'         => isset( $response['overage']['applicable'] ) ? (bool) $response['overage']['applicable'] : false,
					'enabled'            => isset( $response['overage']['enabled'] ) ? (bool) $response['overage']['enabled'] : false,
					'is_after_rollout'   => isset( $response['overage']['is_after_rollout'] ) ? (bool) $response['overage']['is_after_rollout'] : false,
					'overage_view_count' => isset( $response['overage']['overage_view_count'] ) ? absint( $response['overage']['overage_view_count'] ) : 0,
				),
			);
			return $data;
		} elseif ( 401 === $response_code ) {
			return new WP_Error(
				'cky_unauthorized',
				__( 'Your session has expired. Please verify your connection.', 'cookie-law-info' ),
				array( 'status' => 401 )
			);
		}
		return new WP_Error(
			'cky_api_fetching_failed',
			__( 'Failed to fetch data from the API', 'cookie-law-info' ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Force update app settings if any changes from the plugin side.
	 *
	 * @param array $settings Settings array.
	 * @return void
	 */
	public function maybe_update_app_settings( $settings = array() ) {
		if ( ! cky_is_cloud_request() || ! $this->get_website_id() ) {
			return;
		}
		$data     = array(
			'preferred_languages' => isset( $settings['languages']['selected'] ) ? $settings['languages']['selected'] : array(),
			'default_language'    => isset( $settings['languages']['default'] ) ? $settings['languages']['default'] : 'en',
			'visitor_log'         => isset( $settings['consent_logs']['status'] ) && true === $settings['consent_logs']['status'] ? 1 : 0,
		);
		$response = $this->put(
			'websites/' . $this->get_website_id(),
			wp_json_encode( $data )
		);

		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $response_code ) {
			return new WP_Error(
				'cky_api_settings_update_failed',
				__( 'Failed to the update the data to web app', 'cookie-law-info' ),
				array( 'status' => 200 )
			);
		}
	}
	/**
	 * Add payment/subscription data.
	 *
	 * @param array $data Payment data.
	 * @return array|WP_Error
	 */
	public function add_payments( $data ) {
		// Validate required fields are present
		$required_fields = array( 'currency', 'is_trial', 'is_trial_experiment', 'plan_id', 'website_id' );

		foreach ( $required_fields as $field ) {
			if ( ! isset( $data[ $field ] ) ) {
				return new WP_Error(
					'cky_missing_payment_data',
					/* translators: %s: field name */
					sprintf( __( 'Missing required payment data: %s', 'cookie-law-info' ), $field ),
					array( 'status' => 400 )
				);
			}
		}

		// Validate website_id matches current website
		if ( isset( $data['website_id'] ) && $data['website_id'] !== $this->get_website_id() ) {
			return new WP_Error(
				'cky_invalid_website_id',
				__( 'Invalid website ID provided', 'cookie-law-info' ),
				array( 'status' => 400 )
			);
		}

		$response = $this->post(
			'subscriptions/checkout',
			wp_json_encode( $data )
		);
		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $response_code ) {
			$response = json_decode( wp_remote_retrieve_body( $response ), true );
			return $response;
		}
		return new WP_Error(
			'cky_api_fetching_failed',
			__( 'Failed to fetch data from the API', 'cookie-law-info' ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Delete the cache.
	 *
	 * @return void
	 */
	public function delete_cache() {
		wp_cache_flush();
	}
}
