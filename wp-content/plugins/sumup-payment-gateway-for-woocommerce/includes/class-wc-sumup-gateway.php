<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * @class    WC_Gateway_SumUp
 * @since    1.0.0
 * @version  1.0.0
 */
class WC_Gateway_SumUp extends \WC_Payment_Gateway
{
	/**
	 * Hide payment buttons on paid orders (Fix for some themes)
	 *
	 * @return void
	 */
	public function hide_payment_buttons_on_paid_orders()
	{
		global $wp;

		$order_id = 0;

		// Check if we are on Order Received or View Order page
		if (isset($wp->query_vars['order-received'])) {
			$order_id = absint($wp->query_vars['order-received']);
		} elseif (isset($wp->query_vars['view-order'])) {
			$order_id = absint($wp->query_vars['view-order']);
		}

		if (!$order_id) {
			return;
		}

		$order = wc_get_order($order_id);

		if (!$order) {
			return;
		}

		// Check if gateway is SumUp
		if ($order->get_payment_method() !== 'sumup') {
			return;
		}

		// Check if status is NOT pending or on-hold
		if (in_array($order->get_status(), ['pending', 'on-hold', 'failed'], true)) {
			return;
		}

?>
		<style>
			/* SumUp Plugin Fix v2.1 - Hide Buttons on Paid Orders */
			.woocommerce-order-details .order-again,
			.woocommerce-order-details .pay,
			.woocommerce-order-details .cancel,
			.woocommerce-order-details a.button.pay,
			.woocommerce-order-details a.button.cancel,
			.woocommerce-table--order-details .pay,
			.woocommerce-table--order-details .cancel,
			.my_account_orders .button.pay,
			.my_account_orders .button.cancel {
				display: none !important;
			}
		</style>
	<?php
	}
	/**
	 * Merchant code
	 *
	 * @since 2.0
	 */
	protected $merchant_id;

	/**
	 * API Key
	 *
	 * @since 2.0
	 */
	protected $api_key;

	/**
	 * Client ID
	 *
	 * @since 2.0
	 */
	protected $client_id;

	/**
	 * Client secret
	 *
	 * @since 2.0
	 */
	protected $client_secret;

	/**
	 * Installments
	 *
	 * @since 2.0
	 */
	protected $installments_enabled;

	/**
	 * Number of installments
	 *
	 * @since 2.0
	 */
	protected $number_of_installments;

	/**
	 * Merchant mail
	 *
	 * @since 2.o
	 */
	protected $pay_to_email;

	/**
	 * Remove PIX
	 *
	 * @since 2.0
	 */
	protected $enable_pix;

	/**
	 * Currency
	 *
	 * @since 2.0
	 */
	protected $currency;

	/**
	 * Return URL
	 *
	 * @since 2.0
	 */
	protected $return_url;

	/**
	 * Return URL
	 *
	 * @since 2.0
	 */
	protected $open_payment_in_modal;

	/**
	 * Enable webhook priority
	 *
	 * @since 2.0
	 */
	protected $enable_webhook_priority;

	/**
	 * Webhook retry attempts
	 *
	 * @since 2.0
	 */
	protected $webhook_retry_attempts;

	/**
	 * Enable webhook notifications
	 *
	 * @since 2.0
	 */
	protected $enable_webhook_notifications;

	/**
	 * Webhook timeout
	 *
	 * @since 2.0
	 */
	protected $webhook_timeout;
	/**
	 * Constructor.
	 */
	public function __construct()
	{
		/* Init options */
		$this->init_options();

		/* Load the form fields */
		$this->init_form_fields();

		/* Load the settings */
		$this->init_settings();

		/* Load actions */
		$this->init_actions();
	}

	/**
	 * Initialize all options and properties.
	 *
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	public function init_options()
	{
		$this->id = 'sumup';
		$this->method_title = __('SumUp', 'sumup-payment-gateway-for-woocommerce');
		$this->icon = WC_SUMUP_PLUGIN_URL . '/assets/images/sumup-logo.svg';
		$this->method_description = __('Accept credit and debit cards with SumUp, plus eligible payment methods such as Apple Pay, PayPal, Bancontact, and iDEAL.', 'sumup-payment-gateway-for-woocommerce');
		$this->has_fields = true;
		$this->supports = array(
			'subscriptions',
			'products',
		);
		$this->title = $this->get_option('title');
		$this->description = $this->get_option('description');
		$this->enabled = 'yes' === $this->get_option('enabled') && sumup_gateway_is_configured($this->settings);
		$this->merchant_id = $this->get_option('merchant_id');
		$this->installments_enabled = $this->get_option('enable_installments', false);
		$this->number_of_installments = $this->get_option('number_of_installments', false);
		$this->api_key = $this->get_option('api_key');
		$this->client_id = $this->get_option('client_id');
		$this->client_secret = $this->get_option('client_secret');
		$this->pay_to_email = $this->get_option('pay_to_email');
		$this->enable_pix = $this->get_option('enable_pix');
		$this->currency = get_woocommerce_currency();
		$this->return_url = WC()->api_request_url('wc_gateway_sumup');
		$this->open_payment_in_modal = $this->get_option('open_payment_modal', 'yes');

		// Advanced webhook settings
		$this->enable_webhook_priority = "yes";
		$this->webhook_retry_attempts = 5;
		$this->enable_webhook_notifications = 'no';
		$this->webhook_timeout = 30;
	}

	/**
	 * Initialize action hooks.
	 *
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	public function init_actions()
	{
		add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
		add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'verify_credential_options'));
		add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'verify_credentials'));
		add_action('wp_enqueue_scripts', array($this, 'payment_scripts'));
		add_action('woocommerce_before_thankyou', array($this, 'add_payment_instructions_thankyou_page'));
		add_action('woocommerce_api_wc_gateway_sumup', array($this, 'webhook'));
		add_action('template_redirect', array($this, 'check_redirect_flow'), 99);
		add_action('process_webhook_order', array($this, 'handle_webhook_order'));
		add_action('process_webhook_order_priority', array($this, 'handle_webhook_order_with_retry'), 10, 2);
		$this->admin_custom_url();
	}

	/**
	 * Add params in the url admin page.
	 * @return void
	 */
	public function admin_custom_url()
	{
		$page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';
		$tab = isset($_GET['tab']) ? sanitize_key(wp_unslash($_GET['tab'])) : '';
		$section = isset($_GET['section']) ? sanitize_key(wp_unslash($_GET['section'])) : '';
		$validate_settings = isset($_GET['validate_settings']) ? sanitize_text_field(wp_unslash($_GET['validate_settings'])) : '';
		$settings_url = admin_url('admin.php?page=wc-settings&tab=checkout&section=sumup');

		if (
			'wc-settings' === $page &&
			'checkout' === $tab &&
			'sumup' === $section &&
			empty($_POST) &&
			sumup_gateway_has_connection_details($this->settings)
		) {
			if ( sumup_gateway_is_configured( $this->settings ) ) {
				if ( '' !== $validate_settings ) {
					wp_safe_redirect( $settings_url );
					exit;
				}

				return;
			}

			if ( 'false' === $validate_settings ) {
				return;
			}

			$is_valid_onboarding_settings = Wc_Sumup_Credentials::validate();
			$new_url = $is_valid_onboarding_settings
				? $settings_url
				: add_query_arg(
					array(
						'validate_settings' => 'false',
					),
					$settings_url
				);

			//redirect to new url.
			wp_safe_redirect($new_url);

			exit;
		}
	}

	public function needs_setup()
	{
		return ! sumup_gateway_is_configured($this->settings);
	}

	public function is_account_connected()
	{
		return sumup_gateway_is_configured($this->settings);
	}

	public function get_connection_url($return_url = '')
	{
		$url = admin_url('admin.php?page=wc-settings&tab=checkout&section=sumup');

		if (! empty($return_url)) {
			$url = add_query_arg('return_url', rawurlencode($return_url), $url);
		}

		return $url;
	}

	public function admin_options()
	{
		if (! $this->needs_setup()) {
			wp_enqueue_script( 'sumup-settings' );
			wp_enqueue_style( 'sumup-settings' );
			parent::admin_options();
			return;
		}

		global $hide_save_button;

		$hide_save_button = true;
		$return_url = admin_url('admin.php?page=wc-settings&tab=checkout');
		$header = $this->get_method_title();
		$return_text = __('Return to payments', 'sumup-payment-gateway-for-woocommerce');
		$onboarding = new WC_Sumup_Onboarding();

		echo '<h2>';
		echo esc_html($header);
		echo wc_back_link($return_text, $return_url);
		echo '</h2>';

		$onboarding->render_setup_screen();
	}

	/**
	 * Render read-only connection details inside the gateway settings table.
	 *
	 * @param string $key Field key.
	 * @param array  $data Field configuration.
	 * @return string
	 */
	public function generate_sumup_connection_summary_html( $key, $data ) {
		$field_key = $this->get_field_key( $key );
		$connection_status = sumup_get_gateway_connection_status( $this->settings );
		$status_label = 'connected' === $connection_status
			? __( 'Connected', 'sumup-payment-gateway-for-woocommerce' )
			: ucfirst( str_replace( '_', ' ', $connection_status ) );
		$account_email = ! empty( $this->pay_to_email ) ? $this->pay_to_email : __( 'Not available', 'sumup-payment-gateway-for-woocommerce' );
		$merchant_id = ! empty( $this->merchant_id ) ? $this->merchant_id : __( 'Not available', 'sumup-payment-gateway-for-woocommerce' );

		ob_start();
		?>
		<tr valign="top">
			<th scope="row" class="titledesc">
				<?php echo esc_html__( 'Account details', 'sumup-payment-gateway-for-woocommerce' ); ?>
			</th>
			<td class="forminp">
				<fieldset>
					<div id="<?php echo esc_attr( $field_key ); ?>" class="sumup-connection-summary">
						<p class="sumup-connection-summary__row">
							<strong><?php echo esc_html__( 'Status', 'sumup-payment-gateway-for-woocommerce' ); ?>:</strong>
							<?php echo esc_html( $status_label ); ?>
						</p>
						<p class="sumup-connection-summary__row">
							<strong><?php echo esc_html__( 'Account email', 'sumup-payment-gateway-for-woocommerce' ); ?>:</strong>
							<?php echo esc_html( $account_email ); ?>
						</p>
						<p class="sumup-connection-summary__row">
							<strong><?php echo esc_html__( 'Merchant code', 'sumup-payment-gateway-for-woocommerce' ); ?>:</strong>
							<?php echo esc_html( $merchant_id ); ?>
						</p>
					</div>
				</fieldset>
			</td>
		</tr>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render connection actions inside the gateway settings table.
	 *
	 * @param string $key Field key.
	 * @param array  $data Field configuration.
	 * @return string
	 */
	public function generate_sumup_connection_actions_html( $key, $data ) {
		$field_key = $this->get_field_key( $key );

		ob_start();
		?>
		<tr valign="top">
			<th scope="row" class="titledesc">
				<?php echo esc_html__( 'Actions', 'sumup-payment-gateway-for-woocommerce' ); ?>
			</th>
			<td class="forminp">
				<fieldset>
					<div id="sumup_notice" class="notice notice-error inline hidden sumup-connection-actions__notice">
						<p class="sumup-notice__message"></p>
					</div>
					<p id="<?php echo esc_attr( $field_key ); ?>" class="sumup-connection-actions">
						<button
							id="sumup-payment-settings-disconnect"
							type="button"
							class="components-button is-secondary is-destructive"
							data-text="<?php esc_attr_e( 'Disconnect account', 'sumup-payment-gateway-for-woocommerce' ); ?>"
						>
							<span class="sumup-button-label">
								<?php esc_html_e( 'Disconnect account', 'sumup-payment-gateway-for-woocommerce' ); ?>
							</span>
							<span class="sumup-button-loading" aria-hidden="true"></span>
						</button>
					</p>
				</fieldset>
			</td>
		</tr>
		<?php
		return ob_get_clean();
	}

	public function webhook()
	{

		$request_body = file_get_contents('php://input');
		$data = json_decode($request_body, true);

		if (!$data || !isset($data['event_type'])) {
			wp_send_json_error(['message' => 'Invalid data'], 400);
			return;
		}

		WC_SUMUP_LOGGER::log(
			'Webhook received.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => sanitize_text_field((string) ($data['id'] ?? '')),
					'event_type' => sanitize_text_field((string) ($data['event_type'] ?? '')),
				)
			),
			'info'
		);

