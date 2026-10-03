<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Class to create SumUp access token
 *
 * @return array
 */
class Wc_Sumup_Checkout
{
	/**
	 * Request timeout in seconds for SumUp checkout requests.
	 */
	private const REQUEST_TIMEOUT = 30;

	/**
	 * Build the shared HTTP arguments for SumUp checkout requests.
	 *
	 * @param string $access_token SumUp access token.
	 * @return array
	 */
	private static function get_request_args($access_token = '')
	{
		return array(
			'timeout' => self::REQUEST_TIMEOUT,
			'redirection' => 0,
			'headers' => sumup_get_api_request_headers(array(), $access_token),
		);
	}

	/**
	 * Extract a readable error message from a SumUp API response body.
	 *
	 * @param mixed $response Decoded response body.
	 * @return string
	 */
	private static function get_response_error_message($response)
	{
		if (!is_array($response)) {
			return '';
		}

		return isset($response['message']) ? sanitize_text_field($response['message']) : '';
	}

	/**
	 * Build structured log context from checkout request data.
	 *
	 * @param array $signup_data Checkout request data.
	 * @param array $log_context Additional explicit context.
	 * @return array
	 */
	private static function build_log_context($signup_data, $log_context = array())
	{
		$context = is_array($log_context) ? $log_context : array();

		if (!is_array($signup_data)) {
			return $context;
		}

		if (isset($signup_data['checkout_reference'])) {
			$context['checkout_reference'] = sanitize_text_field((string) $signup_data['checkout_reference']);
		}

		if (isset($signup_data['amount'])) {
			$context['amount'] = (string) $signup_data['amount'];
		}

		if (isset($signup_data['currency'])) {
			$context['currency'] = sanitize_text_field((string) $signup_data['currency']);
		}

		if (isset($signup_data['_sumup_context']) && is_array($signup_data['_sumup_context'])) {
			$local_context = $signup_data['_sumup_context'];

			if (!empty($local_context['order_id'])) {
				$context['order_id'] = absint($local_context['order_id']);
			}

			if (!empty($local_context['flow'])) {
				$context['flow'] = sanitize_text_field((string) $local_context['flow']);
			}
		}

		return $context;
	}

	/**
	 * Get access token
	 *
	 * @param string $client_id
	 * @param string $client_secret
	 * @param string $api_key
	 *
	 * @return array
	 */
	public static function create($access_token = '', $signup_data = array(), $log_context = array())
	{
		$context = self::build_log_context($signup_data, $log_context);

		if (empty($access_token)) {
			WC_SUMUP_LOGGER::log('Skipped SumUp checkout creation because the access token is missing.', $context, 'warning');
			return array();
		}

		$request_args = self::get_request_args($access_token);
		$request_args['headers']['Content-Type'] = 'application/json';
		$request_body = $signup_data;
		unset($request_body['_sumup_context']);
		$request_args['body'] = wp_json_encode($request_body);

		$http_response = wp_remote_post('https://api.sumup.com/v0.1/checkouts', $request_args);
		if (is_wp_error($http_response)) {
			$context['error'] = sanitize_text_field($http_response->get_error_message());
			WC_SUMUP_LOGGER::log('SumUp checkout creation request failed.', $context, 'error');
			return array();
		}

		$response_http_code = wp_remote_retrieve_response_code($http_response);
		$response_body = wp_remote_retrieve_body($http_response);
		$response = json_decode($response_body, true);
		$error_message = self::get_response_error_message($response);

		if (is_array($response) && isset($response['id'])) {
			$context['checkout_id'] = (string) $response['id'];
		}

		if (is_array($response) && isset($response['status'])) {
			$context['checkout_status'] = (string) $response['status'];
		}

		$context['http_code'] = $response_http_code;
		if ('' !== $error_message) {
			$context['error'] = $error_message;
		}

		$log_level = ($response_http_code === 201 || $response_http_code === 200) ? 'info' : 'warning';
		WC_SUMUP_LOGGER::log('SumUp checkout create request completed.', $context, $log_level);

		if (is_array($response) && ($response_http_code === 201 || $response_http_code === 200)) {
			return $response;
		}

		if (is_array($response) && $error_message !== '') {
			return array(
				'message' => $error_message,
				'param' => isset($response['param']) ? sanitize_text_field($response['param']) : '',
				'error_code' => isset($response['error_code']) ? sanitize_text_field($response['error_code']) : 'sumup_checkout_error',
			);
		}

		return array();
	}

	/**
	 * Get checkout based on ID
	 *
	 * @param string $checkout_id
	 * @param string $access_token
	 *
	 * @return array
	 */
	public static function get($checkout_id = '', $access_token = '', $log_context = array())
	{
		if (empty($checkout_id) || empty($access_token)) {
			return array();
		}

		$context = is_array($log_context) ? $log_context : array();
		$context['checkout_id'] = sanitize_text_field((string) $checkout_id);

		$http_response = wp_remote_get(
			'https://api.sumup.com/v0.1/checkouts/' . rawurlencode($checkout_id),
			self::get_request_args($access_token)
		);
		if (is_wp_error($http_response)) {
			$context['error'] = sanitize_text_field($http_response->get_error_message());
			WC_SUMUP_LOGGER::log('SumUp checkout fetch request failed.', $context, 'error');
			return array();
		}

		$response_http_code = wp_remote_retrieve_response_code($http_response);
		$response_body = wp_remote_retrieve_body($http_response);
		$response = json_decode($response_body, true);

		if ($response_http_code !== 200) {
			$context['http_code'] = $response_http_code;
			$context['error'] = self::get_response_error_message($response);
			WC_SUMUP_LOGGER::log('SumUp checkout fetch request returned a non-success response.', $context, 'warning');
			return array();
		}

		return is_array($response) ? $response : array();
	}
}
