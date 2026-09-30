<?php
/**
 * WordPress file sytstem API.
 *
 * @link       https://www.cookieyes.com/
 * @since      3.0.0
 * @package    CookieYes\Lite\Includes
 */

namespace CookieYes\Lite\Includes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


/**
 * Handles the connect notice expand status for the plugin.
 */
class Connect_Notice {

	/**
	 * Instance of the current class
	 *
	 * @var object
	 */
	private static $instance;
	
	public $accordion_status;

	public $connect_notice_status;

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
	 * Primary class constructor.
	 *
	 * @access public
	 * @since 3.0.0
	 */
	public function __construct() {
		$this->accordion_status = $this->get_expand_state();
		$this->connect_notice_status = $this->get_connect_notice_status();
	}

	/**
	 * Save the expand status
	 *
	 * @since 3.0.0
	 * @param string  $notice Programmatic Notice Name.
	 * @param integer $expiry Notice expiry.
	 * @return void
	 */
	public function save_state(  $expand ) {
		$accordion['status'] = $expand;
		update_option( 'cky_connect_expand', $accordion );
	}

	public function save_connect_notice( $connect_notice ) {
		$notice_data = array(
			'status' => $connect_notice
		);
		update_option( 'cky_connect_notice', $notice_data );
	}

	/**
	 * 
	 *
	 * @return array
	 */
	public function get_accordion_status() {
		return $this->accordion_status;
	}

	public function get_connect_notice_state() {
		return $this->connect_notice_status;
	}

	/**
	 * Get expand state
	 *
	 * @return array
	 */
	public function get_expand_state() {
		$accordion['status'] = true;
		return get_option( 'cky_connect_expand', $accordion );
	}

	public function get_connect_notice_status() {
		$connect_notice = array(
			'status' => false
		);
		return get_option( 'cky_connect_notice', $connect_notice );
	}
}
