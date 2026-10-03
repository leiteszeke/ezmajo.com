<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Utilize WC logger class
 *
 * @since   1.0.0
 * @version 1.0.0
 */
class WC_SUMUP_LOGGER {
	/**
	 * Add a log entry.
	 *
	 * @param string $message Log message.
	 * @param array  $context Structured log context.
	 * @param string $level Log level supported by WC_Logger.
	 */
	public static function log( $message, $context = array(), $level = 'debug' ) {
		if ( ! class_exists( 'WC_Logger' ) ) {
			return;
		}

		$options = get_option( 'woocommerce_sumup_settings' );
		if ( empty( $options ) || ( isset( $options['logging'] ) && 'yes' !== $options['logging'] ) ) {
			return;
		}

		$logger = wc_get_logger();
		$logger_context = array( 'source' => WC_SUMUP_PLUGIN_SLUG );
		$record = self::build_record( $message, $context, $level, $options );
		$log_message = wp_json_encode( $record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

		if ( false === $log_message ) {
			$log_message = (string) $message;
		}

		$logger->log( $level, $log_message, $logger_context );
	}

	/**
	 * Build a structured log record.
	 *
	 * @param string $message Log message.
	 * @param array  $context Structured log context.
	 * @param string $level Log level.
	 * @param array  $options Gateway settings.
	 * @return array
	 */
	private static function build_record( $message, $context, $level, $options ) {
		$record_context = is_array( $context ) ? $context : array();

		if ( empty( $record_context['merchant_code'] ) && ! empty( $options['merchant_id'] ) ) {
			$record_context['merchant_code'] = sanitize_text_field( (string) $options['merchant_id'] );
		}

		return array(
			'timestamp' => gmdate( 'c' ),
			'level' => (string) $level,
			'message' => (string) $message,
			'plugin' => WC_SUMUP_PLUGIN_SLUG,
			'plugin_version' => WC_SUMUP_VERSION,
			'context' => $record_context,
		);
	}
}
