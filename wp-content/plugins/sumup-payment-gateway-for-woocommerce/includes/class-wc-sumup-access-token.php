<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class to create SumUp access token
 *
 * @return array
 */
class Wc_Sumup_Access_Token {
	/**
	 * Access token request timeout in seconds.
	 */
	private const REQUEST_TIMEOUT = 30;

	/**
	 * Build a transient key scoped to the configured SumUp credentials.
	 *
	 * @param string $client_id SumUp client ID.
	 * @param string $client_secret SumUp client secret.
	 * @return string
	 */
	private static function get_transient_key($client_id = '', $client_secret = '')
	{
		return 'sumup_access_token_' . hash('sha256', $client_id . '|' . $client_secret);
	}

	/**
	 * Extract a readable error message from the decoded access token response.
	 *
	 * @param mixed $response Decoded SumUp token response.
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
	 * Get access token
	 *
	 * @param string $client_id
	 * @param string $client_secret
	 * @param string $api_key
	 *
	 * @return array
	 */
	public static function get( $client_id = '', $client_secret = '', $api_key = '', $force=false, $log_context = array() ) {
		$context = is_array( $log_context ) ? $log_context : array();

		/**
		 * After start using api_key we add this to prevent that any other proccess break for users that still use access token.
		 * This needs to be refactored when is possible
		 */
		if ( ! empty( $api_key ) ) {
			return array(
				'access_token' => $api_key,
			);
		}

		if (empty($client_id)) {
			WC_SUMUP_LOGGER::log( 'Error on get access token. Missing client_id', $context, 'error' );
			return array();
		}

		// Try to get the transient for access token.
		$transient_key = self::get_transient_key($client_id, $client_secret);
		$access_token = get_transient($transient_key);
		if($access_token && !$force){
			return array('access_token' => $access_token);
		}

		$http_response = wp_remote_post(
			'https://api.sumup.com/token',
			array(
				'timeout' => self::REQUEST_TIMEOUT,
				'redirection' => 0,
				'headers' => sumup_get_api_request_headers(
					array(
						'Content-Type' => 'application/x-www-form-urlencoded',
					)
				),
				'body' => array(
					'grant_type' => 'client_credentials',
					'client_id' => $client_id,
					'client_secret' => $client_secret,
				),
			)
		);

		if (is_wp_error($http_response)) {
			$context['error'] = sanitize_text_field($http_response->get_error_message());
			WC_SUMUP_LOGGER::log('Error on get access token. Request failed.', $context, 'error');
			return array();
		}

		$response_http_code = wp_remote_retrieve_response_code($http_response);
		$response_body = wp_remote_retrieve_body($http_response);
		$response = json_decode( $response_body, true );
		if (is_array($response)) {
			if ($response_http_code === 200 && !empty($response['access_token'])) {
				set_transient(
					$transient_key,
					$response['access_token'],
					!empty($response['expires_in']) ? (int) $response['expires_in'] : HOUR_IN_SECONDS
				);

				return $response;
			}

			WC_SUMUP_LOGGER::log(
				'Error on get access token.',
				array_merge(
					$context,
					array(
						'http_code' => $response_http_code,
						'error' => self::get_response_error_message($response),
					)
				),
				'warning'
			);
		}


		return array();
	}
}
