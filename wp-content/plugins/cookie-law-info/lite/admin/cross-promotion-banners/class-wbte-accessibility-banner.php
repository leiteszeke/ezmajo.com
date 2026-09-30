<?php
/**
 * Class Wbte_Accessibility_Banner
 *
 * This class is responsible for displaying the Accessibility CTA banner.
 *
 * @package CookieYes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Wbte_Accessibility_Banner' ) ) {

	/**
	 * Class Wbte_Accessibility_Banner
	 */
	class Wbte_Accessibility_Banner {

		/**
		 * The plugin prefix for nonces.
		 *
		 * @since 2.2.8
		 * @var string
		 */
		private static $plugin_prefix = 'cky';

		/**
		 * The accessibility widget plugin file path.
		 *
		 * @since 2.2.8
		 * @var string
		 */
		private static $plugin_file = 'accessibility-widget/accessibility-widget.php';

		/**
		 * Option to store the reminder count and snooze until time.
		 * remind_count (1,2) and snooze_until (unix time). Deleted when banner dismissed forever on 3rd remind.
		 *
		 * @since 2.2.8
		 * @var string
		 */
		private static $remind_option = 'cya11y_accessyes_banner_remind_state';

		/**
		 * Option to store the banner hidden status.
		 *
		 * @since 2.2.8
		 * @var string
		 */
		private static $banner_hidden_option = 'cya11y_hide_accessyes_cta_banner';

		/**
		 * Singleton instance used by init().
		 *
		 * @since 2.2.8
		 * @var self|null
		 */
		private static $instance = null;

		/**
		 * Load the banner (registers hooks via constructor side effects).
		 *
		 * @since 2.2.8
		 * @return self
		 */
		public static function init() {
			if ( null === self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}

		/**
		 * Constructor.
		 *
		 * @since 2.2.8
		 */
		public function __construct() {
			include_once ABSPATH . 'wp-admin/includes/plugin.php';
			$installed_plugins = get_plugins();

			if ( array_key_exists( self::$plugin_file, $installed_plugins ) || self::is_within_remind_snooze() ) {
				return;
			}

			add_action( 'load-index.php', array( $this, 'register_dashboard_banner_hooks' ) );
			add_action( 'wp_ajax_wbte_accessibility_dismiss_banner', array( $this, 'handle_dismiss_banner' ) );
			add_action( 'wp_ajax_wbte_accessibility_install_plugin', array( $this, 'install_plugin' ) );
			add_action( 'wp_ajax_wbte_accessibility_remind_later', array( $this, 'handle_remind_later' ) );
		}

		/**
		 * Register banner notice and scripts only on the main admin dashboard.
		 *
		 * @since 2.2.8
		 */
		public function register_dashboard_banner_hooks() {
			add_action( 'admin_notices', array( $this, 'show_banner_notice' ) );
			add_action( 'admin_print_footer_scripts', array( $this, 'enqueue_admin_scripts' ) );
		}

		/**
		 * Whether the banner is hidden until snooze_until.
		 *
		 * @return bool
		 */
		private static function is_within_remind_snooze() {
			$data = get_option( self::$remind_option, array() );
			if ( ! is_array( $data ) || empty( $data['snooze_until'] ) ) {
				return false;
			}
			return time() < absint( $data['snooze_until'] );
		}

		/**
		 * Handle setting the option when user clicks "Not Interested".
		 *
		 * @since 2.2.8
		 */
		public static function handle_dismiss_banner() {
			check_ajax_referer( self::$plugin_prefix, '_wpnonce' );
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_send_json_error();
			}
			update_option( self::$banner_hidden_option, true );
			delete_option( self::$remind_option );
			wp_send_json_success();
		}

		/**
		 * Remind later: 7d → 30d → then permanent hide.
		 *
		 * @since 2.2.8
		 */
		public static function handle_remind_later() {
			check_ajax_referer( self::$plugin_prefix, '_wpnonce' );
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_send_json_error();
			}

			$data  = get_option( self::$remind_option, array() );
			$count = ( is_array( $data ) && isset( $data['remind_count'] ) ) ? absint( $data['remind_count'] ) : 0;
			++$count;

			if ( $count >= 3 ) {
				update_option( self::$banner_hidden_option, true );
				delete_option( self::$remind_option );
				wp_send_json_success();
				return;
			}

			$days = ( 1 === $count ) ? 7 : 30;

			update_option(
				self::$remind_option,
				array(
					'remind_count' => $count,
					'snooze_until' => time() + ( $days * DAY_IN_SECONDS ),
				)
			);

			wp_send_json_success();
		}

		/**
		 * Handle plugin installation (download with optional activate).
		 *
		 * @since 2.2.8
		 */
		public static function install_plugin() {
			try {
				check_ajax_referer( self::$plugin_prefix, '_wpnonce' );

				$response = array(
					'status'  => false,
					'message' => esc_html__( 'Something went wrong. Please try again.', 'cookie-law-info' ),
				);

				if ( ! current_user_can( 'install_plugins' ) ) {
					$response['message'] = esc_html__( 'You do not have sufficient permissions to install plugins.', 'cookie-law-info' );
					wp_send_json( $response );
					return;
				}

				require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
				require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

				$plugin_slug = 'accessibility-widget';
				$api         = plugins_api( 'plugin_information', array( 'slug' => $plugin_slug ) );

				if ( is_wp_error( $api ) ) {
					$response['message'] = $api->get_error_message();
					wp_send_json( $response );
					return;
				}

				if ( ! is_object( $api ) || ! isset( $api->download_link ) || ! is_string( $api->download_link ) || '' === $api->download_link ) {
					$response['message'] = esc_html__( 'Plugin download link not found.', 'cookie-law-info' );
					wp_send_json( $response );
					return;
				}

				$upgrader = new Plugin_Upgrader( new WP_Ajax_Upgrader_Skin() );
				$result   = $upgrader->install( $api->download_link );

				if ( is_wp_error( $result ) ) {
					$response['message'] = $result->get_error_message();
					wp_send_json( $response );
					return;
				}

				if ( false === $result ) {
					$response['message'] = esc_html__( 'Plugin installation failed.', 'cookie-law-info' );
					wp_send_json( $response );
					return;
				}

				if ( $result ) {
					$activate_response = self::activate_plugin();
					if ( $activate_response['status'] ) {
						$response['status'] = true;
					} else {
						$response['message'] = $activate_response['msg'];
					}
					update_option( self::$banner_hidden_option, true );
					delete_option( self::$remind_option );
				}

				wp_send_json( $response );
			} catch ( Exception $e ) {
				wp_send_json(
					array(
						'status'  => false,
						'message' => $e->getMessage(),
					)
				);
			}
		}

		/**
		 * Handle plugin activation.
		 *
		 * @since 2.2.8
		 * @return array{status: bool, msg: string}
		 */
		public static function activate_plugin() {
			$result = array(
				'status' => false,
				'msg'    => '',
			);

			if ( ! current_user_can( 'activate_plugins' ) ) {
				$result['msg'] = esc_html__( 'You do not have sufficient permissions to activate plugins.', 'cookie-law-info' );
				return $result;
			}

			if ( file_exists( WP_PLUGIN_DIR . '/' . self::$plugin_file ) ) {
				$activation_result = activate_plugin( self::$plugin_file );
				if ( is_wp_error( $activation_result ) ) {
					$result['status'] = false;
					$result['msg']    = esc_html__( 'Activation failed.', 'cookie-law-info' );
				} else {
					$result['status'] = true;
				}
			}

			return $result;
		}

		/**
		 * Display the accessibility banner.
		 *
		 * @since 2.2.8
		 */
		public function show_banner_notice() {
			$plugin_modal_link = admin_url( 'plugin-install.php?tab=plugin-information&plugin=accessibility-widget&TB_iframe=true' );

			?>
			<div id="wbte_accessibility_banner" class="notice">
				<div class="wbte_accessibility_banner_main">
					<img src="<?php echo esc_url( plugin_dir_url( __FILE__ ) . 'assets/images/accessyes.svg' ); ?>" alt="<?php esc_attr_e( 'Accessibility Widget', 'cookie-law-info' ); ?>" style="width: 48px; height: 48px;">
					<div class="wbte_accessibility_banner_content">
						<p class="wbte_accessibility_banner_content_title">
							<?php
							printf(
								/* translators: 1: a tag opening, 2: a tag closing */
								esc_html__( 'Make your site inclusive with %1$s AccessiYes accessibility widget. %2$s', 'cookie-law-info' ),
								'<a href="' . esc_url( $plugin_modal_link ) . '" class="thickbox" style="text-decoration: none;">',
								'</a>'
							);
							?>
						</p>
						<p style="font-size: 14px;">
							<?php
							esc_html_e( 'A lightweight accessibility widget to improve accessibility and usability for every users. Set it up in minutes for free.', 'cookie-law-info' );
							?>
						</p>
					</div>
					<div class="wbte_accessibility_banner_actions">
						<button class="button button-primary" id="wbte_accessibility_banner_install_btn">
							<span class="dashicons dashicons-update wbte_accessibility_banner_install_btn_loader"></span>
							<span class="wbte_accessibility_banner_install_btn_text">
								<?php esc_html_e( 'Install & activate', 'cookie-law-info' ); ?>
							</span>
						</button>
						<a href="#" class="wbte_accessibility_banner_maybe_ltr">
							<?php esc_html_e( 'Remind me later', 'cookie-law-info' ); ?>
						</a>
					</div>
				</div>
				<span class="wbte_accessibility_banner_dismiss_btn">
					<span class="dashicons dashicons-no-alt"></span>
				</span>
			</div>
			<?php
		}

		/**
		 * Enqueue admin footer scripts for banner actions.
		 *
		 * @since 2.2.8
		 */
		public static function enqueue_admin_scripts() {
			$ajax_url  = admin_url( 'admin-ajax.php' );
			$nonce     = wp_create_nonce( self::$plugin_prefix );
			$error_msg = esc_js( __( 'Something went wrong. Please try again.', 'cookie-law-info' ) );
			?>
			<style>
			#wbte_accessibility_banner { padding: 20px; border-left-color: #2271b1; position: relative; }
			.wbte_accessibility_banner_main { display: flex; gap: 12px; align-items: flex-start; }
			.wbte_accessibility_banner_content { flex: 1; }
			.wbte_accessibility_banner_content p { margin: 0; padding: 0; }
			p.wbte_accessibility_banner_content_title{ font-size: 18px; font-weight: 700; margin-bottom: 4px; }
			.wbte_accessibility_banner_actions { display: flex; gap: 16px; align-items: center; margin-left: 60px; margin-top: 16px; }
			#wbte_accessibility_banner_install_btn { font-size: 14px; font-weight: 700; background-color: #2271b1; color: #fff; border-radius: 6px; padding: 6px 24px; line-height: 1.5; display: flex; align-items: center; justify-content: center; }
			#wbte_accessibility_banner_install_btn:hover { background-color: #135e96; }
			.wbte_accessibility_banner_install_btn_text{ display: flex; align-items: center; gap: 4px; }
			.wbte_accessibility_banner_install_btn_loader { animation: wbte_ab_rotation 2s infinite linear; display: none; margin: 3px 5px 0 0; vertical-align: top; }
			@keyframes wbte_ab_rotation {
				from { transform: rotate(0deg); }
				to { transform: rotate(359deg); }
			}
			#wbte_accessibility_banner.wbte_accessibility_banner_loading .wbte_accessibility_banner_loader { position: absolute; inset: 0; background: rgba( 0, 0, 0, 0.6 ); border-radius: 4px; display: flex; align-items: center; justify-content: center; z-index: 1; }
			#wbte_accessibility_banner.wbte_accessibility_banner_loading .wbte_accessibility_banner_loader .spinner { margin: 0; float: none; visibility: visible; }
			.wbte_accessibility_banner_dismiss_btn{ position: absolute; right: 10px; top: 10px; cursor: pointer; }
			.wbte_accessibility_banner_maybe_ltr{ margin-left: 15px; color: #646970; text-decoration: underline; }

			@media (max-width: 782px) {
				#wbte_accessibility_banner{ flex-direction: column; align-items: flex-start; }
			}
			/* Fixed toast (matches WebToffee Smart Coupons-style notify when their script is not on-screen). */
			.cky_accessyes_toast {
				position: fixed;
				width: 350px;
				max-width: calc(100vw - 32px);
				padding: 20px 28px;
				font-weight: 500;
				font-size: 14px;
				right: 60px;
				top: 0;
				opacity: 0;
				border-radius: 10px;
				z-index: 1000000000;
				line-height: 22px;
				box-shadow: 0 3px 10px 0 rgba(121, 141, 160, 0.3);
				cursor: pointer;
				display: flex;
				align-items: flex-start;
				gap: 10px;
				box-sizing: border-box;
			}
			.cky_accessyes_toast .cky_accessyes_toast_icon {
				flex-shrink: 0;
				margin-top: 1px;
				width: 20px;
				height: 20px;
				font-size: 20px;
			}
			.cky_accessyes_toast_success {
				background: #edfaef;
				color: #1e4620;
				border: 1px solid #68de7c;
			}
			.cky_accessyes_toast_success .cky_accessyes_toast_icon { color: #1e4620; }
			.cky_accessyes_toast_error {
				background: #fcf0f1;
				color: #8a2424;
				border: 1px solid #f1aeb5;
			}
			.cky_accessyes_toast_error .cky_accessyes_toast_icon { color: #8a2424; }
			@media (max-width: 600px) {
				.cky_accessyes_toast { right: 16px; }
			}
			</style>
			<script>
			( function( $ ) {
				'use strict';

				var ckyAccessyesNotify = ( function() {
					if ( typeof wbte_sc_notify_msg !== 'undefined' && wbte_sc_notify_msg &&
						typeof wbte_sc_notify_msg.success === 'function' &&
						typeof wbte_sc_notify_msg.error === 'function' ) {
						return wbte_sc_notify_msg;
					}
					function showToast( $el, autoClose ) {
						$( 'body' ).append( $el );
						$el.stop( true, true ).animate( { opacity: 1, top: '50px' }, 1000 );
						var dismissed = false;
						function dismiss() {
							if ( dismissed ) {
								return;
							}
							dismissed = true;
							$el.off( 'click', dismiss );
							var timer = $el.data( 'ckyToastTimer' );
							if ( timer ) {
								clearTimeout( timer );
								$el.removeData( 'ckyToastTimer' );
							}
							fadeToast( $el );
						}
						$el.on( 'click', dismiss );
						if ( autoClose !== false ) {
							$el.data( 'ckyToastTimer', setTimeout( dismiss, 5000 ) );
						}
					}
					function fadeToast( $el ) {
						if ( $el.data( 'ckyToastFading' ) ) {
							return;
						}
						$el.data( 'ckyToastFading', true );
						$el.animate( { opacity: 0, top: '100px' }, 1000, function() {
							$el.remove();
						} );
					}
					return {
						success: function( message ) {
							var $icon = $( '<span class="dashicons dashicons-yes-alt cky_accessyes_toast_icon" aria-hidden="true"></span>' );
							var $text = $( '<span class="cky_accessyes_toast_text"></span>' ).text( message );
							var $toast = $( '<div class="cky_accessyes_toast cky_accessyes_toast_success" role="status"></div>' );
							$toast.append( $icon, $text );
							showToast( $toast, true );
						},
						error: function( message ) {
							var $icon = $( '<span class="dashicons dashicons-warning cky_accessyes_toast_icon" aria-hidden="true"></span>' );
							var $text = $( '<span class="cky_accessyes_toast_text"></span>' ).text( message );
							var $toast = $( '<div class="cky_accessyes_toast cky_accessyes_toast_error" role="alert"></div>' );
							$toast.append( $icon, $text );
							showToast( $toast, true );
						}
					};
				} )();

				$( document ).ready( function() {
					const installBtn = $( '#wbte_accessibility_banner_install_btn' );
					const btnTextSpan = installBtn.find( '.wbte_accessibility_banner_install_btn_text' );
					const originalBtnHtml = btnTextSpan.html();
					const banner = $( '#wbte_accessibility_banner' );

					function setButtonLoading( isLoading ) {
						if ( isLoading ) {
							$( '.wbte_accessibility_banner_install_btn_loader' ).css( 'display', 'inline-block' );
							btnTextSpan.text( '<?php echo esc_js( __( 'Installing...', 'cookie-law-info' ) ); ?>' );
							installBtn.prop( 'disabled', true );
						} else {
							$( '.wbte_accessibility_banner_install_btn_loader' ).css( 'display', 'none' );
							btnTextSpan.html( originalBtnHtml );
							installBtn.prop( 'disabled', false );
						}
					}

					function hideBanner() {
						banner.slideUp( 200 );
					}

					function showBannerLoader() {
						if ( banner.hasClass( 'wbte_accessibility_banner_loading' ) ) {
							return;
						}
						banner.addClass( 'wbte_accessibility_banner_loading' ).append(
							'<div class="wbte_accessibility_banner_loader"><span class="spinner"></span></div>'
						);
						banner.find( '.wbte_accessibility_banner_loader .spinner' ).css( 'visibility', 'visible' );
					}

					function removeBannerLoader() {
						banner.removeClass( 'wbte_accessibility_banner_loading' ).find( '.wbte_accessibility_banner_loader' ).remove();
					}

					banner.on( 'click', '.wbte_accessibility_banner_dismiss_btn', function(e) {
						e.preventDefault();

						showBannerLoader();
						$.ajax( {
							url: '<?php echo esc_url( $ajax_url ); ?>',
							type: 'POST',
							dataType: 'json',
							data: {
								action: 'wbte_accessibility_dismiss_banner',
								_wpnonce: '<?php echo esc_js( $nonce ); ?>'
							},
							success: function( response ) {
								removeBannerLoader();
								if ( response && response.success === true ) {
									hideBanner();
								}
							},
							error: function() {
								removeBannerLoader();
								ckyAccessyesNotify.error( '<?php echo esc_js( $error_msg ); ?>' );
							}
						} );
					} );

					banner.on( 'click', '.wbte_accessibility_banner_maybe_ltr', function( e ) {
						e.preventDefault();
						showBannerLoader();
						$.ajax( {
							url: '<?php echo esc_url( $ajax_url ); ?>',
							type: 'POST',
							dataType: 'json',
							data: {
								action: 'wbte_accessibility_remind_later',
								_wpnonce: '<?php echo esc_js( $nonce ); ?>'
							},
							success: function( response ) {
								removeBannerLoader();
								if ( response && response.success === true ) {
									hideBanner();
								}
							},
							error: function() {
								removeBannerLoader();
								ckyAccessyesNotify.error( '<?php echo esc_js( $error_msg ); ?>' );
							}
						} );
					} );

					installBtn.on( 'click', function( event ) {
						event.preventDefault();

						setButtonLoading( true );

						$.ajax( {
							url: '<?php echo esc_url( $ajax_url ); ?>',
							type: 'POST',
							dataType: 'json',
							data: {
								action: 'wbte_accessibility_install_plugin',
								_wpnonce: '<?php echo esc_js( $nonce ); ?>'
							},
							success: function( response ) {
								if ( ! response || typeof response !== 'object' ) {
									setButtonLoading( false );
									ckyAccessyesNotify.error( '<?php echo esc_js( $error_msg ); ?>' );
									return;
								}
								if ( response.status === true ) {
									setButtonLoading( false );
									hideBanner();

									ckyAccessyesNotify.success( '<?php echo esc_js( __( 'Plugin installed successfully.', 'cookie-law-info' ) ); ?>' );
								} else {
									setButtonLoading( false );
									const msg = ( typeof response.message === 'string' && response.message.length > 0 ) ? response.message : '<?php echo esc_js( $error_msg ); ?>';
									ckyAccessyesNotify.error( msg );
								}
							},
							error: function() {
								setButtonLoading( false );
								ckyAccessyesNotify.error( '<?php echo esc_js( $error_msg ); ?>' );
							}
						} );
					} );
				} );
			} )( jQuery );
			</script>
			<?php
		}
	}
	Wbte_Accessibility_Banner::init();
}
