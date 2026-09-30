<?php

/**
 * Uninstall Feedback
 *
 * @link
 * @since 2.5.0
 *
 * @package  Cookie_Law_Info
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class Cookie_Law_Info_Uninstall_Feedback {

	protected $api_url         = 'https://feedback.cookieyes.com/api/v1/feedbacks';
	protected $current_version = CLI_VERSION;
	protected $plugin_id       = CLI_POST_TYPE;
	protected $plugin_file     = CLI_PLUGIN_BASENAME; // plugin main file.

	/**
	 * Endpoint namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'cky/v1';

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = '/uninstall-feedback';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_footer', array( $this, 'deactivate_scripts' ) );
		add_filter( 'plugin_action_links_' . $this->plugin_file, array( $this, 'plugin_action_links' ) );
		add_action( 'rest_api_init', array( $this, 'cky_register_routes' ) );
	}

	public function cky_register_routes() {

		register_rest_route(
			$this->namespace,
			$this->rest_base,
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'send_uninstall_reason' ),
				'permission_callback' => array( $this, 'create_item_permissions_check' ),
			)
		);
	}

	/**
	 * Check if a given request has access to create an item.
	 *
	 * @param  WP_REST_Request $request Full details about the request.
	 * @return WP_Error|boolean
	 */
	public function create_item_permissions_check( $request ) {
		// Check if user can manage options
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'cookieyes_rest_cannot_create', __( 'Sorry, you are not allowed to create resources.', 'cookie-law-info' ), array( 'status' => rest_authorization_required_code() ) );
		}

		// Verify nonce from header
		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error( 'cookieyes_rest_invalid_nonce', __( 'Invalid nonce.', 'cookie-law-info' ), array( 'status' => 403 ) );
		}

		return true;
	}
	
	public function plugin_action_links( $links ) {
		if ( array_key_exists( 'deactivate', $links ) ) {
			$links['deactivate'] = str_replace( '<a', '<a class="' . $this->plugin_id . '-deactivate-link"', $links['deactivate'] );
		}
		return $links;
	}
	private function get_uninstall_reasons() {

		$reasons = array(
			array(
				'id'     => 'setup-difficult',
				'text'   => __( 'Setup is too difficult/ Lack of documentation', 'cookie-law-info' ),
				'type'        => 'textarea',
				'placeholder' => __(
					'Describe the challenges that you faced while using our plugin',
					'cookie-law-info'
				),
			),
			array(
				'id'     => 'not-have-that-feature',
				'text'   => __( 'The plugin is great, but I need specific feature that you don\'t support', 'cookie-law-info' ),
				'type'        => 'textarea',
				'placeholder' => __( 'Could you tell us more about that feature?', 'cookie-law-info' ),
			),
			array(
				'id'   => 'affecting-performance',
				'text' => __( 'The plugin is affecting website speed', 'cookie-law-info' ),
			),
			array(
				'id'     => 'found-better-plugin',
				'text'   => __( 'I found a better plugin', 'cookie-law-info' ),
				'type'        => 'text',
				'placeholder' => __( 'Please share which plugin', 'cookie-law-info' ),
			),
			array(
				'id'   => 'temporary-deactivation',
				'text' => __( 'It’s a temporary deactivation', 'cookie-law-info' ),
			),
			array(
				'id'     => 'other',
				'text'   => __( 'Other', 'cookie-law-info' ),
				'type'        => 'textarea',
				'placeholder' => __( 'Please share the reason', 'cookie-law-info' ),
			),
		);

		return $reasons;
	}
	public function deactivate_scripts() {
		global $pagenow;
		if ( 'plugins.php' != $pagenow ) {
			return;
		}
		$reasons = $this->get_uninstall_reasons();
		?>
		<div class="<?php echo esc_attr( $this->plugin_id ); ?>-modal" id="<?php echo esc_attr( $this->plugin_id ); ?>-modal">
			<div class="<?php echo esc_attr( $this->plugin_id ); ?>-modal-wrap">
				<div class="<?php echo esc_attr( $this->plugin_id ); ?>-modal-header">
					<h3><?php echo esc_html__( 'If you have a moment, please let us know why you are deactivating:', 'cookie-law-info' ); ?></h3>
				</div>
				<div class="<?php echo esc_attr( $this->plugin_id ); ?>-modal-body">
					<ul class="reasons">
					<?php
					foreach ( $reasons as $reason ) :
											$data_type   = ( isset( $reason['type'] ) ? $reason['type'] : '' );
											$placeholder = ( isset( $reason['placeholder'] ) ? $reason['placeholder'] : '' );
											$children      = ( isset( $reason['child'] ) && is_array( $reason['child'] ) ) ? $reason['child'] : array();
						?>
							<li data-type="<?php echo esc_attr( $data_type ); ?>" data-placeholder="<?php echo esc_attr( $placeholder ); ?>">
								<label><input type="radio" name="selected-reason" value="<?php echo esc_attr( $reason['id'] ); ?>"><?php echo esc_html( $reason['text'] ); ?></label>
								<?php if ( ! empty( $children ) ) : ?>
									<ul class="<?php echo esc_attr( $this->plugin_id ) . '-sub-reasons'; ?>">
										<?php
										foreach ( $children as $child ) :
													$data_type   = ( isset( $child['type'] ) ? $child['type'] : '' );
													$placeholder = ( isset( $child['type'] ) ? $child['placeholder'] : '' );
											?>
											<li data-type="<?php echo esc_attr( $data_type ); ?>" data-placeholder="<?php echo esc_attr( $placeholder ); ?>">
												<label><input type="radio" name="selected-reason" value="<?php echo esc_attr( $child['id'] ); ?>"><?php echo esc_html( $child['text'] ); ?></label>
											<?php endforeach; ?>
									</ul>
								<?php endif; ?>
							   
							</li>

					<?php endforeach; ?>
					</ul>
					<div class="wt-uninstall-feedback-privacy-policy">
						<?php echo esc_html__( "We do not collect any personal data when you submit this form. It's your feedback that we value.", 'cookie-law-info' ); ?>
						<a href="https://www.cookieyes.com/privacy-policy/" target="_blank"><?php echo esc_html__( 'Privacy Policy', 'cookie-law-info' ); ?></a>
					</div>
				</div>
				<div class="<?php echo esc_attr( $this->plugin_id ); ?>-modal-footer">

					<a class="button-primary" href="https://www.cookieyes.com/support/" target="_blank">
						<span class="dashicons dashicons-external" style="margin-top:3px;"></span>
						<?php echo esc_html__( 'Go to support', 'cookie-law-info' ); ?></a>
					<button class="button-primary <?php echo esc_attr( $this->plugin_id ); ?>-model-submit"><?php echo esc_html__( 'Submit & Deactivate', 'cookie-law-info' ); ?></button>
					<button class="button-secondary <?php echo esc_attr( $this->plugin_id ); ?>-model-cancel"><?php echo esc_html__( 'Cancel', 'cookie-law-info' ); ?></button>
					<a href="#" style="color: #737373;" class="dont-bother-me"><?php echo esc_html__( 'I rather wouldn\'t say', 'cookie-law-info' ); ?></a>
				</div>
			</div>
		</div>
		<style type="text/css">
			.cookielawinfo-modal {
				position: fixed;
				z-index: 99999;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
				background: rgba(0, 0, 0, 0.5);
				display: none;
			}

			.cookielawinfo-modal.modal-active {
				display: block;
			}

			.cookielawinfo-modal-wrap {
				width: 50%;
				position: relative;
				margin: 10% auto;
				background: #fff;
			}

			.cookielawinfo-modal-header {
				border-bottom: 1px solid #eee;
				padding: 8px 20px;
			}

			.cookielawinfo-modal-header h3 {
				line-height: 150%;
				margin: 0;
			}

			.cookielawinfo-modal-body {
				padding: 5px 20px 20px 20px;
			}

			.cookielawinfo-modal-body .input-text,
			.cookielawinfo-modal-body textarea {
				width: 75%;
			}

			.cookielawinfo-modal-body .reason-input {
				margin-top: 5px;
				margin-left: 20px;
			}

			.cookielawinfo-modal-footer {
				border-top: 1px solid #eee;
				padding: 12px 20px;
				text-align: left;
			}

			.cookielawinfo-sub-reasons {
				display: none;
				padding-left: 20px;
				padding-top: 10px;
				padding-bottom: 4px;
			}

			.wt-uninstall-feedback-privacy-policy {
				text-align: left;
				font-size: 12px;
				color: #aaa;
				line-height: 14px;
				margin-top: 20px;
				font-style: italic;
			}

			.wt-uninstall-feedback-privacy-policy a {
				font-size: 11px;
				color: #4b9cc3;
				text-decoration-color: #99c3d7;
			}
		</style>
		<script type="text/javascript">
			(function($) {
				$(function() {
					var plugin_id = '<?php echo esc_js( $this->plugin_id ); ?>';
					var modal = $('#' + plugin_id + '-modal');
					var deactivateLink = '';
					$('a.' + plugin_id + '-deactivate-link').click(function(e) {
						e.preventDefault();
						modal.addClass('modal-active');
						deactivateLink = $(this).attr('href');
						modal.find('a.dont-bother-me').attr('href', deactivateLink).css('float', 'right');
					});
					modal.on('click', 'button.' + plugin_id + '-model-cancel', function(e) {
						e.preventDefault();
						modal.removeClass('modal-active');
					});
					modal.on('click', 'input[type="radio"]', function() {
						var parent = $(this).parents('li:first');
						if (parent.find('ul').length > 0) {
							$('.' + plugin_id + '-sub-reasons').hide();
							parent.find('ul').show();
						} else {
							modal.find('.reason-input').remove();
							var inputType = parent.data('type'),
								inputPlaceholder = parent.data('placeholder'),
								reasonInputHtml = '<div class="reason-input">' + (('text' === inputType) ? '<input type="text" class="input-text" size="40" />' : '<textarea rows="5" cols="45"></textarea>') + '</div>';
							if (inputType === 'textarea' || inputType === 'text') {
								parent.append($(reasonInputHtml));
								parent.find('input, textarea').attr('placeholder', inputPlaceholder).focus();
							}
						}

					});

					modal.on('click', 'button.' + plugin_id + '-model-submit', function(e) {
						e.preventDefault();
						var button = $(this);
						if (button.hasClass('disabled')) {
							return;
						}
						var $radio = $('input[type="radio"]:checked', modal);
						var $selected_reason = $radio.parents('li:first'),
							$input = $selected_reason.find('textarea, input[type="text"]');

						$.ajax({
							url: "<?php echo esc_url_raw( rest_url() . $this->namespace . $this->rest_base ); ?>",
							type: 'POST',
							data: {
								reason_id: (0 === $radio.length) ? 'none' : $radio.val(),
								reason_text: (0 === $radio.length) ? 'none' : $radio.closest('label').text(),
								reason_info: (0 !== $input.length) ? $input.val().trim() : '',
							},
							beforeSend: function(xhr) {
								button.addClass('disabled');
								button.text('Processing...');
								xhr.setRequestHeader( 'X-WP-Nonce', '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>');
							},
							complete: function() {
								window.location.href = deactivateLink;
							}
						});
					});
				});
			}(jQuery));
		</script>
		<?php
	}

	public function send_uninstall_reason( $request ) {
		global $wpdb;
		$post_data = $request->get_body_params();
		if ( ! isset( $post_data['reason_id'] ) ) {
			wp_send_json_error();
		}
		$data = array(
			'reason_slug'                 => sanitize_text_field( wp_unslash( $post_data['reason_id'] ) ),
			'reason_detail'               => ! empty( $post_data['reason_text'] ) ? sanitize_text_field( wp_unslash( $post_data['reason_text'] ) ) : null,
			'date'                        => gmdate( 'M d, Y h:i:s A' ),
			'comments'                    => ! empty( $post_data['reason_info'] ) ? sanitize_text_field( wp_unslash( $post_data['reason_info'] ) ) : '',
			'server'                      => ! empty( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : '',
			'php_version'                 => phpversion(),
			'mysql_version'               => $wpdb->db_version(),
			'wp_version'                  => get_bloginfo( 'version' ),
			'wc_version'                  => defined( 'WC_VERSION' ) ? WC_VERSION : null,
			'locale'                      => get_locale(),
			'plugin_version'              => $this->current_version,
			'is_multisite'                => is_multisite(),
			'is_legacy'                   => true,
		);
		// Write an action/hook here in webtoffe to receive the data
		$response = wp_remote_post(
			$this->api_url,
			array(
				'headers'     => array( 'Content-Type' => 'application/json; charset=utf-8' ),
				'method'      => 'POST',
				'timeout'     => 45,
				'redirection' => 5,
				'httpversion' => '1.0',
				'blocking'    => false,
				'body'        => wp_json_encode( $data ),
				'cookies'     => array(),
			)
		);
		wp_send_json_success();
	}
}
new Cookie_Law_Info_Uninstall_Feedback();
