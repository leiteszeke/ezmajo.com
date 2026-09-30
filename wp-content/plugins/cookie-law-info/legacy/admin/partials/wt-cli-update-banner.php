<?php
// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}
$cli_uf_img = CLI_PLUGIN_URL . 'admin/images/upgrade-flow/';
?>
<div class="wt-cli-update-banner">
	<div class="wt-cli-update-banner-icon">
		<img src="<?php echo esc_url( $cli_uf_img . 'icon-warning-circle.svg' ); ?>" width="32" height="32" alt="">
	</div>
	<div class="wt-cli-update-banner-content">
		<p class="wt-cli-update-banner-title"><?php echo esc_html__( 'Your cookie banner is outdated, a new version is available!', 'cookie-law-info' ); ?></p>
		<p class="wt-cli-update-banner-desc">
			<?php echo esc_html__( 'Upgrade now for better performance, easier customisations, and continued compliance support. Revert anytime within 14 days.', 'cookie-law-info' ); ?>
		</p>
	</div>
	<button type="button" class="wt-cli-update-banner-btn" data-cli-open-modal="cli-modal-1">
		<?php echo esc_html__( 'Review & update', 'cookie-law-info' ); ?>
	</button>
</div>
