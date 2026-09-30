<?php

/**
 * Fired during plugin activation
 *
 * @link       https://www.webtoffee.com/
 * @since      3.0.0
 *
 * @package    CookieYes
 * @subpackage CookieYes/includes
 */

namespace CookieYes\Lite\Includes;

use CookieYes\Lite\Admin\Modules\Banners\Includes\Banner;
use CookieYes\Lite\Admin\Modules\Banners\Includes\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      3.0.0
 * @package    CookieYes
 * @subpackage CookieYes/includes
 * @author     WebToffee <info@webtoffee.com>
 */
class Activator {

	/**
	 * Instance of the current class
	 *
	 * @var object
	 */
	private static $instance;
	/**
	 * Update DB callbacks.
	 *
	 * @var array
	 */
	private static $db_updates = array(
		'3.0.7' => array(
			'update_db_307',
		),
		'3.2.1' => array(
			'update_db_321',
		),
		'3.3.7' => array(
			'update_db_337',
		),
		'3.4.0' => array(
			'update_db_340',
		),
		'3.4.1' => array(
			'update_db_341',
		),
		'3.5.0' => array(
			'update_db_350',
		),
	);
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
	 * Activate the plugin
	 *
	 * @since 3.0.0
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'check_version' ), 5 );
	}
	/**
	 * Check the plugin version and run the updater is required.
	 *
	 * This check is done on all requests and runs if the versions do not match.
	 */
	public static function check_version() {
		if ( ! defined( 'IFRAME_REQUEST' ) && version_compare( get_option( 'wt_cli_version', '2.1.3' ), CLI_VERSION, '<' ) ) {
			self::install();
		}
	}
	/**
	 * Install all the plugin
	 *
	 * @return void
	 */
	public static function install() {
		self::check_for_upgrade();
		if ( true === cky_first_time_install() ) {
			add_option( 'cky_first_time_activated_plugin', 'true' );
		}
		self::maybe_update_db();
		update_option( 'wt_cli_version', CLI_VERSION );
		do_action( 'cky_after_activate', CLI_VERSION );
		self::update_db_version();
	}

	/**
	 * Set a temporary flag during the first time installation.
	 *
	 * @return void
	 */
	public static function check_for_upgrade() {
		if ( false === get_option( 'cky_settings', false ) ) {
			if ( false === get_site_transient( '_cky_first_time_install' ) ) {
				set_site_transient( '_cky_first_time_install', true, 30 );
			}
		}
	}

	/**
	 * Update DB version to track changes to data structure.
	 *
	 * @param string $version Current version.
	 * @return void
	 */
	public static function update_db_version( $version = null ) {
		update_option( 'cky_cookie_consent_lite_db_version', is_null( $version ) ? CLI_VERSION : $version );
	}

	/**
	 * Check if any database changes is required on the latest release
	 *
	 * @return boolean
	 */
	private static function needs_db_update() {
		$current_version = get_option( 'cky_cookie_consent_lite_db_version', '3.0.7' ); // @since 3.0.7 introduced DB migrations
		$updates         = self::$db_updates;
		$update_versions = array_keys( $updates );
		usort( $update_versions, 'version_compare' );
		return ! is_null( $current_version ) && version_compare( $current_version, end( $update_versions ), '<' );
	}

	/**
	 * Update DB if required
	 *
	 * @return void
	 */
	public static function maybe_update_db() {
		if ( self::needs_db_update() ) {
			self::update();
		}
	}

	/**
	 * Run a update check during each release update.
	 *
	 * @return void
	 */
	private static function update() {
		$current_version = get_option( 'cky_cookie_consent_lite_db_version', '3.0.7' );
		foreach ( self::$db_updates as $version => $callbacks ) {
			if ( version_compare( $current_version, $version, '<' ) ) {
				foreach ( $callbacks as $callback ) {
					self::$callback();
				}
			}
		}
	}

	/**
	 * Migrate existing banner contents to support new CCPA/GPC changes
	 *
	 * @return void
	 */
	public static function update_db_307() {
		$items = Controller::get_instance()->get_items();
		foreach ( $items as $item ) {
			$banner   = new Banner( $item->banner_id );
			$contents = $banner->get_contents();
			foreach ( $contents as $language => $content ) {
				$translation = $banner->get_translations( $language );
				$text        = isset( $translation['optoutPopup']['elements']['buttons']['elements']['confirm'] ) ? $translation['optoutPopup']['elements']['buttons']['elements']['confirm'] : 'Save My Preferences';
				$content['optoutPopup']['elements']['buttons']['elements']['confirm'] = $text;
				$contents[ $language ] = $content;
			}
			$banner->set_contents( $contents );
			$banner->save();
		}
	}

	public static function update_db_321() {
		$items = Controller::get_instance()->get_items();
		foreach ( $items as $item ) {
			$banner   = new Banner( $item->banner_id );
			$contents = $banner->get_contents();
			$settings = $banner->get_settings();
			if ( isset($contents['en']) ) {
				$translation = $banner->get_translations( 'en' );
				$text        = isset( $translation['optoutPopup']['elements']['gpcOption']['elements']['description'] ) ? $translation['optoutPopup']['elements']['gpcOption']['elements']['description'] : "<p>Your opt-out settings for this website have been respected since we detected a <b>Global Privacy Control</b> signal from your browser and, therefore, you cannot change this setting.</p>";
				$contents['en']['optoutPopup']['elements']['gpcOption']['elements']['description'] = $text;
			}
			if ( isset($settings['config']) ) {
				$settings['config']['preferenceCenter']['elements']['categories']['elements']['toggle']['status']=!$settings['config']['categoryPreview']['status'];
			}
			$banner->set_contents( $contents );
			$banner->set_settings( $settings );
			$banner->save();
		}
	}

	/**
	 * Fix MySQL schema compatibility for TEXT/LONGTEXT columns.
	 * Remove DEFAULT values from TEXT/LONGTEXT columns to prevent MySQL errors.
	 *
	 * @since 3.3.7
	 * @return void
	 */
	public static function update_db_337() {
		// Reset table version options to force schema update with corrected definitions
		delete_option( 'cky_banners_table_version' );
		delete_option( 'cky_cookie_table_version' );
		delete_option( 'cky_cookie_category_table_version' );

		// Reinstall tables with the corrected schema (without DEFAULT on TEXT/LONGTEXT columns)
		$controllers = array(
			'CookieYes\Lite\Admin\Modules\Banners\Includes\Controller',
			'CookieYes\Lite\Admin\Modules\Cookies\Includes\Cookie_Controller',
			'CookieYes\Lite\Admin\Modules\Cookies\Includes\Category_Controller',
		);

		foreach ( $controllers as $controller_class ) {
			if ( class_exists( $controller_class ) ) {
				$controller = $controller_class::get_instance();
				$controller->install_tables();
			}
		}
	}

	/**
	 * Fix the accept-button state on CCPA vs non-CCPA banners for users who
	 * migrated from the legacy UI (which left every banner with accept enabled).
	 *
	 * @since 3.4.0
	 * @return void
	 */
	public static function update_db_340() {
		$migration_options = get_option( 'cky_migration_options', array() );
		$migration_status  = isset( $migration_options['status'] ) ? $migration_options['status'] : false;

		if ( ! $migration_status ) {
			return;
		}

		$items = Controller::get_instance()->get_items();
		foreach ( $items as $item ) {
			$banner   = new Banner( $item->banner_id );
			$settings = $banner->get_settings();
			$law      = $banner->get_law();

			if ( 'ccpa' === $law ) {
				if ( isset( $settings['config']['notice']['elements']['buttons']['elements']['accept'] ) ) {
					$settings['config']['notice']['elements']['buttons']['elements']['accept']['status'] = false;
					$banner->set_settings( $settings );
					$banner->save();
				}
			} else {
				if ( isset( $settings['config']['notice']['elements']['buttons']['elements']['accept']['status'] )
					&& false === $settings['config']['notice']['elements']['buttons']['elements']['accept']['status'] ) {
					$settings['config']['notice']['elements']['buttons']['elements']['accept']['status'] = true;
					$banner->set_settings( $settings );
					$banner->save();
				}
			}
		}
	}

	/**
	 * Remove accessibilityOverrides from banners with versionID 6.0.0, seed
	 * default opt-out success content on CCPA banners, and purge the banner
	 * template cache so the refreshed HTML/theme is regenerated.
	 *
	 * @since 3.4.1
	 * @return void
	 */
	public static function update_db_341() {
		$controller = Controller::get_instance();
		$controller->delete_cache();
		$items = $controller->get_items();

		if ( ! empty( $items ) ) {
			foreach ( $items as $item ) {
				self::maybe_strip_accessibility_overrides_341( $item );
			}
			self::seed_ccpa_optout_success_defaults( $items );
		}

		delete_option( 'cky_banner_template' );
		Cache::delete( 'banner_template' );
		$controller->delete_cache();
	}

	/**
	 * Invalidate cached banner markup so the front end rebuilds HTML from the
	 * current plugin templates and shortcodes (preference-center IDs, button
	 * ARIA, etc.).
	 *
	 * @since 3.5.0
	 * @return void
	 */
	public static function update_db_350() {
		$controller = Controller::get_instance();
		$controller->delete_cache();
		delete_option( 'cky_banner_template' );
		Cache::delete( 'banner_template' );
		$controller->delete_cache();
	}

	/**
	 * Drop legacy accessibilityOverrides for 6.0.0 banners (or banners missing versionID).
	 *
	 * @param object $item Row from Controller::get_items(); settings are decoded JSON.
	 * @return void
	 */
	private static function maybe_strip_accessibility_overrides_341( $item ) {
		if ( ! isset( $item->banner_id, $item->settings ) || ! is_array( $item->settings ) ) {
			return;
		}

		$raw_settings = $item->settings;

		if ( ! isset( $raw_settings['config']['accessibilityOverrides'] ) ) {
			return;
		}

		$version_id = isset( $raw_settings['settings']['versionID'] ) ? $raw_settings['settings']['versionID'] : '';
		if ( '' !== $version_id && '6.0.0' !== $version_id ) {
			return;
		}

		unset( $raw_settings['config']['accessibilityOverrides'] );

		if ( '' === $version_id ) {
			$raw_settings['settings']['versionID'] = '6.0.0';
		}

		$banner = new Banner( $item->banner_id );
		$banner->set_settings( $raw_settings );
		$banner->save();
	}

	/**
	 * Ensure CCPA banners have optoutSuccess config + per-language strings
	 * (for databases created before this field existed).
	 *
	 * @param array $items Rows from Controller::get_items().
	 * @return void
	 */
	private static function seed_ccpa_optout_success_defaults( $items ) {
		$optout_success_defaults = array(
			'text'    => 'Your opt-out preference has been honored.',
			'subtext' => 'Banner closes automatically in 15 s...',
		);

		foreach ( $items as $item ) {
			if ( ! isset( $item->banner_id ) ) {
				continue;
			}

			$banner = new Banner( $item->banner_id );
			$law    = $banner->get_law();

			if ( ! is_string( $law ) || false === stripos( $law, 'ccpa' ) ) {
				continue;
			}

			$need     = false;
			$settings = $banner->get_settings();
			$opt_ok   = isset( $settings['config']['optoutPopup']['elements']['optoutSuccess'] )
				&& is_array( $settings['config']['optoutPopup']['elements']['optoutSuccess'] );

			if ( $opt_ok && ! isset( $settings['config']['optoutPopup']['elements']['optoutSuccess']['status'] ) ) {
				$settings['config']['optoutPopup']['elements']['optoutSuccess']['status'] = true;
				$banner->set_settings( $settings );
				$need = true;
			}

			$contents = $banner->get_contents();

			foreach ( $contents as $lang => $content ) {
				if ( ! is_array( $content )
					|| ! isset( $content['optoutPopup']['elements'] )
					|| ! is_array( $content['optoutPopup']['elements'] ) ) {
					continue;
				}

				$elements = &$content['optoutPopup']['elements'];

				if ( ! isset( $elements['optoutSuccess'] ) || ! is_array( $elements['optoutSuccess'] ) ) {
					$elements['optoutSuccess'] = array(
						'elements' => array(
							'text'    => $optout_success_defaults['text'],
							'subtext' => $optout_success_defaults['subtext'],
						),
					);
					$need = true;
				} else {
					if ( ! isset( $elements['optoutSuccess']['elements'] ) || ! is_array( $elements['optoutSuccess']['elements'] ) ) {
						$elements['optoutSuccess']['elements'] = array();
						$need = true;
					}

					$success_els = &$elements['optoutSuccess']['elements'];

					if ( ! isset( $success_els['text'] ) || '' === trim( (string) $success_els['text'] ) ) {
						$success_els['text'] = $optout_success_defaults['text'];
						$need                = true;
					}
					if ( ! isset( $success_els['subtext'] ) || '' === trim( (string) $success_els['subtext'] ) ) {
						$success_els['subtext'] = $optout_success_defaults['subtext'];
						$need                   = true;
					}

					unset( $success_els );
				}

				unset( $elements );

				$contents[ $lang ] = $content;
			}

			if ( $need ) {
				$banner->set_contents( $contents );
				$banner->save();
			}
		}
	}
}
