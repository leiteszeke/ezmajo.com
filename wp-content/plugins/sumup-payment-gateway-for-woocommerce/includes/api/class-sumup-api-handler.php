<?php

// Exit if run outside WP.
if (!defined('ABSPATH')) {
	exit;
}

/**
 * Class Sumup_Api_Handler.
 */
class Sumup_Api_Handler
{

	/**
	 * Sumup_Api_Handler constructor.
	 */
	public function __construct()
	{
		add_action('woocommerce_api_sumup_api_handler', array($this, 'handler'));

		// Include API files.
		$this->includes();
	}

	/**
	 * Include all API files.
	 */
	private function includes()
	{
		include_once dirname(__FILE__) . '/handlers/class-sumup-create-checkout.php';
		include_once dirname(__FILE__) . '/handlers/class-sumup-store-payment-instructions.php';
		include_once dirname(__FILE__) . '/handlers/class-sumup-validation-website-handler.php';
		include_once dirname(__FILE__) . '/handlers/class-sumup-connect-website-handler.php';
		include_once dirname(__FILE__) . '/handlers/class-sumup-validate-redirect.php';
	}

	/**
	 * Get all the setup handlers.
	 * @return array
	 */
	public function get_handlers()
	{
		return apply_filters('sumup_api_handlers', array());
	}

	/**
	 * Execute the request.
	 */
	public function handler()
	{
		$handlers = $this->get_handlers();
		$action = isset($_GET['action']) ? sanitize_key(wp_unslash($_GET['action'])) : '';

		// Return an error in case action doesn't exists .
		if (empty($action) || !array_key_exists($action, $handlers)) {
			wp_send_json(
				array(
					'result' => 'error',
					'message' => "Invalid request. Invalid param 'action'.",
				), 500);
		}

		$expected_method = isset($handlers[$action]['method']) ? strtoupper($handlers[$action]['method']) : '';
		if ($expected_method && strtoupper(wp_unslash($_SERVER['REQUEST_METHOD'] ?? '')) !== $expected_method) {
			wp_send_json(
				array(
					'result' => 'error',
					'message' => __('Invalid request method.', 'sumup-payment-gateway-for-woocommerce'),
				),
				405
			);
		}

		call_user_func($handlers[$action]['callback']);
	}

	public function send_response($result = 'success', $message = '', $data = array(), $code = 200)
	{
		wp_send_json(
			array(
				'result' => $result,
				'message' => $message,
				'data' => $data,
			), $code);
	}

}
