<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * API for storing pending PIX/Boleto instructions against a WooCommerce order.
 */
class Sumup_API_Store_Payment_Instructions_Handler extends Sumup_Api_Handler
{
	public function __construct()
	{
		add_filter('sumup_api_handlers', array($this, 'add_handlers'));
	}

	public function add_handlers($handlers)
	{
		$handlers['store_payment_instructions'] = array(
			'callback' => array($this, 'handle'),
			'method' => 'POST',
		);

		return $handlers;
	}

	/**
	 * Handle the request.
	 *
	 * @return void
	 */
	public function handle()
	{
		$json_data = file_get_contents('php://input');
		$post_data = json_decode($json_data, true);

		if (!is_array($post_data)) {
			$this->send_response('error', __('Invalid request payload.', 'sumup-payment-gateway-for-woocommerce'), array(), 400);
		}

		$nonce = isset($post_data['nonce']) ? sanitize_text_field(wp_unslash($post_data['nonce'])) : '';
		if (!wp_verify_nonce($nonce, 'sumup-store-payment-instructions')) {
			$this->send_response('error', __('Invalid request nonce.', 'sumup-payment-gateway-for-woocommerce'), array(), 403);
		}

		$order_id = isset($post_data['order_id']) ? absint($post_data['order_id']) : 0;
		if (!$order_id) {
			$this->send_response('error', __('Invalid order ID.', 'sumup-payment-gateway-for-woocommerce'), array(), 400);
		}

		$order_key = isset($post_data['order_key']) ? wc_clean(wp_unslash($post_data['order_key'])) : '';
		if (empty($order_key)) {
			$this->send_response('error', __('Invalid order key.', 'sumup-payment-gateway-for-woocommerce'), array(), 400);
		}

		$order = wc_get_order($order_id);
		if (!$order instanceof WC_Order) {
			$this->send_response('error', __('Order is not available.', 'sumup-payment-gateway-for-woocommerce'), array(), 404);
		}

		if (!hash_equals($order->get_order_key(), $order_key)) {
			WC_SUMUP_LOGGER::log('Rejected payment instructions storage because order key validation failed. Order ID: ' . $order_id);
			$this->send_response('error', __('Order validation failed.', 'sumup-payment-gateway-for-woocommerce'), array(), 403);
		}

		if (is_user_logged_in()) {
			$order_customer_id = (int) $order->get_customer_id();
			$current_customer_id = get_current_user_id();

			if ($order_customer_id > 0 && $order_customer_id !== $current_customer_id) {
				WC_SUMUP_LOGGER::log('Rejected payment instructions storage because the order belongs to a different customer. Order ID: ' . $order_id);
				$this->send_response('error', __('Order validation failed.', 'sumup-payment-gateway-for-woocommerce'), array(), 403);
			}
		}

		$payment_method = isset($post_data['payment_method']) ? sanitize_text_field(wp_unslash($post_data['payment_method'])) : '';
		$instructions = array(
			'payment_method' => $payment_method,
			'pix_code' => isset($post_data['pix_code']) ? sanitize_textarea_field(wp_unslash($post_data['pix_code'])) : '',
			'qr_code_image' => isset($post_data['qr_code_image']) ? esc_url_raw(wp_unslash($post_data['qr_code_image'])) : '',
			'boleto_download_url' => isset($post_data['boleto_download_url']) ? esc_url_raw(wp_unslash($post_data['boleto_download_url'])) : '',
			'boleto_barcode' => isset($post_data['boleto_barcode']) ? sanitize_textarea_field(wp_unslash($post_data['boleto_barcode'])) : '',
		);

		$gateway = $this->get_sumup_gateway('sumup');
		$gateway->store_pending_payment_instructions($order, $instructions);

		$this->send_response('success', '', array('stored' => true));
	}

	/**
	 * Get SumUp active gateway.
	 *
	 * @param string $gateway Gateway ID.
	 * @return WC_Gateway_SumUp
	 * @throws Exception When the gateway is unavailable.
	 */
	protected function get_sumup_gateway($gateway)
	{
		$payment_gateways = WC()->payment_gateways()->get_available_payment_gateways();

		if (isset($payment_gateways[$gateway])) {
			return $payment_gateways[$gateway];
		}

		throw new Exception('SumUp payment method not found');
	}
}

new Sumup_API_Store_Payment_Instructions_Handler();
