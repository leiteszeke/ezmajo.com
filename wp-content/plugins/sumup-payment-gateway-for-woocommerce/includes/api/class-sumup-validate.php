<?php

if (! defined('ABSPATH')) {
	exit;
}

add_action('rest_api_init', function () {
	register_rest_route('sumup_connection/v1', 'validate', array(
		'methods'  => 'GET',
		'callback' => 'sumup_validate_website',
		'permission_callback' => '__return_true',
	));
});


/**
 * Validate endpoint
 */
function sumup_validate_website($request)
{
	$ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field($_SERVER['REMOTE_ADDR']) : '';
	$ua = isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : '';
	WC_SUMUP_LOGGER::log("Validate website callback ip=" . $ip . " ua=" . $ua);
	$reponse_body = array('status' => 'valid website');
	$response = new WP_REST_Response($reponse_body);
	$response->set_status(200);
	return $response;
}