		$this->enqueue_webhook_with_priority($data);

		wp_send_json_success(['message' => 'Webhook added to queue']);
	}

	/**
	 * Enqueue webhook with high priority and retry logic
	 *
	 * @param array $data Webhook data
	 * @return void
	 */
	private function enqueue_webhook_with_priority($data)
	{
		$payload = $this->build_webhook_payload($data);
		$checkout_id = $payload['id'] ?? '';

		$this->schedule_webhook_action($payload);
		$this->log_webhook_scheduled($checkout_id);
	}

	private function build_webhook_payload($data)
	{
		return [
			'id' => sanitize_text_field($data['id'] ?? ''),
			'event_type' => sanitize_text_field($data['event_type'] ?? ''),
		];
	}

	/**
	 * Schedule webhook action in ActionScheduler
	 *
	 * @param array $payload Webhook data
	 * @return void
	 */
	private function schedule_webhook_action($payload)
	{
		as_schedule_single_action(
			time() + 60, // Execute in up to 1 minute
			'process_webhook_order_priority',
			[$payload, 1],
			'sumup-webhooks-priority', // high priority group
			true,
			10 // high priority (lower number = max priority)
		);
	}

	/**
	 * Log webhook scheduled event
	 *
	 * @param string $checkout_id
	 * @return void
	 */
	private function log_webhook_scheduled($checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Webhook scheduled with high priority.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => sanitize_text_field((string) $checkout_id),
				)
			),
			'info'
		);
	}

	/**
	 * Webhook to manage order status after SumUp sent a notification
	 *
	 * @return void
	 */
	public function handle_webhook_order($data)
	{
		if (!$this->validate_webhook_data($data)) {
			return;
		}

		$checkout_id = sanitize_text_field($data['id']);
		$event_type = sanitize_text_field($data['event_type']);

		if (!$this->validate_event_type($event_type)) {
			$this->log_invalid_event_type($event_type, $checkout_id);
			return;
		}

		$this->log_webhook_processing($event_type, $checkout_id);
		$log_context = $this->get_gateway_log_context(
			array(
				'flow' => 'webhook',
				'checkout_id' => $checkout_id,
				'event_type' => $event_type,
			)
		);

		$access_token = $this->get_access_token($log_context);
		if (empty($access_token)) {
			$this->log_access_token_error($checkout_id);
			return;
		}

		$checkout_data = $this->fetch_checkout_data($checkout_id, $access_token, $log_context);
		if (empty($checkout_data)) {
			$this->log_checkout_data_error($checkout_id);
			return;
		}

		$order = $this->find_order_by_checkout($checkout_data, $checkout_id);
		if ($order === false) {
			return;
		}

		$transaction_code = $checkout_data['transaction_code'] ?? '';
		if (empty($transaction_code)) {
			$this->log_missing_transaction_code($checkout_id);
			return;
		}

		$this->update_order_status($order, $checkout_data, $transaction_code);
	}

	/**
	 * Validate webhook data structure
	 *
	 * @param array $data
	 * @return bool
	 */
	private function validate_webhook_data($data)
	{
		return isset($data['id']) &&
			!empty($data['id']) &&
			isset($data['event_type']) &&
			!empty($data['event_type']);
	}

	/**
	 * Validate event type
	 *
	 * @param string $event_type
	 * @return bool
	 */
	private function validate_event_type($event_type)
	{
		return $event_type === 'CHECKOUT_STATUS_CHANGED';
	}

	/**
	 * Get access token for SumUp API
	 *
	 * @return string
	 */
	private function get_access_token($log_context = array())
	{
		$access_token = Wc_Sumup_Access_Token::get($this->client_id, $this->client_secret, $this->api_key, true, $log_context);
		return $access_token['access_token'] ?? '';
	}

	/**
	 * Fetch checkout data from SumUp API
	 *
	 * @param string $checkout_id
	 * @param string $access_token
	 * @return array
	 */
	private function fetch_checkout_data($checkout_id, $access_token, $log_context = array())
	{
		return Wc_Sumup_Checkout::get($checkout_id, $access_token, $log_context);
	}

	/**
	 * Build the checkout payload sent to SumUp for a WooCommerce order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return array
	 */
	public function build_checkout_request_data($order)
	{
		$checkout_data = array(
			'checkout_reference' => 'WC_SUMUP_' . $order->get_id(),
			'amount' => (float) $order->get_total(),
			'currency' => $order->get_currency(),
			'description' => 'WooCommerce #' . $order->get_id(),
			'redirect_url' => add_query_arg('sumup-validate-order', $order->get_id(), wc_get_checkout_url()),
			'return_url' => WC()->api_request_url('wc_gateway_sumup'),
		);

		if (!empty($this->merchant_id)) {
			$checkout_data['merchant_code'] = $this->merchant_id;
		} elseif (!empty($this->pay_to_email)) {
			$checkout_data['pay_to_email'] = $this->pay_to_email;
		}

		return $checkout_data;
	}

	/**
	 * Validate that the current visitor is allowed to pay for the given order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param string   $order_key WooCommerce order key from the current request.
	 * @return array{valid: bool, error: string}
	 */
	public function validate_order_access_for_checkout($order, $order_key = '')
	{
		if (!$order instanceof WC_Order) {
			return array(
				'valid' => false,
				'error' => __('Order ID is not available to make the payment. Try again soon or contact the website support.', 'sumup-payment-gateway-for-woocommerce'),
			);
		}

		if (empty($order_key) || !hash_equals($order->get_order_key(), $order_key)) {
			return array(
				'valid' => false,
				'error' => __('Order validation failed. Refresh checkout and try again.', 'sumup-payment-gateway-for-woocommerce'),
			);
		}

		if (is_user_logged_in()) {
			$order_customer_id = (int) $order->get_customer_id();
			$current_customer_id = get_current_user_id();

			if ($order_customer_id > 0 && $order_customer_id !== $current_customer_id) {
				return array(
					'valid' => false,
					'error' => __('Order validation failed. Refresh checkout and try again.', 'sumup-payment-gateway-for-woocommerce'),
				);
			}
		}

		return array(
			'valid' => true,
			'error' => '',
		);
	}

	/**
	 * Build widget context from an order so frontend state stays consistent across checkout flows.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return array
	 */
	public function get_widget_context_for_order($order)
	{
		if (!$order instanceof WC_Order) {
			return array();
		}

		return array(
			'amount' => wc_format_decimal($order->get_total(), wc_get_price_decimals()),
			'currency' => $order->get_currency(),
			'country' => strtoupper((string) $order->get_billing_country()),
			'firstName' => sanitize_text_field($order->get_billing_first_name()),
			'lastName' => sanitize_text_field($order->get_billing_last_name()),
			'email' => sanitize_email($order->get_billing_email()),
			'phoneNumber' => sanitize_text_field($order->get_billing_phone()),
			'city' => sanitize_text_field($order->get_billing_city()),
			'street' => sanitize_text_field($order->get_billing_address_1()),
			'streetNumber' => sanitize_text_field($order->get_billing_address_2()),
			'postalCode' => sanitize_text_field($order->get_billing_postcode()),
			'stateName' => sanitize_text_field($order->get_billing_state()),
			'redirectUrl' => $this->get_return_url($order),
			'orderId' => $order->get_id(),
			'orderKey' => $order->get_order_key(),
		);
	}

	/**
	 * Whether the current payment request comes from Cart/Checkout Blocks.
	 *
	 * WooCommerce Store API exposes Blocks payment_method_data via $_POST while
	 * process_payment() runs.
	 *
	 * @param array $sumup_checkout Stored checkout payload.
	 * @return bool
	 */
	private function is_blocks_checkout_request($sumup_checkout = array())
	{
		if (is_array($sumup_checkout) && !empty($sumup_checkout['isCheckoutBlocks'])) {
			return true;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		return isset($_POST['isCheckoutBlocks']) && wc_string_to_bool(wp_unslash($_POST['isCheckoutBlocks']));
	}

	/**
	 * Attach local order context to stored checkout data.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param array    $sumup_checkout SumUp checkout payload.
	 * @param bool     $is_checkout_blocks Whether the checkout was created from Blocks.
	 * @return array
	 */
	public function enrich_checkout_data_for_order($order, $sumup_checkout, $is_checkout_blocks = false)
	{
		if (!is_array($sumup_checkout)) {
			$sumup_checkout = array();
		}

		$sumup_checkout['_sumup_context'] = array(
			'order_total' => (string) $order->get_total(),
			'currency' => $order->get_currency(),
			'billing_country' => $order->get_billing_country(),
			'order_status' => $order->get_status(),
		);

		if ($is_checkout_blocks) {
			$sumup_checkout['isCheckoutBlocks'] = true;
		}

		return $sumup_checkout;
	}

	/**
	 * Build a structured log context for a WooCommerce order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param array    $extra Additional context fields.
	 * @return array
	 */
	public function get_order_log_context($order, $extra = array())
	{
		$context = is_array($extra) ? $extra : array();

		if ($order instanceof WC_Order) {
			$context['order_id'] = $order->get_id();
		}

		return $this->get_gateway_log_context($context);
	}

	/**
	 * Build a structured log context for a checkout payload.
	 *
	 * @param array $checkout_data Checkout payload.
	 * @param array $extra Additional context fields.
	 * @return array
	 */
	public function get_checkout_log_context($checkout_data, $extra = array())
	{
		$context = is_array($extra) ? $extra : array();
		$checkout_data = is_array($checkout_data) ? $checkout_data : array();

		if (!empty($checkout_data['id'])) {
			$context['checkout_id'] = sanitize_text_field((string) $checkout_data['id']);
		}

		if (!empty($checkout_data['checkout_reference'])) {
			$context['checkout_reference'] = sanitize_text_field((string) $checkout_data['checkout_reference']);
		}

		return $this->get_gateway_log_context($context);
	}

	/**
	 * Attach gateway-level identifiers to log context.
	 *
	 * @param array $context Structured context.
	 * @return array
	 */
	private function get_gateway_log_context($context = array())
	{
		$context = is_array($context) ? $context : array();

		if (!empty($this->merchant_id)) {
			$context['merchant_code'] = $this->merchant_id;
		}

		return $context;
	}

	/**
	 * Determine whether a stored checkout should be recreated because the order drifted.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param mixed    $sumup_checkout Stored SumUp checkout data.
	 * @return bool
	 */
	public function should_refresh_checkout_for_order($order, $sumup_checkout)
	{
		if (!is_array($sumup_checkout) || empty($sumup_checkout['id'])) {
			return true;
		}

		$expected_reference = 'WC_SUMUP_' . $order->get_id();
		$checkout_reference = isset($sumup_checkout['checkout_reference']) ? sanitize_text_field($sumup_checkout['checkout_reference']) : '';
		if ($checkout_reference !== $expected_reference) {
			return true;
		}

		$checkout_status = isset($sumup_checkout['status']) ? sanitize_text_field($sumup_checkout['status']) : '';
		if ('PAID' === $checkout_status || !empty($sumup_checkout['transaction_code'])) {
			return false;
		}

		if ('FAILED' === $checkout_status) {
			return true;
		}

		$checkout_amount = isset($sumup_checkout['amount']) ? (float) $sumup_checkout['amount'] : null;
		if (null === $checkout_amount || abs($checkout_amount - (float) $order->get_total()) > 0.00001) {
			return true;
		}

		$checkout_currency = isset($sumup_checkout['currency']) ? strtoupper(sanitize_text_field($sumup_checkout['currency'])) : '';
		if ('' === $checkout_currency || $checkout_currency !== strtoupper($order->get_currency())) {
			return true;
		}

		if (
			empty($sumup_checkout['_sumup_context']) ||
			!is_array($sumup_checkout['_sumup_context'])
		) {
			return true;
		}

		$stored_context = $sumup_checkout['_sumup_context'];
		$stored_total = isset($stored_context['order_total']) ? (float) $stored_context['order_total'] : null;
		$stored_currency = isset($stored_context['currency']) ? strtoupper(sanitize_text_field($stored_context['currency'])) : '';
		$stored_billing_country = isset($stored_context['billing_country']) ? strtoupper(sanitize_text_field($stored_context['billing_country'])) : '';
		$stored_order_status = isset($stored_context['order_status']) ? sanitize_text_field($stored_context['order_status']) : '';

		if (null === $stored_total || abs($stored_total - (float) $order->get_total()) > 0.00001) {
			return true;
		}

		if ('' === $stored_currency || $stored_currency !== strtoupper($order->get_currency())) {
			return true;
		}

		if ($stored_billing_country !== strtoupper($order->get_billing_country())) {
			return true;
		}

		if ('' === $stored_order_status || $stored_order_status !== $order->get_status()) {
			return true;
		}

		return false;
	}

	/**
	 * Clear stale checkout data from the order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return void
	 */
	public function clear_checkout_for_order($order)
	{
		$order->delete_meta_data('_sumup_checkout_data');
		$order->save();
	}

	/**
	 * Persist pending voucher-style payment instructions against the order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param array    $instructions Pending payment instructions.
	 * @return void
	 */
	public function store_pending_payment_instructions($order, $instructions)
	{
		if (!is_array($instructions)) {
			$instructions = array();
		}

		$payment_method = isset($instructions['payment_method']) ? sanitize_text_field($instructions['payment_method']) : '';
		$normalized_instructions = array(
			'payment_method' => $payment_method,
			'pix_code' => isset($instructions['pix_code']) ? sanitize_textarea_field($instructions['pix_code']) : '',
			'qr_code_image' => isset($instructions['qr_code_image']) ? esc_url_raw($instructions['qr_code_image']) : '',
			'boleto_download_url' => isset($instructions['boleto_download_url']) ? esc_url_raw($instructions['boleto_download_url']) : '',
			'boleto_barcode' => isset($instructions['boleto_barcode']) ? sanitize_textarea_field($instructions['boleto_barcode']) : '',
			'stored_at' => time(),
		);

		$has_supported_payment_method = in_array($payment_method, array('boleto', 'pix', 'qr_code_pix'), true);
		$has_pix_instructions = in_array($payment_method, array('pix', 'qr_code_pix'), true) &&
			!empty($normalized_instructions['pix_code']) &&
			!empty($normalized_instructions['qr_code_image']);
		$has_boleto_instructions = 'boleto' === $payment_method &&
			!empty($normalized_instructions['boleto_download_url']) &&
			!empty($normalized_instructions['boleto_barcode']);

		if (!$has_supported_payment_method || (!$has_pix_instructions && !$has_boleto_instructions)) {
			$this->clear_pending_payment_instructions($order);
			return;
		}

		$order->update_meta_data('_sumup_pending_payment_instructions', $normalized_instructions);
		$order->save();
	}

	/**
	 * Fetch stored pending voucher-style payment instructions.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return array
	 */
	public function get_pending_payment_instructions($order)
	{
		$instructions = $order->get_meta('_sumup_pending_payment_instructions');

		return is_array($instructions) ? $instructions : array();
	}

	/**
	 * Clear stored pending voucher-style payment instructions from the order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return void
	 */
	public function clear_pending_payment_instructions($order)
	{
		$order->delete_meta_data('_sumup_pending_payment_instructions');
		$order->save();
	}

	/**
	 * Extract the transaction code from a checkout payload.
	 *
	 * @param array $checkout_data SumUp checkout payload.
	 * @return string
	 */
	private function extract_transaction_code($checkout_data)
	{
		$transaction_code = isset($checkout_data['transaction_code']) ? sanitize_text_field($checkout_data['transaction_code']) : '';
		if (!empty($transaction_code)) {
			return $transaction_code;
		}

		if (empty($checkout_data['transactions']) || !is_array($checkout_data['transactions'])) {
			return '';
		}

		foreach ($checkout_data['transactions'] as $transaction) {
			if (!is_array($transaction) || empty($transaction['transaction_code'])) {
				continue;
			}

			return sanitize_text_field($transaction['transaction_code']);
		}

		return '';
	}

	/**
	 * Ensure the fetched SumUp checkout still matches the local WooCommerce order.
	 *
	 * Webhook payloads are treated as untrusted hints; order mutations only happen once
	 * the latest remote checkout state is bound back to the local order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @param array    $checkout_data Latest checkout payload from SumUp.
	 * @param string   $checkout_id Checkout ID from the trigger path.
	 * @return array{valid: bool, error: string}
	 */
	private function validate_checkout_for_order($order, $checkout_data, $checkout_id = '')
	{
		$checkout_id = sanitize_text_field((string) $checkout_id);
		$stored_checkout = $order->get_meta('_sumup_checkout_data');
		$remote_checkout_id = isset($checkout_data['id']) ? sanitize_text_field($checkout_data['id']) : '';
		$expected_reference = 'WC_SUMUP_' . $order->get_id();
		$remote_reference = isset($checkout_data['checkout_reference']) ? sanitize_text_field($checkout_data['checkout_reference']) : '';
		$remote_currency = isset($checkout_data['currency']) ? strtoupper(sanitize_text_field($checkout_data['currency'])) : '';
		$order_currency = strtoupper($order->get_currency());
		$remote_amount = isset($checkout_data['amount']) ? (float) $checkout_data['amount'] : null;
		$order_amount = (float) $order->get_total();
		$has_stored_checkout = is_array($stored_checkout) && !empty($stored_checkout['id']);

		if ('' === $remote_checkout_id) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout ID is missing.',
			);
		}

		if ($expected_reference !== $remote_reference) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout reference does not match the order reference.',
			);
		}

		if ('' === $remote_currency || $order_currency !== $remote_currency) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout currency does not match the order currency.',
			);
		}

		if (null === $remote_amount || abs($remote_amount - $order_amount) > 0.00001) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout amount does not match the order total.',
			);
		}

		if ($has_stored_checkout) {
			$stored_checkout_id = sanitize_text_field($stored_checkout['id']);

			if ('' !== $checkout_id && $stored_checkout_id !== $checkout_id) {
				return array(
					'valid' => false,
					'error' => 'Triggered checkout ID does not match the order checkout ID.',
				);
			}

			if ($stored_checkout_id !== $remote_checkout_id) {
				return array(
					'valid' => false,
					'error' => 'Fetched checkout ID does not match the order checkout ID.',
				);
			}
		} elseif ('' !== $checkout_id && $remote_checkout_id !== $checkout_id) {
			return array(
				'valid' => false,
				'error' => 'Triggered checkout ID does not match the fetched checkout ID.',
			);
		}

		$remote_merchant_code = isset($checkout_data['merchant_code']) ? sanitize_text_field($checkout_data['merchant_code']) : '';
		if (!empty($this->merchant_id) && '' !== $remote_merchant_code && $this->merchant_id !== $remote_merchant_code) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout merchant does not match the configured merchant.',
			);
		}

		$remote_pay_to_email = isset($checkout_data['pay_to_email']) ? sanitize_email($checkout_data['pay_to_email']) : '';
		if (!empty($this->pay_to_email) && '' !== $remote_pay_to_email && strtolower($this->pay_to_email) !== strtolower($remote_pay_to_email)) {
			return array(
				'valid' => false,
				'error' => 'Fetched checkout pay-to email does not match the configured account.',
			);
		}

		if (!$has_stored_checkout) {
			$rebound_checkout = $this->enrich_checkout_data_for_order(
				$order,
				$checkout_data,
				!empty($checkout_data['isCheckoutBlocks'])
			);
			$order->update_meta_data('_sumup_checkout_data', $rebound_checkout);
			$order->save();
			WC_SUMUP_LOGGER::log(
				'Recovered missing SumUp checkout binding from remote checkout data.',
				$this->get_checkout_log_context(
					$rebound_checkout,
					$this->get_order_log_context(
						$order,
						array(
							'checkout_id' => $remote_checkout_id,
							'flow' => 'webhook_rebind',
						)
					)
				),
				'warning'
			);
		}

		return array(
			'valid' => true,
			'error' => '',
		);
	}

	/**
	 * Find WooCommerce order by checkout data
	 *
	 * @param array $checkout_data
	 * @param string $checkout_id
	 * @return WC_Order|false
	 */
	private function find_order_by_checkout($checkout_data, $checkout_id)
	{
		$checkout_reference = $checkout_data['checkout_reference'] ?? '';
		$order_id = str_replace('WC_SUMUP_', '', $checkout_reference);
		$order_id = intval($order_id);
		$order = wc_get_order($order_id);

		if ($order === false) {
			$this->log_order_not_found($checkout_id);
		}

		return $order;
	}

	/**
	 * Update order status based on payment status
	 *
	 * @param WC_Order $order
	 * @param array $checkout_data
	 * @param string $transaction_code
	 * @return void
	 */
	private function update_order_status($order, $checkout_data, $transaction_code)
	{
		$payment_status = $checkout_data['status'] ?? '';

		// Check if the current status isn't processing or completed.
		if (!$this->should_update_order_status($order)) {
			return;
		}

		if ($payment_status === 'PAID') {
			$this->process_paid_order($order, $transaction_code);
		} elseif ($payment_status === 'FAILED') {
			$this->process_failed_order($order);
		}
	}

	/**
	 * Check if order status should be updated
	 *
	 * @param WC_Order $order
	 * @return bool
	 */
	private function should_update_order_status($order)
	{
		return !in_array($order->get_status(), [
			'processing',
			'completed',
			'refunded',
			'cancelled'
		], true);
	}

	/**
	 * Process paid order
	 *
	 * @param WC_Order $order
	 * @param string $transaction_code
	 * @return void
	 */
	private function process_paid_order($order, $transaction_code)
	{
		$this->clear_pending_payment_instructions($order);
		$order->update_meta_data('_sumup_transaction_code', $transaction_code);

		// Updates current status unless it's a Virtual AND Downloadable product.
		if ($order->needs_processing()) {
			$order->update_status('processing');
		}

		$this->add_order_note($order, $transaction_code);
		$order->payment_complete($transaction_code);
		$this->execute_payment_complete_hooks($order);
		$order->save();
	}

	/**
	 * Process failed order
	 *
	 * @param WC_Order $order
	 * @return void
	 */
	private function process_failed_order($order)
	{
		$this->clear_pending_payment_instructions($order);
		$order->update_status('failed');
		$message = __('SumUp payment failed.', 'sumup-payment-gateway-for-woocommerce');
		$order->add_order_note($message);
		$order->save();
	}

	/**
	 * Add order note for successful payment
	 *
	 * @param WC_Order $order
	 * @param string $transaction_code
	 * @return void
	 */
	private function add_order_note($order, $transaction_code)
	{
		$message = sprintf(
			__('SumUp charge complete. Transaction Code: %s', 'sumup-payment-gateway-for-woocommerce'),
			$transaction_code
		);
		$order->add_order_note($message);
	}

	/**
	 * Execute payment complete hooks
	 *
	 * @param WC_Order $order
	 * @return void
	 */
	private function execute_payment_complete_hooks($order)
	{
		do_action('sumup_gateway_payment_complete_from_hook', $order);
		do_action('sumup_gateway_payment_complete', $order);
	}

	// Logging methods
	private function log_invalid_event_type($event_type, $checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Invalid event type on webhook.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'event_type' => $event_type,
					'checkout_id' => $checkout_id,
				)
			),
			'warning'
		);
	}

	private function log_webhook_processing($event_type, $checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Handling webhook.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'event_type' => $event_type,
					'checkout_id' => $checkout_id,
				)
			),
			'info'
		);
	}

	private function log_access_token_error($checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Error while retrieving access token during webhook processing.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => $checkout_id,
				)
			),
			'error'
		);
	}

	private function log_checkout_data_error($checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Error while retrieving checkout data during webhook processing.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => $checkout_id,
				)
			),
			'error'
		);
	}

	private function log_order_not_found($checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Order not found during webhook processing.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => $checkout_id,
				)
			),
			'error'
		);
	}

	private function log_missing_transaction_code($checkout_id)
	{
		WC_SUMUP_LOGGER::log(
			'Missing transaction code during webhook processing.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook',
					'checkout_id' => $checkout_id,
				)
			),
			'warning'
		);
	}

	private function log_checkout_validation_error($order_id, $checkout_id, $error)
	{
		$order = wc_get_order($order_id);
		$context = array(
			'flow' => 'checkout_validation',
			'checkout_id' => $checkout_id,
			'error' => $error,
		);

		if ($order instanceof WC_Order) {
			$context = $this->get_order_log_context($order, $context);
		} else {
			$context['order_id'] = $order_id;
			$context = $this->get_gateway_log_context($context);
		}

		WC_SUMUP_LOGGER::log('Checkout validation failed.', $context, 'warning');
	}

	/**
	 * Handle webhook with retry logic and exponential backoff
	 *
	 * @param array $data Webhook data
	 * @param int $attempt Current attempt number
	 * @return void
	 */
	public function handle_webhook_order_with_retry($data, $attempt = 1)
	{
		$attempt = is_numeric($attempt) ? (int) $attempt : 1;
		if ($attempt < 1) {
			$attempt = 1;
		}

		$max_attempts = $this->webhook_retry_attempts;
		$checkout_id = $data['id'] ?? '';
		$performance_tracker = $this->start_performance_tracking();

		$this->log_webhook_attempt($attempt, $max_attempts, $checkout_id, $performance_tracker);

		try {
			$result = $this->process_webhook_data($data);

			if ($result['success']) {
				$this->log_webhook_success($checkout_id, $attempt, $performance_tracker);
				return;
			}

			$this->handle_webhook_failure($data, $attempt, $max_attempts, $result);
		} catch (Exception $e) {
			$this->handle_webhook_exception($data, $attempt, $max_attempts, $e, $checkout_id);
		}
	}

	/**
	 * Start performance tracking
	 *
	 * @return string
	 */
	private function start_performance_tracking()
	{
		return date('Y-m-d H:i:s');
	}

	/**
	 * Calculate execution time
	 *
	 * @param string $start_time
	 * @return int
	 */
	private function calculate_execution_time($start_time)
	{
		$end_time = date('Y-m-d H:i:s');
		$start = new DateTime($start_time);
		$end = new DateTime($end_time);
		$interval = $end->diff($start);
		return $interval->s + ($interval->i * 60) + ($interval->h * 3600) + ($interval->days * 86400);
	}

	/**
	 * Handle webhook processing failure
	 *
	 * @param array $data
	 * @param int $attempt
	 * @param int $max_attempts
	 * @param array $result
	 * @return void
	 */
	private function handle_webhook_failure($data, $attempt, $max_attempts, $result)
	{
		$checkout_id = $data['id'] ?? '';

		// Retry logic for non-critical errors
		if ($this->should_retry_webhook($attempt, $max_attempts, $result['critical_error'])) {
			$this->schedule_webhook_retry($data, $attempt + 1);
			return;
		}

		// Maximum attempts reached or critical error occurred
		$this->log_webhook_final_failure($checkout_id, $attempt, $result['error']);
		$this->handle_webhook_final_failure($data, $result['error']);
	}

	/**
	 * Handle webhook processing exception
	 *
	 * @param array $data
	 * @param int $attempt
	 * @param int $max_attempts
	 * @param Exception $e
	 * @param string $checkout_id
	 * @return void
	 */
	private function handle_webhook_exception($data, $attempt, $max_attempts, $e, $checkout_id)
	{
		$this->log_webhook_exception($attempt, $checkout_id, $e->getMessage());

		if ($this->should_retry_webhook($attempt, $max_attempts, false)) {
			$this->schedule_webhook_retry($data, $attempt + 1);
		} else {
			$this->handle_webhook_final_failure($data, $e->getMessage());
		}
	}

	/**
	 * Check if webhook should be retried
	 *
	 * @param int $attempt
	 * @param int $max_attempts
	 * @param bool $is_critical_error
	 * @return bool
	 */
	private function should_retry_webhook($attempt, $max_attempts, $is_critical_error)
	{
		return $attempt < $max_attempts && !$is_critical_error;
	}

	// Performance and retry logging methods
	private function log_webhook_attempt($attempt, $max_attempts, $checkout_id, $start_time)
	{
		WC_SUMUP_LOGGER::log(
			'Processing webhook attempt.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'attempt' => $attempt,
					'max_attempts' => $max_attempts,
					'checkout_id' => $checkout_id,
					'started_at' => $start_time,
				)
			),
			'info'
		);
	}

	private function log_webhook_success($checkout_id, $attempt, $start_time)
	{
		$execution_time = $this->calculate_execution_time($start_time);
		$end_time = date('Y-m-d H:i:s');
		WC_SUMUP_LOGGER::log(
			'Webhook processed successfully.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'attempt' => $attempt,
					'checkout_id' => $checkout_id,
					'finished_at' => $end_time,
					'execution_time_seconds' => $execution_time,
				)
			),
			'info'
		);
	}

	private function log_webhook_final_failure($checkout_id, $attempt, $error)
	{
		WC_SUMUP_LOGGER::log(
			'Webhook failed after all retry attempts.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'attempt' => $attempt,
					'checkout_id' => $checkout_id,
					'error' => $error,
				)
			),
			'error'
		);
	}

	private function log_webhook_exception($attempt, $checkout_id, $error)
	{
		WC_SUMUP_LOGGER::log(
			'Exception during webhook processing.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'attempt' => $attempt,
					'checkout_id' => $checkout_id,
					'error' => $error,
				)
			),
			'error'
		);
	}

	/**
	 * Process webhook data and return result
	 *
	 * @param array $data Webhook data
	 * @return array Result with success status and error info
	 */
	private function process_webhook_data($data)
	{
		// Validate webhook data structure
		$validation_result = $this->validate_webhook_request($data);
		if (!$validation_result['valid']) {
			return [
				'success' => false,
				'critical_error' => $validation_result['critical'],
				'error' => $validation_result['error']
			];
		}

		$checkout_id = sanitize_text_field($data['id']);

		// Get access token
		$log_context = $this->get_gateway_log_context(
			array(
				'flow' => 'webhook_retry',
				'checkout_id' => $checkout_id,
			)
		);

		$access_token = $this->get_access_token($log_context);
		if (empty($access_token)) {
			return [
				'success' => false,
				'critical_error' => false,
				'error' => 'Failed to obtain access token'
			];
		}

		// Fetch checkout data
		$checkout_data = $this->fetch_checkout_data($checkout_id, $access_token, $log_context);
		if (empty($checkout_data)) {
			return [
				'success' => false,
				'critical_error' => false,
				'error' => 'Failed to obtain checkout data'
			];
		}

		// Process the order
		return $this->process_order_from_checkout($checkout_data, $checkout_id);
	}

	/**
	 * Validate webhook request data
	 *
	 * @param array $data
	 * @return array
	 */
	private function validate_webhook_request($data)
	{
		if (!$this->validate_webhook_data($data)) {
			return [
				'valid' => false,
				'critical' => true,
				'error' => 'Invalid webhook data'
			];
		}

		$event_type = sanitize_text_field($data['event_type']);
		if (!$this->validate_event_type($event_type)) {
			return [
				'valid' => false,
				'critical' => true,
				'error' => 'Invalid event type: ' . $event_type
			];
		}

		return [
			'valid' => true,
			'critical' => false,
			'error' => ''
		];
	}

	/**
	 * Process order from checkout data
	 *
	 * @param array $checkout_data Checkout data from SumUp API
	 * @param string $checkout_id Checkout ID
	 * @return array Result array
	 */
	private function process_order_from_checkout($checkout_data, $checkout_id)
	{
		// Find the order
		$order = $this->find_order_by_checkout($checkout_data, $checkout_id);
		if ($order === false) {
			return [
				'success' => false,
				'critical_error' => true,
				'error' => 'Order not found: ' . $this->extract_order_id($checkout_data)
			];
		}

		$validation_result = $this->validate_checkout_for_order($order, $checkout_data, $checkout_id);
		if (!$validation_result['valid']) {
			$this->log_checkout_validation_error($order->get_id(), $checkout_id, $validation_result['error']);
			return [
				'success' => false,
				'critical_error' => true,
				'error' => $validation_result['error'],
			];
		}

		$payment_status = $checkout_data['status'] ?? '';

		// Validate transaction code
		$transaction_code = $this->extract_transaction_code($checkout_data);
		if ($payment_status === 'PAID' && empty($transaction_code)) {
			return [
				'success' => false,
				'critical_error' => false,
				'error' => 'Transaction code is missing'
			];
		}

		// Update order status
		$this->update_order_status($order, $checkout_data, $transaction_code);

		return [
			'success' => true,
			'critical_error' => false,
			'error' => 'Order processed successfully'
		];
	}

	/**
	 * Extract order ID from checkout data
	 *
	 * @param array $checkout_data
	 * @return int
	 */
	private function extract_order_id($checkout_data)
	{
		$checkout_reference = $checkout_data['checkout_reference'] ?? '';
		$order_id = str_replace('WC_SUMUP_', '', $checkout_reference);
		return intval($order_id);
	}

	/**
	 * Schedule webhook retry with exponential backoff
	 *
	 * @param array $data Webhook data
	 * @param int $attempt Next attempt number
	 * @return void
	 */
	private function schedule_webhook_retry($data, $attempt)
	{
		$delay_seconds = $this->calculate_retry_delay($attempt);
		$payload = $this->build_webhook_payload($data);
		$checkout_id = $payload['id'] ?? '';

		$this->log_webhook_retry_scheduled($delay_seconds, $attempt, $checkout_id);
		$this->schedule_retry_action($payload, $attempt, $delay_seconds);
	}

	/**
	 * Calculate retry delay with exponential backoff
	 *
	 * @param int $attempt
	 * @return int Delay in seconds
	 */
	private function calculate_retry_delay($attempt)
	{
		$delay_minutes = pow(2, $attempt - 1);
		return $delay_minutes * 60;
	}

	/**
	 * Schedule retry action in ActionScheduler
	 *
	 * @param array $payload
	 * @param int $attempt
	 * @param int $delay_seconds
	 * @return void
	 */
	private function schedule_retry_action($payload, $attempt, $delay_seconds)
	{
		as_schedule_single_action(
			time() + $delay_seconds,
			'process_webhook_order_priority',
			[$payload, $attempt],
			'sumup-webhooks-priority',
			true,
			5 // Medium priority for retries
		);
	}

	/**
	 * Log webhook retry scheduling
	 *
	 * @param int $delay_seconds
	 * @param int $attempt
	 * @param string $checkout_id
	 * @return void
	 */
	private function log_webhook_retry_scheduled($delay_seconds, $attempt, $checkout_id)
	{
		$delay_minutes = $delay_seconds / 60;
		WC_SUMUP_LOGGER::log(
			'Scheduling webhook retry.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'attempt' => $attempt,
					'checkout_id' => $checkout_id,
					'retry_delay_minutes' => $delay_minutes,
				)
			),
			'warning'
		);
	}

	/**
	 * Handle final webhook failure after all retries
	 *
	 * @param array $data Webhook data
	 * @param string $error Error message
	 * @return void
	 */
	private function handle_webhook_final_failure($data, $error)
	{
		$checkout_id = $data['id'] ?? '';

		WC_SUMUP_LOGGER::log(
			'Critical webhook failure after all retry attempts.',
			$this->get_gateway_log_context(
				array(
					'flow' => 'webhook_retry',
					'checkout_id' => $checkout_id,
					'error' => $error,
				)
			),
			'critical'
		);
	}

	/**
	 * Method used on flows with redirect (like 3Ds)
	 */
	public function check_redirect_flow()
	{
		if (!isset($_GET['sumup-validate-order'])) {
			return;
		}

		$order_id = isset($_GET['sumup-validate-order']) ? absint(wp_unslash($_GET['sumup-validate-order'])) : 0;
		if (!$order_id) {
			return;
		}

		$url_checkout_id = isset($_GET['checkout_id']) ? sanitize_text_field(wp_unslash($_GET['checkout_id'])) : '';

		$this->resolve_payment_redirect_validation($order_id, $url_checkout_id, true);
	}

	/**
	 * Resolve payment status after SumUp redirect (3DS and similar flows).
	 *
	 * @param int    $order_id Order ID from the redirect query string.
	 * @param string $url_checkout_id Optional checkout ID from the redirect query string.
	 * @param bool   $redirect Whether to redirect or return a result array.
	 * @return array<string, mixed>
	 */
	public function resolve_payment_redirect_validation($order_id, $url_checkout_id = '', $redirect = true)
	{
		$order_id = absint($order_id);
		$url_checkout_id = sanitize_text_field((string) $url_checkout_id);
		$result = array(
			'status' => '',
			'message' => '',
			'redirect_url' => '',
			'is_blocks' => false,
			'cart_restored' => false,
			'error' => '',
		);

		if (!$order_id) {
			$result['error'] = __('Invalid order ID.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$order = wc_get_order($order_id);
		if ($order === false) {
			WC_SUMUP_LOGGER::log(
				'Order not found during payment redirect validation.',
				$this->get_gateway_log_context(
					array(
						'flow' => 'redirect_validation',
						'order_id' => $order_id,
					)
				),
				'error'
			);
			$result['error'] = __('Order not found.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$log_context = $this->get_order_log_context($order, array('flow' => 'redirect_validation'));

		$checkout_data = $order->get_meta('_sumup_checkout_data');
		if (!is_array($checkout_data) || empty($checkout_data['id'])) {
			WC_SUMUP_LOGGER::log('Stored checkout data is missing during payment redirect validation.', $log_context, 'warning');
			$result['error'] = __('Payment details are missing for this order.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$result['is_blocks'] = !empty($checkout_data['isCheckoutBlocks']);
		$checkout_id = '' !== $url_checkout_id ? $url_checkout_id : sanitize_text_field((string) $checkout_data['id']);

		$access_token = Wc_Sumup_Access_Token::get($this->client_id, $this->client_secret, $this->api_key, false, array_merge($log_context, array('checkout_id' => $checkout_id)));
		$access_token = $access_token['access_token'] ?? '';
		if (empty($access_token)) {
			WC_SUMUP_LOGGER::log('Error while retrieving access token during payment redirect validation.', array_merge($log_context, array('checkout_id' => $checkout_id)), 'error');
			$result['error'] = __('SumUp is temporarily unavailable. Please try again.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$sumup_checkout = Wc_Sumup_Checkout::get($checkout_id, $access_token, array_merge($log_context, array('checkout_id' => $checkout_id)));
		if (empty($sumup_checkout)) {
			WC_SUMUP_LOGGER::log('Error while retrieving checkout during payment redirect validation.', array_merge($log_context, array('checkout_id' => $checkout_id)), 'error');
			$result['error'] = __('Unable to verify payment status. Please try again.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$validation_result = $this->validate_checkout_for_order($order, $sumup_checkout, $checkout_id);
		if (!$validation_result['valid']) {
			$this->log_checkout_validation_error($order_id, $checkout_id, $validation_result['error']);
			if ($redirect) {
				wp_safe_redirect($this->get_return_url($order));
				exit;
			}
			$result['error'] = __('Payment validation failed.', 'sumup-payment-gateway-for-woocommerce');
			return $result;
		}

		$payment_status = $sumup_checkout['status'] ?? '';
		$result['status'] = strtolower((string) $payment_status);

		if ($payment_status === 'PENDING') {
			$result['message'] = __('We are still waiting for SumUp to confirm this payment. Please wait a moment and refresh the page if the order is not updated automatically.', 'sumup-payment-gateway-for-woocommerce');

			if ($result['is_blocks']) {
				if ($redirect) {
					wp_safe_redirect(
						add_query_arg('sumup_payment', 'pending', wc_get_checkout_url())
					);
					exit;
				}
				return $result;
			}

			if ($redirect) {
				add_action('woocommerce_before_checkout_form', array($this, 'redirect_validation_pending_message'));
			}
			return $result;
		}

		if ($payment_status === 'FAILED') {
			$order->update_status('failed');
			$result['message'] = __('Payment failed, please try again.', 'sumup-payment-gateway-for-woocommerce');

			if ($result['is_blocks']) {
				$result['cart_restored'] = $this->restore_cart_from_order($order);

				if ($redirect) {
					wp_safe_redirect(
						add_query_arg('sumup_payment', 'failed', wc_get_checkout_url())
					);
					exit;
				}

				return $result;
			}

			if ($redirect) {
				add_action('woocommerce_before_checkout_form', array($this, 'redirect_validation_failed_message'));
			}
			return $result;
		}

		$transaction_code = $this->extract_transaction_code($sumup_checkout);

		if ($payment_status === 'PAID' && empty($transaction_code)) {
			WC_SUMUP_LOGGER::log('Missing transaction code during payment redirect validation.', array_merge($log_context, array('checkout_id' => $checkout_id)), 'warning');
			$result['status'] = 'pending';
			$result['message'] = __('We are still waiting for SumUp to confirm this payment. Please wait a moment and refresh the page if the order is not updated automatically.', 'sumup-payment-gateway-for-woocommerce');

			if ($result['is_blocks']) {
				if ($redirect) {
					wp_safe_redirect(
						add_query_arg('sumup_payment', 'pending', wc_get_checkout_url())
					);
					exit;
				}
				return $result;
			}

			if ($redirect) {
				add_action('woocommerce_before_checkout_form', array($this, 'redirect_validation_pending_message'));
			}
			return $result;
		}

		if ($payment_status === 'PAID') {
			$this->update_order_status($order, $sumup_checkout, $transaction_code);
			$result['status'] = 'paid';
			$result['redirect_url'] = $this->get_return_url($order);

			if ($redirect) {
				wp_safe_redirect($result['redirect_url']);
				exit;
			}

			return $result;
		}

		return $result;
	}

	/**
	 * Restore the current cart from a WooCommerce order.
	 *
	 * @param WC_Order $order WooCommerce order.
	 * @return bool
	 */
	public function restore_cart_from_order($order)
	{
		if (!$order instanceof WC_Order) {
			return false;
		}

		if (null === WC()->cart) {
			wc_load_cart();
		}

		if (!WC()->cart) {
			return false;
		}

		WC()->cart->empty_cart();

		foreach ($order->get_items('line_item') as $item) {
			if (!$item instanceof WC_Order_Item_Product) {
				continue;
			}

			$product_id = (int) $item->get_product_id();
			$variation_id = (int) $item->get_variation_id();
			$quantity = $item->get_quantity();

			if ($product_id <= 0 || $quantity <= 0) {
				continue;
			}

			$variation_attributes = array();

			if ($variation_id > 0) {
				$variation = wc_get_product($variation_id);
				if ($variation instanceof WC_Product_Variation) {
					$variation_attributes = $variation->get_variation_attributes();
				}
			}

			WC()->cart->add_to_cart(
				$product_id,
				$quantity,
				$variation_id,
				$variation_attributes
			);
		}

		foreach ($order->get_coupon_codes() as $code) {
			WC()->cart->apply_coupon($code);
		}

		WC()->cart->calculate_totals();

		return true;
	}

	/**
	 * Redirect validation failed message
	 */
	public function redirect_validation_failed_message()
	{
		$failed_message = sprintf(
			'<div class="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout woocommerce-error">%1$s</div>',
			__('Payment failed, please try again.', 'sumup-payment-gateway-for-woocommerce')
		);
		echo wp_kses_post($failed_message);

	?>
		<script>
			if (document.readyState === 'complete') {
				sumUpSubmitOrderAfterRedirect();
			} else {
				window.addEventListener('load', () => {
					sumUpSubmitOrderAfterRedirect();
				});
			}

			function sumUpSubmitOrderAfterRedirect() {
				const submitOrderButton = document.querySelector('form button#place_order');
				if (submitOrderButton) {
					submitOrderButton.click();
				}
			}
		</script>
		<?php
	}

	/**
	 * Redirect validation pending message
	 *
	 * @return void
	 */
	public function redirect_validation_pending_message()
	{
		$pending_message = sprintf(
			'<div class="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout woocommerce-info">%1$s</div>',
			__('We are still waiting for SumUp to confirm this payment. Please wait a moment and refresh the page if the order is not updated automatically.', 'sumup-payment-gateway-for-woocommerce')
		);
		echo wp_kses_post($pending_message);
	}

	/**
	 * Initialise gateway settings form fields
	 *
	 * @since   1.0.0
	 * @version 1.0.0
	 */
	public function init_form_fields()
	{
		$this->form_fields = require WC_SUMUP_PLUGIN_PATH . '/includes/class-wc-sumup-settings.php';
	}

	/**
	 * Process the payment.
	 *
	 * @param int $order_id
	 * @since     1.0.0
	 * @version   1.0.0
	 */
	public function process_payment($order_id)
	{
		$order = wc_get_order($order_id);
		if (!$order instanceof WC_Order) {
			return [
				'result' => 'failure',
				'redirect' => false,
				'openModal' => false,
				'messages' => __('Order ID is not available to make the payment. Try again soon or contact the website support.', 'sumup-payment-gateway-for-woocommerce'),
			];
		}

		$log_context = $this->get_order_log_context($order, array('flow' => 'process_payment'));

		$sumup_checkout = $order->get_meta('_sumup_checkout_data');
		$previous_sumup_checkout = is_array($sumup_checkout) ? $sumup_checkout : array();
		$is_checkout_blocks = $this->is_blocks_checkout_request($sumup_checkout);

		if ($this->should_refresh_checkout_for_order($order, $sumup_checkout)) {
			if (!empty($sumup_checkout['id'])) {
				WC_SUMUP_LOGGER::log('Refreshing stored SumUp checkout because the order context changed.', $this->get_checkout_log_context($sumup_checkout, $log_context), 'info');
			}
			$sumup_checkout = array();
		} else {
			$sumup_checkout = $this->enrich_checkout_data_for_order(
				$order,
				$sumup_checkout,
				$is_checkout_blocks
			);
		}

		$access_token = Wc_Sumup_Access_Token::get($this->client_id, $this->client_secret, $this->api_key, false, $log_context);
		if (!isset($access_token['access_token'])) {
			WC_SUMUP_LOGGER::log('Error on request to get access token.', $log_context, 'error');
			$message = current_user_can('manage_options') ? 'Error to generate SumUp access token.' : 'Sorry, SumUp is not available. Try again soon.';

			if (!sumup_gateway_is_configured($this->settings)) {
				if ($is_checkout_blocks) {
					throw new Exception($message);
				} else {
					return [
						'result' => 'failure',
						'redirect' => false,
						'openModal' => false,
						'messages' => $message,
					];
				}
			}
			return false; // Evita continuar a execução se não houver token
		}

		$sumup_settings = get_option('woocommerce_sumup_settings', []);
		$sumup_settings['sumup_access_token'] = $access_token['access_token'];
		$sumup_settings['sumup_token_fetched_date'] = date('Y/m/d H:i:s');
		update_option('woocommerce_sumup_settings', $sumup_settings);

		if (empty($sumup_checkout) || !isset($sumup_checkout['id'])) {
			$checkout_data = $this->build_checkout_request_data($order);
			$sumup_checkout = Wc_Sumup_Checkout::create($sumup_settings['sumup_access_token'], $checkout_data, $log_context);
			if (empty($sumup_checkout) || !isset($sumup_checkout['id'])) {
				$error_message = isset($sumup_checkout['error_code']) ?
					"{$sumup_checkout['error_code']} : {$sumup_checkout['message']}" :
					'Error on request (cURL) to create SumUp checkout ID during request to SumUp.';

				WC_SUMUP_LOGGER::log(
					'SumUp checkout creation failed during payment processing.',
					array_merge(
						$this->get_checkout_log_context($sumup_checkout, $log_context),
						array(
							'error' => $error_message,
							'error_code' => $sumup_checkout['error_code'] ?? '',
						)
					),
					'warning'
				);

				if (
					isset($sumup_checkout['error_code']) &&
					$sumup_checkout['error_code'] === 'DUPLICATED_CHECKOUT' &&
					!empty($previous_sumup_checkout['id'])
				) {
					$sumup_checkout = $this->enrich_checkout_data_for_order(
						$order,
						$previous_sumup_checkout,
						$is_checkout_blocks || !empty($previous_sumup_checkout['isCheckoutBlocks'])
					);
					$order->update_meta_data('_sumup_checkout_data', $sumup_checkout);
					$order->save();
					WC_SUMUP_LOGGER::log('Reusing previously stored SumUp checkout after duplicate checkout response.', $this->get_checkout_log_context($sumup_checkout, $log_context), 'notice');
				}

				$message = current_user_can('manage_options') ? 'Error to generate SumUp checkout ID.' : 'Sorry, SumUp is not available. Try again soon.';
				if (!empty($sumup_checkout) && isset($sumup_checkout['id'])) {
					return array_merge($this->get_widget_context_for_order($order), [
						'result' => 'success',
						'redirect' => $this->get_return_url($order),
						'openModal' => true,
						'checkoutId' => $sumup_checkout['id'],
					]);
				}

				if ($is_checkout_blocks) {
					throw new Exception($message);
				} else {
					return [
						'result' => 'failure',
						'redirect' => false,
						'openModal' => false,
						'messages' => $message,
					];
				}
			}

			$sumup_checkout = $this->enrich_checkout_data_for_order(
				$order,
				$sumup_checkout,
				$is_checkout_blocks
			);
			$order->add_order_note('SumUp checkout ID: ' . $sumup_checkout['id']);
			$order->update_meta_data('_sumup_checkout_data', $sumup_checkout);
			$order->save();
		}

		/**
		 * Fallback to fill merchant code to "old" users.
		 * Temporary solution while SumUp team check other ways to enable request to get merchant_code.
		 */
		if (empty($this->merchant_id) && isset($sumup_checkout['merchant_code'])) {
			$this->update_option('merchant_id', $sumup_checkout['merchant_code']);
		}

		if (isset($sumup_checkout['id'])) {
			return array_merge($this->get_widget_context_for_order($order), [
				'result' => 'success',
				'redirect' => $this->get_return_url($order),
				'openModal' => true,
				'checkoutId' => $sumup_checkout['id'],
			]);
		}

		$message = 'Error to get checkout ID. Check plugin logs.';
		if ($is_checkout_blocks) {
			throw new Exception($message);
		}

		return [
			'result' => 'failure',
			'redirect' => false,
			'openModal' => false,
			'messages' => $message,
		];
	}

	/**
	 * Builds our payment fields area. Initializes the SumUp's Card Widget.
	 *
	 * @since    1.0.0;
	 * @version  1.0.0;
	 */
	public function payment_fields()
	{
		if (!is_checkout()) {
			return;
		}

		if (!sumup_gateway_is_configured($this->settings)) {
			esc_html_e('Error: Merchant account settings are incorrectly configured. Check the plugin settings page.', 'sumup-payment-gateway-for-woocommerce');
			return;
		}

		if (!is_wc_endpoint_url('order-pay')) {
			echo '<p>' . esc_html($this->description) . '</p>';
			$extra_class = $this->open_payment_in_modal === 'yes' ? 'modal' : 'no-modal';

		?>
			<div id="wc-sumup-payment-modal" class="wc-sumup-modal disabled <?php echo esc_attr($extra_class); ?>">
				<div id="sumup-card">
					<button id="wc-sumup-payment-modal-close" type="button" aria-label="<?php esc_attr_e( 'Close payment modal', 'sumup-payment-gateway-for-woocommerce' ); ?>">
						<span id="wc-sumup-payment-modal-close-btn" aria-hidden="true"></span>
					</button>
				</div>
			</div>
		<?php
			return;
		}

		/**
		 * Required fileds to request somethings to SumUp - Refator to meke the first verification more complete.
		 */
		if (empty($this->merchant_id) && empty($this->pay_to_email)) {
			WC_SUMUP_LOGGER::log(
				'Gateway configuration is incomplete: missing Merchant code.',
				$this->get_gateway_log_context(array('flow' => 'order_pay')),
				'error'
			);
			$message = current_user_can('manage_options')
				? __('Please fill "Merchant code" on the plugin settings.', 'sumup-payment-gateway-for-woocommerce')
				: __('Sorry, SumUp is not available. Try again soon.', 'sumup-payment-gateway-for-woocommerce');
			echo $this->print_error_message($message);
			return;
		}

		$description = $this->get_description();
		if ($description) {
			echo wp_kses_post(wpautop(wptexturize($description)));
		}

		$total = WC_Payment_Gateway::get_order_total();

		$sumup_settings = get_option('woocommerce_sumup_settings', false);
		if (empty($sumup_settings)) {
			$unavaliable_message = sprintf(
				'<p>%s</p>',
				__('Sum up is temporarily unavailable. Please contact site admin for more information.', 'sumup-payment-gateway-for-woocommerce'),
			);

			echo wp_kses_post($unavaliable_message);
			return;
		}

		$order_id = absint(get_query_var('order-pay'));
		$order = wc_get_order($order_id);
		if ($order === false) {
			echo '<p>' . __('Order ID is not available to make the payment. Try again soon or contact the website support.', 'sumup-payment-gateway-for-woocommerce') . '</p>';
			return;
		}

		$log_context = $this->get_order_log_context($order, array('flow' => 'order_pay'));

		$access_token = Wc_Sumup_Access_Token::get($this->client_id, $this->client_secret, $this->api_key, false, $log_context);
		if (!isset($access_token['access_token'])) {
			WC_SUMUP_LOGGER::log('Error on request to get access token.', $log_context, 'error');
			$message = current_user_can('manage_options') ? 'Error to generate SumUp access token.' : 'Sorry, SumUp is not available. Try again soon.';
			echo $this->print_error_message($message);
			return;
		}

		$sumup_settings['sumup_access_token'] = $access_token['access_token'];
		$sumup_settings['sumup_token_fetched_date'] = date('Y/m/d H:i:s');
		update_option('woocommerce_sumup_settings', $sumup_settings);

		$order_key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
		$order_access = $this->validate_order_access_for_checkout($order, $order_key);
		if (!$order_access['valid']) {
			WC_SUMUP_LOGGER::log('Rejected order-pay rendering because order validation failed.', $this->get_order_log_context($order, array('flow' => 'order_pay')), 'warning');
			echo $this->print_error_message($order_access['error']);
			return;
		}

		$sumup_checkout = $order->get_meta('_sumup_checkout_data');
		$previous_sumup_checkout = is_array($sumup_checkout) ? $sumup_checkout : array();
		if ($this->should_refresh_checkout_for_order($order, $sumup_checkout)) {
			if (!empty($sumup_checkout['id'])) {
				WC_SUMUP_LOGGER::log('Refreshing stored SumUp checkout before rendering payment fields because the order context changed.', $this->get_checkout_log_context($sumup_checkout, $log_context), 'info');
			}
			$this->clear_checkout_for_order($order);
			$sumup_checkout = array();
		} else {
			$sumup_checkout = $this->enrich_checkout_data_for_order(
				$order,
				$sumup_checkout,
				!empty($sumup_checkout['isCheckoutBlocks'])
			);
		}

		if (empty($sumup_checkout)) {
			$checkout_data = $this->build_checkout_request_data($order);
			$sumup_checkout = Wc_Sumup_Checkout::create($sumup_settings['sumup_access_token'], $checkout_data, $log_context);
			if (empty($sumup_checkout) || !isset($sumup_checkout['id'])) {
				$error_message = isset($sumup_checkout['error_code']) ?
					"{$sumup_checkout['error_code']} : {$sumup_checkout['message']}" :
					'Error on request (cURL) to create SumUp checkout ID. Merchant Id: ' . $this->merchant_id;

				WC_SUMUP_LOGGER::log(
					'SumUp checkout creation failed during order-pay rendering.',
					array_merge(
						$this->get_checkout_log_context($sumup_checkout, $log_context),
						array(
							'error' => $error_message,
							'error_code' => $sumup_checkout['error_code'] ?? '',
						)
					),
					'warning'
				);

				if (
					isset($sumup_checkout['error_code']) &&
					$sumup_checkout['error_code'] === 'DUPLICATED_CHECKOUT' &&
					!empty($previous_sumup_checkout['id'])
				) {
					$sumup_checkout = $this->enrich_checkout_data_for_order($order, $previous_sumup_checkout);
					$order->update_meta_data('_sumup_checkout_data', $sumup_checkout);
					$order->save();
					WC_SUMUP_LOGGER::log('Reusing previously stored SumUp checkout on order-pay after duplicate checkout response.', $this->get_checkout_log_context($sumup_checkout, $log_context), 'notice');
				}

				if (!isset($sumup_checkout['id'])) {
					$message = current_user_can('manage_options') ? 'Error to generate SumUp checkout id.' : 'Sorry, SumUp is not available. Try again soon.';
					echo $this->print_error_message($message);
					return;
				}
			}
			$sumup_checkout = $this->enrich_checkout_data_for_order($order, $sumup_checkout);
			$order->update_meta_data('_sumup_checkout_data', $sumup_checkout);
			$order->save();
		}

		/**
		 * Fallback to fill merchant code to "old" users. Temporary solution while SumUp team check other ways to enable request to get merchant_code.
		 */
		if (empty($this->merchant_id) && isset($sumup_checkout['merchant_code'])) {
			$this->update_option('merchant_id', $sumup_checkout['merchant_code']);
		}

		if (isset($sumup_checkout['id'])) {
			$extra_class = $this->open_payment_in_modal === 'yes' ? '' : 'no-modal';
			$widget_context = $this->get_widget_context_for_order($order);

		?>
			<div id="wc-sumup-payment-modal" class="wc-sumup-modal disabled <?php echo esc_attr($extra_class); ?>">
				<div id="sumup-card">
					<button id="wc-sumup-payment-modal-close" type="button" aria-label="<?php esc_attr_e( 'Close payment modal', 'sumup-payment-gateway-for-woocommerce' ); ?>">
						<span id="wc-sumup-payment-modal-close-btn" aria-hidden="true"></span>
					</button>
				</div>
			</div>

			<script type="text/javascript">
				let orderPayWidgetOptions = {
					checkoutId: '<?php echo esc_js($sumup_checkout['id']); ?>',
					country: '<?php echo esc_js($widget_context['country']); ?>',
					firstName: '<?php echo esc_js($widget_context['firstName']); ?>',
					lastName: '<?php echo esc_js($widget_context['lastName']); ?>',
					email: '<?php echo esc_js($widget_context['email']); ?>',
					phoneNumber: '<?php echo esc_js($widget_context['phoneNumber']); ?>',
					city: '<?php echo esc_js($widget_context['city']); ?>',
					street: '<?php echo esc_js($widget_context['street']); ?>',
					streetNumber: '<?php echo esc_js($widget_context['streetNumber']); ?>',
					postalCode: '<?php echo esc_js($widget_context['postalCode']); ?>',
					stateName: '<?php echo esc_js($widget_context['stateName']); ?>',
					orderId: '<?php echo esc_js($widget_context['orderId']); ?>',
					orderKey: '<?php echo esc_js($widget_context['orderKey']); ?>',
					redirectUrl: '<?php echo esc_js($widget_context['redirectUrl']) ?>'
				};

				if (typeof sumup_gateway_params !== 'undefined') {
					sumup_gateway_params.checkoutId = orderPayWidgetOptions.checkoutId;
					sumup_gateway_params.orderId = orderPayWidgetOptions.orderId;
					sumup_gateway_params.orderKey = orderPayWidgetOptions.orderKey;
					sumup_gateway_params.redirectUrl = orderPayWidgetOptions.redirectUrl;

					const orderPayFieldKeys = [
						'country',
						'firstName',
						'lastName',
						'email',
						'phoneNumber',
						'city',
						'street',
						'streetNumber',
						'postalCode',
						'stateName'
					];

					orderPayFieldKeys.forEach((key) => {
						if (orderPayWidgetOptions[key]) {
							sumup_gateway_params[key] = orderPayWidgetOptions[key];
						} else {
							delete sumup_gateway_params[key];
						}
					});
				}

				jQuery(function($) {
					$(document.body).trigger('sumupCardInit', [orderPayWidgetOptions]);
				});
			</script>
		<?php
		}

		if (isset($sumup_checkout['error_code'])) {
			$error = isset($sumup_checkout['error_message']) ? $sumup_checkout['error_message'] : $sumup_checkout['message'];
			WC_SUMUP_LOGGER::log(
				'SumUp create checkout request failed.',
				array_merge(
					$this->get_checkout_log_context($sumup_checkout, $log_context),
					array(
						'error' => $error,
						'error_code' => $sumup_checkout['error_code'],
					)
				),
				'warning'
			);
			$message = current_user_can('manage_options') ? 'Error from response to create checkout on SumUp. Check the logs.' : 'Sorry, SumUp is not available. Try again soon.';
			echo $this->print_error_message($message);
		}
	}

	/**
	 * Template to print error message to user on checkout
	 *
	 * @param string $error_message
	 * @return string
	 */
	private function print_error_message($message)
	{
		$error_message = sprintf(
			'<p>Error: %s</p>',
			__($message, 'sumup-payment-gateway-for-woocommerce')
		);

		return wp_kses_post($error_message);
	}

	/**
	 * Register the JavaScript scripts to the checkout page.
	 *
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	public function payment_scripts()
	{
		/* Add JavaScript only on the checkout page */
		if (!is_cart() && !is_checkout() && !isset($_GET['pay_for_order'])) {
			return;
		}

		/* Add JavaScript only if the plugin is enabled */
		if (!$this->enabled) {
			return;
		}

		/* Add JavaScript only if the plugin is set up correctly */
		if (!sumup_gateway_is_configured($this->settings)) {
			return;
		}

		/*
		 * Use the SumUp's SDK for accepting card payments.
		 * Documentation can be found at https://developer.sumup.com/docs/widgets-card
		 */
		$front_script_asset = sumup_get_build_asset_metadata(
			'build/sumup-gateway.asset.php',
			array('sumup_gateway_card_sdk')
		);
		$process_checkout_asset = sumup_get_build_asset_metadata(
			'build/sumup-process-checkout.asset.php',
			array('jquery')
		);
		wp_enqueue_script('sumup_gateway_card_sdk', 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js', array(), WC_SUMUP_VERSION, false);
		wp_register_script('sumup_gateway_front_script', WC_SUMUP_PLUGIN_URL . 'build/sumup-gateway.js', $front_script_asset['dependencies'], $front_script_asset['version'], false);
		wp_register_script('sumup_gateway_process_checkout', WC_SUMUP_PLUGIN_URL . 'build/sumup-process-checkout.js', $process_checkout_asset['dependencies'], $process_checkout_asset['version'], true);
		wp_register_style('sumup-checkout', WC_SUMUP_PLUGIN_URL . 'build/sumup-process-checkout.css', array(), $process_checkout_asset['version']);
		wp_enqueue_script('sumup_gateway_process_checkout');
		wp_enqueue_style('sumup-checkout');

		$shop_base_country = WC()->countries->get_base_country();
		$supported_countries = array(
			"AT",
			"AU",
			"BE",
			"BG",
			"BR",
			"CH",
			"CL",
			"CO",
			"CY",
			"CZ",
			"DE",
			"DK",
			"EE",
			"ES",
			"FI",
			"FR",
			"GB",
			"GR",
			"HR",
			"HU",
			"IE",
			"IT",
			"LT",
			"LU",
			"LV",
			"MT",
			"NL",
			"NO",
			"PL",
			"PT",
			"RO",
			"SE",
			"SI",
			"SK",
			"US",
		);
		$card_country = in_array($shop_base_country, $supported_countries) ? $shop_base_country : 'null';

		$show_zipcode = $card_country === 'US' ? 'true' : 'false';

		$card_locale = str_replace('_', '-', get_locale());
		$card_supported_locales = array(
			"bg-BG",
			"cs-CZ",
			"da-DK",
			"de-AT",
			"de-CH",
			"de-DE",
			"de-LU",
			"el-CY",
			"el-GR",
			"en-AU",
			"en-GB",
			"en-IE",
			"en-MT",
			"en-US",
			"es-CL",
			"es-ES",
			"et-EE",
			"fi-FI",
			"fr-BE",
			"fr-CH",
			"fr-FR",
			"fr-LU",
			"hu-HU",
			"it-CH",
			"it-IT",
			"lt-LT",
			"lv-LV",
			"nb-NO",
			"nl-BE",
			"nl-NL",
			"pt-BR",
			"pt-PT",
			"pl-PL",
			"sk-SK",
			"sl-SI",
			"sv-SE",
		);
		$card_locale = in_array($card_locale, $card_supported_locales) ? $card_locale : 'en-GB';

		/**
		 * Translators: the following error messages are shown to the end user
		 */
		$error_general = __('Transaction was unsuccessful. Please check the minimum amount or use another valid card.', 'sumup-payment-gateway-for-woocommerce');
		$error_invalid_form = __('Fill in all required details.', 'sumup-payment-gateway-for-woocommerce');
		$error_instructions = __('Unable to save payment instructions. Please try again.', 'sumup-payment-gateway-for-woocommerce');

		$installments = "false";
		$number_of_installments = null;
		if ($card_country === 'BR') {
			$installments = $this->installments_enabled === 'yes' ? "true" : $installments;
			$number_of_installments = $this->number_of_installments !== false && $this->number_of_installments !== 'select' ? $this->number_of_installments : $number_of_installments;
		}

		$enable_pix = $this->enable_pix === 'yes' ? 'yes' : 'no';
		$open_payment_in_modal = $this->open_payment_in_modal === 'yes' ? 'yes' : 'no';

		wp_localize_script('sumup_gateway_front_script', 'sumup_gateway_params', array(
			'showZipCode' => "$show_zipcode",
			'showInstallments' => "$installments",
			'maxInstallments' => $number_of_installments,
			'checkoutNonce' => wp_create_nonce('sumup-create-checkout'),
			'paymentInstructionsNonce' => wp_create_nonce('sumup-store-payment-instructions'),
			'sumup_handler_url' => add_query_arg(
				array(
					'wc-api' => 'sumup_api_handler',
					'action' => 'create_checkout'
				),
				home_url() . '/'
			),
			'locale' => "$card_locale",
			'country' => '',
			'firstName' => '',
			'lastName' => '',
			'email' => '',
			'phoneNumber' => '',
			'city' => '',
			'street' => '',
			'streetNumber' => '',
			'postalCode' => '',
			'stateName' => '',
			'orderId' => 0,
			'orderKey' => '',
			'status' => '',
			'errors' => array(
				'general_error' => "$error_general",
				'invalid_form' => "$error_invalid_form",
				'instructions_error' => "$error_instructions",
			),
			'enablePix' => "$enable_pix",
			'paymentMethod' => '',
			'currency' => "$this->currency",
			'openPaymentInModal' => "$open_payment_in_modal",
			'redirectUrl' => '',
		));

		wp_enqueue_script('sumup_gateway_front_script');
	}

	/**
	 * Verify if SumUp application credentials are valid when saving settings.
	 *
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	public function verify_credentials()
	{
		Wc_Sumup_Credentials::validate();
	}

	public function verify_credential_options()
	{
		$pay_to_email = get_transient('pay_to_email');
		$api_key = get_transient('api_key');
		$merchant_id = get_transient('merchant_id');

		if ($pay_to_email && $api_key && $merchant_id) {
			$settings = get_option('woocommerce_sumup_settings');
			$settings['pay_to_email'] = $pay_to_email;
			$settings['api_key'] = $api_key;
			$settings['merchant_id'] = $merchant_id;
			update_option('woocommerce_sumup_settings', $settings);
		}
	}

	/**
	 * Add Instruction to pay Boleto (BR only) on WooCommerce Thank You page.
	 *
	 * @return void
	 * @since 2.0
	 */
	public function add_payment_instructions_thankyou_page($order_id)
	{
		$order = wc_get_order($order_id);
		if ($order === false) {
			WC_SUMUP_LOGGER::log(
				'Order not found on Thank You page request.',
				$this->get_gateway_log_context(
					array(
						'flow' => 'thank_you',
						'order_id' => $order_id,
					)
				),
				'error'
			);
			return;
		}

		$log_context = $this->get_order_log_context($order, array('flow' => 'thank_you'));

		$checkout_data = $order->get_meta('_sumup_checkout_data');
		if (!is_array($checkout_data) || empty($checkout_data['id'])) {
			WC_SUMUP_LOGGER::log(
				'Stored checkout data is missing on Thank You page request.',
				$log_context,
				'warning'
			);
			return;
		}

		$checkout_id = sanitize_text_field((string) $checkout_data['id']);

		$access_token = Wc_Sumup_Access_Token::get($this->client_id, $this->client_secret, $this->api_key, false, array_merge($log_context, array('checkout_id' => $checkout_id)));
		$access_token = $access_token['access_token'] ?? '';
		if (empty($access_token)) {
			WC_SUMUP_LOGGER::log('Error while retrieving access token on Thank You page.', array_merge($log_context, array('checkout_id' => $checkout_id)), 'error');
			return;
		}

		$checkout_data = Wc_Sumup_Checkout::get($checkout_id, $access_token, array_merge($log_context, array('checkout_id' => $checkout_id)));
		if (empty($checkout_data)) {
			WC_SUMUP_LOGGER::log('Error while retrieving checkout on Thank You page.', array_merge($log_context, array('checkout_id' => $checkout_id)), 'error');
			return;
		}

		$validation_result = $this->validate_checkout_for_order($order, $checkout_data, $checkout_id);
		if (!$validation_result['valid']) {
			$this->log_checkout_validation_error($order_id, $checkout_id, $validation_result['error']);
			return;
		}

		$payment_status = $checkout_data['status'] ?? '';
		if ($payment_status === 'FAILED') {
			$this->clear_pending_payment_instructions($order);
			$order->update_status('failed');
		} elseif ($payment_status === 'PAID' && !$order->is_paid()) {
			$transaction_code = $this->extract_transaction_code($checkout_data);

			if (!empty($transaction_code)) {
				$this->clear_pending_payment_instructions($order);
				$order->update_meta_data('_sumup_transaction_code', $transaction_code);
				$order->payment_complete($transaction_code);
				$order->add_order_note('SumUp payment validated via Thank You page. Transaction Code: ' . $transaction_code);
				$order->save();
			}
		}
		?>
		<style>
			#sumup-payment-status {
				margin-bottom: 20px;
				border: dashed 1px #d2d2d2;
				padding: 12px;
				border-radius: 4px;
				background: #f6f6f6;
			}
		</style>
		<div id="sumup-payment-status">
			<?php echo esc_html__('Payment Status: ', 'sumup-payment-gateway-for-woocommerce') . esc_html($payment_status); ?>
		</div>
		<?php

		$pix_code = isset($_GET['pix-code']) ? sanitize_text_field(wp_unslash($_GET['pix-code'])) : '';
		$pix_image = isset($_GET['pix-image']) ? esc_url_raw(wp_unslash($_GET['pix-image'])) : '';

		$pending_instructions = $this->get_pending_payment_instructions($order);
		$pending_payment_method = isset($pending_instructions['payment_method']) ? sanitize_text_field($pending_instructions['payment_method']) : '';
		$pending_pix_code = isset($pending_instructions['pix_code']) ? sanitize_textarea_field($pending_instructions['pix_code']) : '';
		$pending_qr_code_image = isset($pending_instructions['qr_code_image']) ? esc_url_raw($pending_instructions['qr_code_image']) : '';
		$pending_boleto_download_url = isset($pending_instructions['boleto_download_url']) ? esc_url_raw($pending_instructions['boleto_download_url']) : '';
		$pending_boleto_barcode = isset($pending_instructions['boleto_barcode']) ? sanitize_textarea_field($pending_instructions['boleto_barcode']) : '';
		$has_rendered_pending_instructions = false;

		if (
			in_array($pending_payment_method, array('pix', 'qr_code_pix'), true) &&
			'' !== $pending_pix_code &&
			'' !== $pending_qr_code_image
		) {
			$has_rendered_pending_instructions = true;
		?>
			<style>
				#sumup-boleto-code {
					background: #ececec;
					padding: 4px;
					font-weight: 700;
				}

				#sumup-pix-qr-code {
					max-width: 100%;
					height: auto;
				}
			</style>
			<h2 class="woocommerce-order-details__title">
				<?php esc_html_e('Payment instructions', 'sumup-payment-gateway-for-woocommerce'); ?></h2>
			<p><?php esc_html_e('PIX code: ', 'sumup-payment-gateway-for-woocommerce'); ?> <span
					id="sumup-boleto-code"><?php echo esc_html($pending_pix_code); ?></span></p>
			<img id="sumup-pix-qr-code" src="<?php echo esc_url($pending_qr_code_image); ?>" alt="sumup-pix-qr-code">
		<?php
		}

		if (
			'boleto' === $pending_payment_method &&
			'' !== $pending_boleto_barcode &&
			'' !== $pending_boleto_download_url
		) {
			$has_rendered_pending_instructions = true;
		?>
			<style>
				#sumup-boleto-code {
					background: #ececec;
					padding: 4px;
					font-weight: 700
				}
			</style>
			<h2 class="woocommerce-order-details__title">
				<?php esc_html_e('Payment instructions', 'sumup-payment-gateway-for-woocommerce'); ?></h2>
			<p><?php esc_html_e('Code to pay: ', 'sumup-payment-gateway-for-woocommerce'); ?> <span
					id="sumup-boleto-code"><?php echo esc_html($pending_boleto_barcode); ?></span></p>
			<a class="button" href="<?php echo esc_url($pending_boleto_download_url); ?>"
				target="_blank"><?php esc_html_e('Download Boleto', 'sumup-payment-gateway-for-woocommerce'); ?></a>
		<?php
		}

		if (!$has_rendered_pending_instructions && !empty($pix_code) && !empty($pix_image)) {
		?>
			<style>
				#sumup-boleto-code {
					background: #ececec;
					padding: 4px;
					font-weight: 700;
				}

				#sumup-pix-qr-code {
					max-width: 100%;
					height: auto;
				}
			</style>
			<h2 class="woocommerce-order-details__title">
				<?php esc_html_e('Payment instructions', 'sumup-payment-gateway-for-woocommerce'); ?></h2>
			<p><?php esc_html_e('PIX code: ', 'sumup-payment-gateway-for-woocommerce'); ?> <span
					id="sumup-boleto-code"><?php echo esc_html($pix_code); ?></span></p>
			<img id="sumup-pix-qr-code" src="<?php echo esc_url($pix_image); ?>" alt="sumup-pix-qr-code" style="">
		<?php
		}

		$boleto_code = isset($_GET['boleto-code']) ? sanitize_text_field(wp_unslash($_GET['boleto-code'])) : '';
		$boleto_link = isset($_GET['boleto-link']) ? esc_url_raw(wp_unslash($_GET['boleto-link'])) : '';

		if (!$has_rendered_pending_instructions && !empty($boleto_code) && !empty($boleto_link)) {
		?>
			<style>
				#sumup-boleto-code {
					background: #ececec;
					padding: 4px;
					font-weight: 700
				}
			</style>
			<h2 class="woocommerce-order-details__title">
				<?php esc_html_e('Payment instructions', 'sumup-payment-gateway-for-woocommerce'); ?></h2>
			<p><?php esc_html_e('Code to pay: ', 'sumup-payment-gateway-for-woocommerce'); ?> <span
					id="sumup-boleto-code"><?php echo esc_html($boleto_code); ?></span></p>
			<a class="button" href="<?php echo esc_url($boleto_link); ?>"
				target="_blank"><?php esc_html_e('Download Boleto', 'sumup-payment-gateway-for-woocommerce'); ?></a>
<?php
		}
	}
}
