<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * API for create checkout on Woocommerce checkout blocks.
 */

class Sumup_API_Create_Chekout_Handler extends Sumup_Api_Handler
{

	public function __construct()
	{
		add_filter('sumup_api_handlers', array($this, 'add_handlers'));
	}

	public function add_handlers($handlers)
	{
		$handlers['create_checkout'] = array(
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
		if (!wp_verify_nonce($nonce, 'sumup-create-checkout')) {
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

		$is_checkout_blocks = !empty($post_data['isCheckoutBlocks']);
		$result = $this->create_checkout($order_id, $order_key, $is_checkout_blocks);

		if (isset($result['status']) && 'error' === $result['status']) {
			$this->send_response($result['status'], $result['message'], array(), 400);
		}

		$this->send_response('success', '', $result);

	}

	private function create_checkout($order_id, $order_key = '', $is_checkout_blocks = false)
	{

		if (!sumup_gateway_is_configured()) {
			$message = __('Merchant account settings are incorrectly configured. Check the plugin settings page.', 'sumup-payment-gateway-for-woocommerce');
			return 	array(
				'status' => 'error',
				'message' => $message,
				'data' => null,
			);
		}

		$sumup_settings = get_option('woocommerce_sumup_settings', false);
		if (empty($sumup_settings)) {
			$unavaliable_message = __('Sumup is temporarily unavailable. Please contact site admin for more information.', 'sumup-payment-gateway-for-woocommerce');

			return 	array(
				'status' => 'error',
				'message' => $unavaliable_message,
				'data' => null,
			);
		}

		if (empty($sumup_settings['merchant_id']) && empty($sumup_settings['pay_to_email'])) {
			WC_SUMUP_LOGGER::log(
				'Gateway configuration is incomplete: missing Merchant code.',
				array(
					'flow' => 'blocks_checkout_create',
					'merchant_code' => $sumup_settings['merchant_id'] ?? '',
				),
				'error'
			);
			$message = current_user_can('manage_options')
				? __('Please fill "Merchant code" on the plugin settings.', 'sumup-payment-gateway-for-woocommerce')
				: __('Sorry, SumUp is not available. Try again soon.', 'sumup-payment-gateway-for-woocommerce');
			return 	array(
				'status' => 'error',
				'message' => $message,
				'data' => null,
			);
		}

		$order = wc_get_order($order_id);
		if (!$order instanceof WC_Order) {
			return array(
				'status' => 'error',
				'message' => __('Order ID is not available to make the payment. Try again soon or contact the website support.', 'sumup-payment-gateway-for-woocommerce'),
				'data' => null,
			);
		}

		$gateway = $this->get_sumup_gateway('sumup');
		$log_context = $gateway->get_order_log_context(
			$order,
			array(
				'flow' => 'blocks_checkout_create',
				'merchant_code' => $sumup_settings['merchant_id'] ?? '',
			)
		);
		$order_access = $gateway->validate_order_access_for_checkout($order, $order_key);
		if (!$order_access['valid']) {
			WC_SUMUP_LOGGER::log('Rejected checkout creation because order validation failed.', $log_context, 'warning');
			return array(
				'status' => 'error',
				'message' => $order_access['error'],
				'data' => null,
			);
		}

		$access_token = Wc_Sumup_Access_Token::get($sumup_settings['client_id'], $sumup_settings['client_secret'], $sumup_settings['api_key'], false, $log_context);
		if (!isset($access_token['access_token'])) {
			WC_SUMUP_LOGGER::log('Error on request to get access token.', $log_context, 'error');
			$message = current_user_can('manage_options') ? 'Error to generate SumUp access token.' : 'Sorry, SumUp is not available. Try again soon.';

			return 	array(
				'status' => 'error',
				'message' => $message,
				'data' => null,
			);
		}

		$sumup_settings['sumup_access_token'] = $access_token['access_token'];
		$sumup_settings['sumup_token_fetched_date'] = date('Y/m/d H:i:s');
		update_option('woocommerce_sumup_settings', $sumup_settings);

		$sumup_checkout = $order->get_meta('_sumup_checkout_data');
		if ($gateway->should_refresh_checkout_for_order($order, $sumup_checkout)) {
			if (!empty($sumup_checkout['id'])) {
				WC_SUMUP_LOGGER::log('Refreshing stored SumUp checkout in Blocks because the order context changed.', $gateway->get_checkout_log_context($sumup_checkout, $log_context), 'info');
			}

			$gateway->clear_checkout_for_order($order);
			$sumup_checkout = array();
		} else {
			$sumup_checkout = $gateway->enrich_checkout_data_for_order(
				$order,
				$sumup_checkout,
				$is_checkout_blocks
			);
		}

		if (empty($sumup_checkout)) {
			$checkout_data = $gateway->build_checkout_request_data($order);
			$sumup_checkout = Wc_Sumup_Checkout::create($sumup_settings['sumup_access_token'], $checkout_data, $log_context);
			if (empty($sumup_checkout)) {
				WC_SUMUP_LOGGER::log('Error on request to create SumUp checkout ID.', $log_context, 'error');
				$message = current_user_can('manage_options') ? 'Error to generate SumUp checkout id.' : 'Sorry, SumUp is not available. Try again soon.';
				return 	array(
					'status' => 'error',
					'message' => $message,
					'data' => null,
				);
			}
			$sumup_checkout = $gateway->enrich_checkout_data_for_order($order, $sumup_checkout, $is_checkout_blocks);

			$order->update_meta_data('_sumup_checkout_data', $sumup_checkout);
			$order->save();
		}

		/**
		 * Fallback to fill merchant code to "old" users. Temporary solution while SumUp team check other ways to enable request to get merchant_code.
		 */
		if (empty($sumup_settings['merchant_id']) && isset($sumup_checkout['merchant_code'])) {
			$gateway->update_option('merchant_id', $sumup_checkout['merchant_code']);
		}

		if (isset($sumup_checkout['id'])) {
			return array_merge(
				$gateway->get_widget_context_for_order($order),
				array(
					"checkoutId" => $sumup_checkout['id'],
				)
			);

		}

		if (isset($sumup_checkout['error_code'])) {
			$error = isset($sumup_checkout['error_message']) ? $sumup_checkout['error_message'] : $sumup_checkout['message'];
			WC_SUMUP_LOGGER::log(
				'SumUp create checkout request failed.',
				array_merge(
					$gateway->get_checkout_log_context($sumup_checkout, $log_context),
					array(
						'error' => $error,
						'error_code' => $sumup_checkout['error_code'],
					)
				),
				'warning'
			);
			$message = current_user_can('manage_options') ? 'Error from response to create checkout on SumUp. Check the logs.' : 'Sorry, SumUp is not available. Try again soon.';
			return 	array(
				'status' => 'error',
				'message' => $message,
				'data' => null,
			);
		}
	}

	/**
	 * Get Sumup active gateway.
	 *
	 * @param string $gateway
	 *
	 * @return sumup_Gateway
	 * @throws Exception
	 */
	protected function get_sumup_gateway($gateway)
	{
		$payment_gateways = WC()->payment_gateways()->get_available_payment_gateways();

		if (isset($payment_gateways[$gateway])) {
			return $payment_gateways[$gateway];
		}

		throw new Exception('Sumup payment method not found');
	}

}

new Sumup_API_Create_Chekout_Handler();
