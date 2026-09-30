<?php
/**
 * Class Connect_Banner file.
 *
 * @package CookieYes
 */

namespace CookieYes\Lite\Admin\Modules\Connect_Banner;

use CookieYes\Lite\Includes\Modules;
use CookieYes\Lite\Includes\Notice;
use CookieYes\Lite\Admin\Modules\Settings\Includes\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Handles Connect Banner Operation
 *
 * @class       Connect_Banner
 * @version     3.0.0
 * @package     CookieYes
 */
class Connect_Banner extends Modules {

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
	protected $rest_base = '/settings/notices/connect_banner';

	private static $instance;

	/**
	 * Return the current instance of the class
	 *
	 * @return object
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	public function __construct() {
		parent::__construct('connect_banner');
	}

	/**
	 * Initialize the class
	 */
	public function init() {
		if ($this->check_condition()) {
			add_action( 'admin_notices', array( $this, 'show_banner' ) );
			add_action( 'admin_print_footer_scripts', array( $this, 'add_script' ) );
		}
	}

	public function show_banner() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( $screen && 'plugins' === $screen->id ) {
			?>
			<div class="cky-notice-connect notice-info notice is-dismissible">
				<div class="cky-notice-connect-header"><b>
					<?php echo wp_kses_post( __( 'Unlock advanced features for seamless compliance', 'cookie-law-info' ) ); ?>
				</b></div>
				<p class="cky-notice-connect-content">
					<?php echo wp_kses_post( __( 'Automate your cookie scan, record consent logs, and access analytics to streamline consent management and enhance compliance by connecting to the web app.', 'cookie-law-info' ) ); ?>
				</p>
				<a class="cky-connect-button button button-primary" data-type="connect"><?php echo esc_html( __( 'Connect to CookieYes Web App', 'cookie-law-info' ) ); ?></a>
			</div>
			<style>
				.cky-notice-connect {
					padding: 12px;
					.cky-notice-connect-header, .cky-notice-connect-content {
						font-size: 14px;
					}
					.cky-connect-button {
						padding: 7px 58px 7px 62px;
						line-height: normal;
						min-height: 30px;
					}
				}
			</style>
			<?php
		}
	}

	/**
	 * Review feedback scripts.
	 *
	 * @return void
	 */
	public function add_script() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$expiry = 30 * DAY_IN_SECONDS;
		?>
			<script type="text/javascript">
				(function() {
					const expiration = '<?php echo esc_js( $expiry ); ?>';	
					async function ckyUpdateNotice(expiry = expiration) {
						try {
							const response = await fetch('<?php echo esc_url_raw( rest_url() . $this->namespace . $this->rest_base ); ?>', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									'X-WP-Nonce': '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>'
								},
								body: JSON.stringify({ expiry })
							});

							if (!response.ok) {
								throw new Error('Network response was not ok');
							}
						} catch (error) {
							console.error('Error:', error);
						}
					}

					// Handle notice dismiss and connect button clicks
					document.addEventListener('click', function(e) {
						const dismissButton = e.target.closest('.cky-notice-connect .notice-dismiss');
						const connectButton = e.target.closest('.cky-connect-button');

						if (dismissButton) {
							e.preventDefault();
							ckyUpdateNotice();
						}

						if (connectButton) {
							e.preventDefault();
							window.location.href = '<?php echo esc_js( admin_url( 'admin.php?page=cookie-law-info#/dashboard' ) ); ?>';
						}
					});
				})();
			</script>
			<?php
	}

	public function check_condition() {
		$connected = Settings::get_instance()->is_connected();
		$notices = Notice::get_instance()->get();
		if ( $connected || isset( $notices['connect_banner'] ) ) {
			return false;
		}
		return true;
	}
}
