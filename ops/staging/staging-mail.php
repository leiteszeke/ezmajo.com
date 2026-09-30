<?php
/**
 * Staging only (mounted by ops/staging/compose.yml, not deployed): send all email to Mailpit.
 */
add_action( 'phpmailer_init', function ( $mailer ) {
	$mailer->isSMTP();
	$mailer->Host     = 'mailpit';
	$mailer->Port     = 1025;
	$mailer->SMTPAuth = false;
} );
