<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Validate SumUp payment status after a redirect (for example 3DS).
 */
class Sumup_API_Validate_Redirect_Handler extends Sumup_Api_Handler
{

	public function __construct()
	{
		add_filter('sumup_api_handlers', array($this, 'add_handlers'));
	}

	public function add_handlers($handlers)
	{
		$handlers['validate_redirect'] = array(
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

		if (!is_array($post_data)) {
			$this->send_response('error', __('Invalid request payload.', 'sumup-payment-gateway-for-woocommerce'), array(), 400);
		}

		$nonce = isset($post_data['nonce']) ? sanitize_text_field(wp_unslash($post_data['nonce'])) : '';
		if (!wp_verify_nonce($nonce, 'sumup-validate-redirect')) {
			$this->send_response('error', __('Invalid request nonce.', 'sumup-payment-gateway-for-woocommerce'), array(), 403);
		}

		$order_id = isset($post_data['order_id']) ? absint($post_data['order_id']) : 0;
		if (!$order_id) {
			$this->send_response('error', __('Invalid order ID.', 'sumup-payment-gateway-for-woocommerce'), array(), 400);
		}

		$checkout_id = isset($post_data['checkout_id']) ? sanitize_text_field(wp_unslash($post_data['checkout_id'])) : '';

		$gateways = WC()->payment_gateways()->payment_gateways();
		$gateway = isset($gateways['sumup']) ? $gateways['sumup'] : null;

		if (!$gateway instanceof WC_Gateway_SumUp) {
			$this->send_response('error', __('SumUp gateway is unavailable.', 'sumup-payment-gateway-for-woocommerce'), array(), 503);
		}

		$result = $gateway->resolve_payment_redirect_validation($order_id, $checkout_id, false);

		if (!empty($result['error'])) {
			$this->send_response('error', $result['error'], array(), 400);
		}

		$this->send_response('success', $result['message'], $result);
	}
}

new Sumup_API_Validate_Redirect_Handler();
