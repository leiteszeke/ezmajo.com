<?php
/**
 * Review request notice (React admin).
 * Uses same option names as legacy for compatibility.
 *
 * @link       https://www.cookieyes.com/
 * @since      3.0.0
 * @package    CookieYes\Lite\Includes
 */

namespace CookieYes\Lite\Includes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles review request state for the React admin.
 * Banner states: 1=active, 2=waiting, 3=never/closed, 4=done, 5=remind later.
 */
class Review_Request {

	const OPTION_STATE   = 'wt_cli_review_request';
	const OPTION_START   = 'wt_cli_start_date';
	const DAYS_FIRST     = 15;
	const DAYS_REMIND    = 15;
	const REVIEW_URL     = 'https://wordpress.org/support/plugin/cookie-law-info/reviews/#new-post';

	/**
	 * Whether the review banner should be shown.
	 *
	 * @return bool
	 */
	public static function should_show() {
		$state = (int) get_option( self::OPTION_STATE, 2 );
		$start = (int) get_option( self::OPTION_START, 0 );

		if ( 1 === $state ) {
			return true;
		}

		if ( 2 !== $state && 5 !== $state ) {
			return false;
		}

		if ( 0 === $start ) {
			update_option( self::OPTION_START, time() );
			return false;
		}

		$days = ( 2 === $state ) ? self::DAYS_FIRST : self::DAYS_REMIND;
		$show_at = $start + ( 86400 * $days );
		return $show_at <= time();
	}

	/**
	 * Data for React (ckyReviewRequest).
	 *
	 * @return array{show: bool, reviewUrl: string}
	 */
	public static function get_for_app() {
		return array(
			'show'      => self::should_show(),
			'reviewUrl' => self::REVIEW_URL,
		);
	}

	/**
	 * Process user action: later, never, review, closed.
	 *
	 * @param string $action One of: later, never, review, closed.
	 * @return bool Success.
	 */
	public static function process_action( $action ) {
		$allowed = array( 'later', 'never', 'review', 'closed' );
		if ( ! in_array( $action, $allowed, true ) ) {
			return false;
		}

		if ( 'never' === $action || 'closed' === $action ) {
			update_option( self::OPTION_STATE, 3 );
			return true;
		}

		if ( 'review' === $action ) {
			update_option( self::OPTION_STATE, 4 );
			return true;
		}

		// Remind me later.
		update_option( self::OPTION_START, time() );
		update_option( self::OPTION_STATE, 5 );
		return true;
	}
}
