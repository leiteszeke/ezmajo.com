<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://www.webtoffee.com/
 * @since      3.0.0
 *
 * @package    CookieYes\Lite\Admin
 */

namespace CookieYes\Lite\Admin;

use CookieYes\Lite\Includes\Notice;
use CookieYes\Lite\Includes\Connect_Notice;
use CookieYes\Lite\Includes\Review_Request;
use CookieYes\Lite\Admin\Modules\Settings\Includes\Controller;
use CookieYes\Lite\Admin\Modules\Settings\Includes\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 *
 * @package    CookieYes
 * @subpackage CookieYes/admin
 * @author     WebToffee <info@webtoffee.com>
 */
class Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    3.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    3.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * The suffix of the script.
	 *
	 * @since    3.0.0
	 * @access   private
	 * @var      string    $suffix    The suffix of the script.
	 */
	private $suffix;

	/**
	 * Admin modules of the plugin
	 *
	 * @var array
	 */
	private static $modules;

	/**
	 * Currently active modules
	 *
	 * @var array
	 */
	private static $active_modules;

	/**
	 * Existing modules
	 *
	 * @var array
	 */
	public static $existing_modules;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    3.0.0
	 * @param      string $plugin_name       The name of this plugin.
	 * @param      string $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
		$this->suffix      = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
		self::$modules     = $this->get_default_modules();
		$this->load();
		$this->add_notices();
		$this->add_review_notice();
		$this->load_modules();
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_init', array( $this, 'load_plugin' ) );
		add_action( 'activated_plugin', array( $this, 'handle_activation_redirect' ) );
		add_filter( 'admin_body_class', array( $this, 'admin_body_classes' ) );
		// Hide the unrelated admin notices.
		add_action( 'admin_print_scripts', array( $this, 'hide_admin_notices' ) );
		add_filter( 'plugin_action_links_' . CLI_PLUGIN_BASENAME, array( $this, 'plugin_action_links' ) );
	}

	/**
	 * Load activator on each load.
	 *
	 * @return void
	 */
	public function load() {
		\CookieYes\Lite\Includes\Activator::init();
	}

	/**
	 * Load admin notices
	 *
	 * @return void
	 */
	public function add_notices() {
		$notice = Notice::get_instance();
		$notice->add( 'connect_notice' );
		$notice->add(
			'disconnect_notice',
			array(
				'dismissible' => false,
				'type'        => 'info',
			)
		);
	}

	/**
	 * Add review notice if the plugin has been installed long enough.
	 */
	public function add_review_notice() {
		$expiry   = 60 * DAY_IN_SECONDS;
		$settings = new \CookieYes\Lite\Admin\Modules\Settings\Includes\Settings();
		$installed = $settings->get_installed_date();
		if ( $installed && ( $installed + $expiry > time() ) ) {
			return;
		}
		$notice = Notice::get_instance();
		$notice->add(
			'review_notice',
			array(
				'expiration' => $expiry,
			)
		);
	}

	/**
	 * Get the default modules array
	 *
	 * @return array
	 */
	public function get_default_modules() {
		$modules = array(
			'cookies',
			'cache',
			'banners',
			'settings',
			'dashboard',
			'consentlogs',
			'uninstall_feedback',
			'review_feedback',
			'upgrade',
			'pageviews',
			'languages',
			'gcm',
			'affiliate_banner',
			'dashboard_widget',
			'connect_banner',
		);
		return $modules;
	}

	/**
	 * Load all the modules
	 *
	 * @return void
	 */
	public function load_modules() {
		foreach ( self::$modules as $module ) {
			$parts      = explode( '_', $module );
			$class      = implode( '_', $parts );
			$class_name = 'CookieYes\Lite\\Admin\\Modules\\' . ucfirst( $module ) . '\\' . ucfirst( $class );

			if ( class_exists( $class_name ) ) {
				$module_obj = new $class_name( $module );
				if ( $module_obj instanceof $class_name ) {
					if ( $module_obj->is_active() ) {
						self::$active_modules[ $module ] = true;
					}
				}
			}
		}
	}

	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    3.0.0
	 */
	public function enqueue_styles() {
		if ( false === cky_is_admin_page() ) {
			return;
		}
		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'dist/css/style' . $this->suffix . '.css', array(), $this->version );
	}

	/**
	 * Load setup wizard on first installation of the plugin.
	 *
	 * @return void
	 */
	public function load_setup() {
		$settings     = new \CookieYes\Lite\Admin\Modules\Settings\Includes\Settings();
		$step         = $settings->get( 'onboarding', 'step' );
		$do_redirect  = true;
		$current_page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : false; // phpcs:ignore WordPress.Security.NonceVerification
		if ( false !== strpos( $current_page, 'cookie-law-info' ) ) {
			$is_onboarding_path = 'cookie-law-info-wizard' === $current_page; // phpcs:ignore WordPress.Security.NonceVerification

			// On these pages, or during these events, postpone the redirect.
			if ( wp_doing_ajax() || is_network_admin() || ! current_user_can( 'manage_options' ) ) {
				$do_redirect = false;
			}

			// On these pages, or during these events, disable the redirect.
			if ( $is_onboarding_path || 0 !== absint( $step ) ) {
				$do_redirect = false;
			}

			if ( $do_redirect ) {
				wp_safe_redirect( admin_url( 'admin.php?page=cookie-law-info-wizard' ) );
				exit;
			}
		}
	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    3.0.0
	 */
	public function enqueue_scripts() {
		if ( false === cky_is_admin_page() ) {
			return;
		}

		if ( ! cky_is_cloud_request() ) {
			$banner = \CookieYes\Lite\Admin\Modules\Banners\Includes\Controller::get_instance()->get_active_banner();
			if ( $banner ) {
				$properties = $banner->get_settings();
				$settings   = isset( $properties['settings'] ) ? $properties['settings'] : array();
				$version_id = isset( $settings['versionID'] ) ? $settings['versionID'] : 'default';
				$shortcodes = new \CookieYes\Lite\Frontend\Modules\Shortcodes\Shortcodes( $banner, $version_id );
			}
		}

		$notice         = Notice::get_instance();
		$connect_notice = Connect_Notice::get_instance();

		$global_script  = $this->plugin_name . '-app';
		$admin_url      = cky_parse_url( admin_url( 'admin.php' ) );
		$plugin_dir_url = defined( 'CKY_PLUGIN_URL' ) ? CKY_PLUGIN_URL : trailingslashit( site_url() );

		if ( function_exists( 'wp_enqueue_editor' ) ) {
			wp_enqueue_editor();
		}

		wp_enqueue_script( $this->plugin_name . '-app', plugin_dir_url( __FILE__ ) . 'dist/js/index' . $this->suffix . '.js', array(), $this->version, true );

		wp_localize_script(
			$global_script,
			'ckyGlobals',
			apply_filters(
				'cky_admin_scripts_global',
				array(
					'webApp'       => array(
						'url'        => CKY_APP_URL,
						'loginUrl'   => CKY_APP_URL . '/login',
						'signUpUrl'  => CKY_APP_URL . '/signup',
						'pricingUrl' => CKY_APP_URL . '/plans-list',
						'checkoutUrl'=> CKY_APP_URL . '/trial',
						'planSelectionUrl' => CKY_APP_URL . '/wp-plan-selector',
					),
					'path'         => array(
						'base'  => plugin_dir_path( __FILE__ ),
						'admin' => $admin_url['path'],
					),
					'api'          => array(
						'base'  => rest_url( 'cky/v1/' ),
						'nonce' => wp_create_nonce( 'wp_rest' ),
					),
					'site'         => array(
						'url'  => get_site_url(),
						'name' => esc_attr( get_option( 'blogname' ) ),
					),
					'app'          => array(
						'url' => $plugin_dir_url . 'admin/dist/',
					),
					'modules'      => self::$active_modules,
					'nonce'        => wp_create_nonce( 'wp_rest' ),
					'assetsURL'    => CKY_PLUGIN_URL . 'frontend/images/',
					'multilingual' => cky_i18n_is_multilingual() && count( cky_selected_languages() ) > 0 ? true : false,
					'pluginVersion' => $this->version,
				),
				$global_script
			)
		);
		wp_localize_script(
			$global_script,
			'ckyTranslations',
			array( 'translations' => $this->get_jed_locale_data( 'cookie-law-info' ) )
		);
		wp_localize_script(
			$global_script,
			'ckyConfig',
			apply_filters(
				'cky_admin_scripts_config',
				array(),
				$global_script
			)
		);
		wp_localize_script(
			$global_script,
			'ckyGcmConfig',
			apply_filters(
				'cky_admin_scripts_gcm_config',
				array(),
				$global_script
			)
		);
		wp_localize_script(
			$global_script,
			'ckyLanguages',
			apply_filters( 'cky_admin_scripts_languages', array(), $global_script )
		);
		wp_localize_script(
			$global_script,
			'ckyBannerConfig',
			apply_filters(
				'cky_admin_scripts_banner_config',
				array(
					'_shortCodes' => $this->prepare_shortcodes(),
				),
				$global_script
			)
		);
		wp_localize_script(
			$global_script,
			'ckyAppMenus',
			$this->get_registered_menus( true )
		);
		wp_localize_script(
			$global_script,
			'ckyAppNotices',
			$notice->get()
		);
		wp_localize_script(
			$global_script,
			'ckyNoticeExpand',
			$connect_notice->get_accordion_status()
		);
		wp_localize_script(
			$global_script,
			'ckyConnectNotice',
			$connect_notice->get_connect_notice_state()
		);
		wp_localize_script(
			$global_script,
			'ckyReviewRequest',
			Review_Request::get_for_app()
		);

	}

	/**
	 * Prepare shortcodes for banner preview.
	 *
	 * @return array
	 */
	public function prepare_shortcodes() {
		$data   = array();
		$data[] = array(
			'key'     => 'cky_readmore',
			'content' => do_shortcode( '[cky_readmore]' ),
			'tag'     => 'readmore-button',
		);
		$data[] = array(
			'key'        => 'cky_show_desc',
			'content'    => do_shortcode( '[cky_show_desc]' ),
			'tag'        => 'show-desc-button',
			'attributes' => array(),
		);
		$data[] = array(
			'key'        => 'cky_hide_desc',
			'content'    => do_shortcode( '[cky_hide_desc]' ),
			'tag'        => 'hide-desc-button',
			'attributes' => array(),
		);
		return $data;
	}

	/**
	 * Register main menu and sub menus
	 *
	 * @return void
	 */
	public function admin_menu() {
		$capability = 'manage_options';
		$slug       = 'cookie-law-info';

		$hook = add_menu_page(
			__( 'CookieYes', 'cookie-law-info' ),
			__( 'CookieYes', 'cookie-law-info' ),
			$capability,
			$slug,
			array( $this, 'menu_page_template' ),
			'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNy45NTg0IDM1LjcwOEM4LjE5MDcxIDM1LjcwOCAwLjI5MTYyNiAyNy43ODUgMC4yOTE2MjUgMTcuOTk5N0wwLjI5MTYyNSAxNi4wMjY2TDEuNjU0NyAxNi4yOTk5QzEuNzI2OSAxNi4zMTQ0IDEuNzkyNTQgMTYuMzI3OCAxLjg1MjkyIDE2LjM0MDJDMi4xODk0NyAxNi40MDg5IDIuMzYyNCAxNi40NDQyIDIuNTkzNTEgMTYuNDQ0MkM0LjAyMjM4IDE2LjQ0NDIgNS4yMDAxNyAxNS41NzUgNS42OTU5MyAxNC4zOTQ2TDYuMDg3NTcgMTMuNDYyMUw3LjA1OTg2IDEzLjc0MDZDNy41NDMzNiAxMy44NzkxIDguMDE5MjQgMTMuOTQ2NCA4LjQ5MDMyIDEzLjk0NjRDMTEuNTEyOSAxMy45NDY0IDEzLjk5NTUgMTEuNDYxNiAxMy45OTU1IDguNDI0NTFDMTMuOTk1NSA3Ljk0NzggMTMuOTI4OCA3LjUzNDcyIDEzLjg0NDggNy4wMjkzNEwxMy43MTc4IDYuMjY1NUwxNC4zODEzIDUuODY2MzdDMTUuMjcyMiA1LjMzMDUzIDE1LjkxNDcgNC4yODU1OSAxNS45ODg2IDMuMDY3MjJDMTUuOTgzNSAyLjcwNjA0IDE1Ljg4MjMgMi4zNzcyMyAxNS43MTQ3IDEuODczMTVMMTUuMzA4MSAwLjY1MDE5NUwxNi41NzE3IDAuMzk2ODM2QzE3LjA5OTIgMC4yOTEwODMgMTcuNjExNiAwLjI5MTIyNSAxOC4wMDQ2IDAuMjkxMzMyTDE4LjA0MTUgMC4yOTEzNEMyNy44MDkyIDAuMjkxMzQgMzUuNzA4MyA4LjIxNDM5IDM1LjcwODMgMTcuOTk5N0MzNS43MDgzIDI3Ljc5MjQgMjcuNzE4NyAzNS43MDggMTcuOTU4NCAzNS43MDhaTTIuNTg2NDMgMTguNzIyNUMyLjk2MjE5IDI2LjkxODMgOS42OTU4NCAzMy40Mjk3IDE3Ljk1ODQgMzMuNDI5N0MyNi40NyAzMy40Mjk3IDMzLjQzIDI2LjUyNDcgMzMuNDMgMTcuOTk5N0MzMy40MyA5LjUzMTg0IDI2LjY0OTQgMi42NzQxMyAxOC4yMzQzIDIuNTcwNzlDMTguMjU0OSAyLjczODY0IDE4LjI2NyAyLjkxMzg1IDE4LjI2NyAzLjA5NTcyTDE4LjI2NyAzLjEyNTZMMTguMjY1NSAzLjE1NTQ0QzE4LjE3ODUgNC44MTIzMiAxNy40MTk2IDYuMzUxODcgMTYuMjAwNiA3LjM2MTI0QzE2LjI0MjUgNy42ODQ1OSAxNi4yNzM3IDguMDM4MzkgMTYuMjczNyA4LjQyNDUxQzE2LjI3MzcgMTIuNzE0NSAxMi43NzY1IDE2LjIyNDYgOC40OTAzMiAxNi4yMjQ2QzguMTA2OSAxNi4yMjQ2IDcuNzI0OTYgMTYuMTk0MSA3LjM0NDk3IDE2LjEzMzhDNi4zNTg1MSAxNy42Njc0IDQuNjI1MTYgMTguNzIyNSAyLjU5MzUxIDE4LjcyMjVDMi41OTExNSAxOC43MjI1IDIuNTg4NzggMTguNzIyNSAyLjU4NjQzIDE4LjcyMjVaIiBmaWxsPSJ3aGl0ZSIvPiA8cGF0aCBkPSJNMTEuNDA1MiAyLjUyOTRDMTEuNDA1MiAxLjM1MDQ1IDEwLjQ0OTUgMC4zOTQ3MjkgOS4yNzA1MyAwLjM5NDcyOUM4LjA5MTU5IDAuMzk0NzI5IDcuMTM1ODYgMS4zNTA0NSA3LjEzNTg2IDIuNTI5NEM3LjEzNTg2IDMuNzA4MzQgOC4wOTE1OSA0LjY2NDA2IDkuMjcwNTMgNC42NjQwNkMxMC40NDk1IDQuNjY0MDYgMTEuNDA1MiAzLjcwODM0IDExLjQwNTIgMi41Mjk0WiIgZmlsbD0id2hpdGUiLz4gPHBhdGggZD0iTTEwLjI0MjYgOS4xOTcxM0MxMC4yNDI2IDguMzM5MjMgOS41NDcxMiA3LjY0Mzc2IDguNjg5MjMgNy42NDM3NkM3LjgzMTMzIDcuNjQzNzYgNy4xMzU4NiA4LjMzOTIzIDcuMTM1ODYgOS4xOTcxM0M3LjEzNTg2IDEwLjA1NSA3LjgzMTMzIDEwLjc1MDUgOC42ODkyMyAxMC43NTA1QzkuNTQ3MTIgMTAuNzUwNSAxMC4yNDI2IDEwLjA1NSAxMC4yNDI2IDkuMTk3MTNaIiBmaWxsPSJ3aGl0ZSIvPiA8cGF0aCBkPSJNNC4xMjQxMiAxMC4yODAzQzQuMTI0MTIgOS4zOTYxNCAzLjQwNzMzIDguNjc5MzUgMi41MjMxMiA4LjY3OTM1QzEuNjM4OTEgOC42NzkzNSAwLjkyMjExOSA5LjM5NjE0IDAuOTIyMTE5IDEwLjI4MDNDMC45MjIxMTkgMTEuMTY0NiAxLjYzODkxIDExLjg4MTMgMi41MjMxMiAxMS44ODEzQzMuNDA3MzMgMTEuODgxMyA0LjEyNDEyIDExLjE2NDYgNC4xMjQxMiAxMC4yODAzWiIgZmlsbD0id2hpdGUiLz4gPHBhdGggZD0iTTE2LjcxNDggMTcuMjUyM0wxNy43MzA4IDE5LjEwMjRMMTguMzUgMjAuMjE1NUwyMy4xNjAzIDEySDI2Ljg3NTJMMjAuMTQzOSAyMy40OTIzSDE2LjQyOUwxMi45OTk5IDE3LjI1MjNIMTYuNzE0OFoiIGZpbGw9IndoaXRlIi8+IDxwYXRoIGQ9Ik0xOS45NDE0IDI1Ljc5MDVIMTYuNDcyNVYyOS4yMzgySDE5Ljk0MTRWMjUuNzkwNVoiIGZpbGw9IndoaXRlIi8+IDwvc3ZnPg==',
			40
		);
	}

	/**
	 * Redirect the plugin to web app if connected.
	 *
	 * @return void
	 */
	public function handle_redirect() {
		$settings = new \CookieYes\Lite\Admin\Modules\Settings\Includes\Settings();
		global $plugin_page;
		$menu  = str_replace( 'cookie-law-info-', '', $plugin_page );
		$pages = $this->get_registered_menus();
		if ( ! isset( $pages[ $menu ] ) ) {
			return;
		}
		$page     = $pages[ $menu ];
		$redirect = isset( $page['redirect'] ) ? $page['redirect'] : false;
		if ( false === $redirect ) {
			return;
		}
		$redirect = add_query_arg(
			array(
				'website_id' => $settings->get_website_id(),
			),
			$redirect
		);
		wp_safe_redirect( esc_url_raw( $redirect ) );
	}

	/**
	 * Get regisered menus from each module.
	 *
	 * @param boolean $minify Whether to minify or not.
	 * @return array
	 */
	public function get_registered_menus( $minify = false ) {
		$menus = apply_filters( 'cky_registered_admin_menus', array() );
		if ( true === $minify ) {
			foreach ( $menus as $key => $menu ) {
				unset( $menu['callback'] );
				$menus[ $key ] = $menu;
			}
		}
		return $menus;
	}

	/**
	 * Main menu template
	 *
	 * @return void
	 */
	public function menu_page_template() {
		echo '<div id="cky-app" class="cky-app-wrap"></div>';
	}

	/**
	 * Add custom class to admin body tag.
	 *
	 * @param string $classes List of classes.
	 * @return string
	 */
	public function admin_body_classes( $classes ) {
		if ( true === cky_is_admin_page() ) {
			$classes .= ' cky-app-admin';
			global $wp_version;
			if ( version_compare( $wp_version, '6.9.4', '<=' ) ) {
				$classes .= ' cky-wp-core-radio-checked';
			} else {
				$classes .= ' cky-wp-core-radio-fill';
			}
		}
		return $classes;
	}

	/**
	 * Returns Jed-formatted localization data. Added for backwards-compatibility.
	 *
	 * @since 4.0.0
	 *
	 * @param  string $domain Translation domain.
	 * @return array          The information of the locale.
	 */
	public function get_jed_locale_data( $domain ) {
		$locale = array(
			'' => array(
				'domain' => $domain,
				'lang'   => is_admin() && function_exists( 'get_user_locale' ) ? get_user_locale() : get_locale(),
			),
		);

		// Load translations from JSON files instead of PHP domain
		$json_translations = $this->load_json_translations();

		// Convert flat translations to JED format
		// JED format expects: key => [translation] for singular strings
		foreach ( $json_translations as $key => $value ) {
			$locale[ $key ] = array( $value );
		}
		// Check for HTML line breaks in translations and clean them if found
		$json = wp_json_encode( $locale );
		if ( preg_match( '/<br[\s\/\\\\]*>/', $json ) ) {
			// Clean HTML line breaks from translations instead of returning empty array
			foreach ( $locale as $key => $value ) {
				if ( is_string( $value ) ) {
					$locale[ $key ] = str_replace( array( '<br>', '<br/>', '<br />' ), '', $value );
				} elseif ( is_array( $value ) ) {
					foreach ( $value as $sub_key => $sub_value ) {
						if ( is_string( $sub_value ) ) {
							$locale[ $key ][ $sub_key ] = str_replace( array( '<br>', '<br/>', '<br />' ), '', $sub_value );
						}
					}
				}
			}
		}

		return $locale;
	}

	/**
	 * Load translations from JSON files.
	 *
	 * @since 4.0.0
	 *
	 * @return array The merged translations from all JSON files.
	 */
	private function load_json_translations() {
		$translations = array();

		// Get current language code
		$current_lang = is_admin() && function_exists( 'get_user_locale' ) ? get_user_locale() : get_locale();
		$lang_code    = substr( $current_lang, 0, 2 ); // Get first 2 characters (e.g., 'en' from 'en_US')

		// Get WordPress languages directory path
		$languages_dir = WP_CONTENT_DIR . '/languages/';

		// Define JSON file paths for JavaScript translations
		$json_paths = array();

		// Look for JavaScript translation files with the pattern: cookie-law-info-{locale}-{hash}.json
		$plugins_dir = $languages_dir . 'plugins/';

		if ( is_dir( $plugins_dir ) ) {
			$files = glob( $plugins_dir . 'cookie-law-info-' . $current_lang . '-*.json' );
			if ( ! empty( $files ) ) {
				$json_paths = array_merge( $json_paths, $files );
			}

			// Fallback to language code without country
			$files = glob( $plugins_dir . 'cookie-law-info-' . $lang_code . '-*.json' );
			if ( ! empty( $files ) ) {
				$json_paths = array_merge( $json_paths, $files );
			}

			// Fallback to English
			$files = glob( $plugins_dir . 'cookie-law-info-en-*.json' );
			if ( ! empty( $files ) ) {
				$json_paths = array_merge( $json_paths, $files );
			}
		}

		// Load and merge translations from JSON files
		foreach ( $json_paths as $path ) {
			if ( file_exists( $path ) ) {
				$json_content = file_get_contents( $path );
				$json_data    = json_decode( $json_content, true );

				if ( $json_data && is_array( $json_data ) ) {
					// Extract translations from the nested structure
					if ( isset( $json_data['locale_data']['messages'] ) ) {
						$message_translations = $json_data['locale_data']['messages'];

						// Convert the nested structure to flat key-value pairs
						foreach ( $message_translations as $key => $value ) {
							if ( is_array( $value ) && isset( $value[0] ) ) {
								// Skip the metadata entry (empty key)
								if ( $key !== '' ) {
									$translations[ $key ] = $value[0];
								}
							}
						}
					}
				}
			}
		}

		return $translations;
	}

	/**
	 * Hide all the unrelated notices from plugin page.
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public function hide_admin_notices() {
		// Bail if we're not on a CookieYes screen.
		if ( empty( $_REQUEST['page'] ) || ! preg_match( '/cookie-law-info/', esc_html( wp_unslash( $_REQUEST['page'] ) ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			return;
		}
		global $wp_filter;

		$notices_type = array(
			'user_admin_notices',
			'admin_notices',
			'all_admin_notices',
		);

		foreach ( $notices_type as $type ) {
			if ( empty( $wp_filter[ $type ]->callbacks ) || ! is_array( $wp_filter[ $type ]->callbacks ) ) {
				continue;
			}

			foreach ( $wp_filter[ $type ]->callbacks as $priority => $hooks ) {
				foreach ( $hooks as $name => $arr ) {
					if ( is_object( $arr['function'] ) && $arr['function'] instanceof \Closure ) {
						unset( $wp_filter[ $type ]->callbacks[ $priority ][ $name ] );
						continue;
					}
					$class = ! empty( $arr['function'][0] ) && is_object( $arr['function'][0] ) ? strtolower( get_class( $arr['function'][0] ) ) : '';

					if ( ! empty( $class ) && preg_match( '/^(?:cky)/', $class ) ) {
						continue;
					}
					if ( ! empty( $name ) && ! preg_match( '/^(?:cky)/', $name ) ) {
						unset( $wp_filter[ $type ]->callbacks[ $priority ][ $name ] );
					}
				}
			}
		}
	}

	/**
	 * Load plugin for the first time.
	 *
	 * @return void
	 */
	public function load_plugin() {
		if ( is_admin() && 'true' === get_option( 'cky_first_time_activated_plugin' ) ) {
			do_action( 'cky_after_first_time_install' );
			delete_option( 'cky_first_time_activated_plugin' );
		}
	}

	/**
	 * Redirect to the plugin dashboard after activation.
	 *
	 * @param string $plugin Plugin basename.
	 * @return void
	 */
	public function handle_activation_redirect( $plugin ) {
		if ( CLI_PLUGIN_BASENAME !== $plugin ) {
			return;
		}
		if ( wp_doing_ajax() || is_network_admin() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=cookie-law-info' ) );
		exit;
	}

	/**
	 * Redirect the plugin to dashboard.
	 *
	 * @return void
	 */
	public function redirect() {
		wp_safe_redirect( admin_url( 'admin.php?page=cookie-law-info' ) );
	}

	/**
	 * Modify plugin action links on plugin listing page.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public function plugin_action_links( $links ) {
		$settings = Settings::get_instance();
		$notice   = Notice::get_instance();
		if ( $settings->is_connected() && ! $notice->is_dismissed( 'affiliate_banner' ) ) {
			$info = Controller::get_instance()->get_info();
			if ( ! is_wp_error( $info ) && is_array( $info ) ) {
				$plan = isset( $info['plan'] ) && is_array( $info['plan'] ) ? $info['plan'] : array();
				$name = isset( $plan['name'] ) ? $plan['name'] : '';
				if ( 'Agency' !== $name ) {
					$links[] = '<a href="https://www.cookieyes.com/partners/affiliates/onboarding/?ref=aiaflwp" target="_blank">' . esc_html__( 'Affiliate Program', 'cookie-law-info' ) . '</a>';
				}
			}
		}
		$links[] = '<a href="https://www.cookieyes.com/support/" target="_blank">' . esc_html__( 'Support', 'cookie-law-info' ) . '</a>';
		$links[] = '<a href="' . get_admin_url( null, 'admin.php?page=cookie-law-info' ) . '">' . esc_html__( 'Settings', 'cookie-law-info' ) . '</a>';
		return array_reverse( $links );
	}

}
