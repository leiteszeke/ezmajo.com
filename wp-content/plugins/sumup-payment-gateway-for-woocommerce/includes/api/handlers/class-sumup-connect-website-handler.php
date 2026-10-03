<?php

if (!defined('ABSPATH')) {
	exit;
}

class Sumup_API_Connection_Website_Handler extends Sumup_Api_Handler
{

	public function __construct()
	{
		add_filter('sumup_api_handlers', array($this, 'add_handlers'));
	}

	/**
	 * Get the posted data in the checkout.
	 *
	 * @return array
	 * @throws Exception
	 */

	public function add_handlers($handlers)
	{
		$handlers['connection_website'] = array(
			'callback' => array($this, 'handle'),
			'method' => 'POST',
		);

		return $handlers;
	}

	/**
	 * Handle the request.
	 */
	public function handle()
	{
		$json_data = file_get_contents('php://input');
		$post_data = json_decode($json_data, true);
		$connection_id = isset($post_data['id']) ? sanitize_text_field($post_data['id']) : '';

		WC_SUMUP_LOGGER::log( "Receive connect data handler");

		if ( empty( $connection_id ) ) {
			WC_SUMUP_LOGGER::log( 'Rejecting legacy connect callback: missing connection ID' );
			$reponse_body = array('status' => 'error', 'message' => 'Invalid connection ID');
			$this->send_response($reponse_body['status'],$reponse_body['message'],array() ,400);
		}

		if ( ! sumup_has_pending_connection_id( $connection_id ) ) {
			WC_SUMUP_LOGGER::log( 'Rejecting legacy connect callback: unknown connection ID ' . $connection_id );
			$reponse_body = array('status' => 'error', 'message' => 'Invalid connection ID');
			$this->send_response($reponse_body['status'],$reponse_body['message'],array() ,400);
		}

		if (!isset($post_data['merchant']['email'])) {
			$reponse_body = array('status' => 'error', 'message' => 'Invalid merchant email');
			$this->send_response($reponse_body['status'],$reponse_body['message'],array() ,400);
		}

		if (!isset($post_data['merchant']['api_key'])) {
			$reponse_body = array('status' => 'error', 'message' => 'Invalid API key');
			$this->send_response($reponse_body['status'],$reponse_body['message'],array() ,400);
		}

		if (!isset($post_data['merchant']['merchant_code'])) {
			$reponse_body = array('status' => 'error', 'message' => 'Invalid merchant code');
			$this->send_response($reponse_body['status'],$reponse_body['message'],array() ,400);
		}

		$settings = get_option('woocommerce_sumup_settings');
		if (!isset($settings)) {
			set_transient('pay_to_email', $post_data['merchant']['email']);
			set_transient('api_key', $post_data['merchant']['api_key']);
			set_transient('merchant_id', $post_data['merchant']['merchant_code']);
		}else{
			$settings['pay_to_email'] = $post_data['merchant']['email'];
			$settings['api_key'] = $post_data['merchant']['api_key'];
			$settings['merchant_id'] = $post_data['merchant']['merchant_code'];
			$settings['enabled'] = 'no';
			update_option('woocommerce_sumup_settings', $settings);
		}

		update_option('sumup_connection_status', 'pending', false);

		sumup_delete_pending_connection_id($connection_id);

		$reponse_body = array('status' => 'connected');
		$this->send_response($reponse_body);

	}

}

new Sumup_API_Connection_Website_Handler();
