<?php

if (!defined('ABSPATH')) {
	exit;
}

//TODO - Adicionar timeout na requisição.
class Sumup_API_Validation_Website_Handler extends Sumup_Api_Handler
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
		$handlers['validate_website'] = array(
			'callback' => array($this, 'handle'),
			'method' => 'GET',
		);

		return $handlers;
	}

	/**
	 * Handle the request.
	 */
	public function handle()
	{
		WC_SUMUP_LOGGER::log( "Sending validate website handler");
		$this->send_response(array('status' => 'valid website'));

	}

}

new Sumup_API_Validation_Website_Handler();
