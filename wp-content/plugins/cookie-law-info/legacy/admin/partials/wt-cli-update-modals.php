<?php
// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}
$cli_uf_img          = CLI_PLUGIN_URL . 'admin/images/upgrade-flow/';
$cli_feature_cards   = array(
	array( 'icon' => 'icon-accessibility.svg',  'title' => __( 'Improved accessibility', 'cookie-law-info' ),         'desc' => __( 'Deliver a more inclusive experience with WCAG-compliant banner design.', 'cookie-law-info' ) ),
	array( 'icon' => 'icon-performance.svg',     'title' => __( 'Faster performance', 'cookie-law-info' ),              'desc' => __( 'Load your banner faster and reduce impact on page speed.', 'cookie-law-info' ) ),
	array( 'icon' => 'icon-blocking.svg',        'title' => __( 'Automatic cookie blocking', 'cookie-law-info' ),       'desc' => __( 'Handle cookie blocking automatically without manual setup.', 'cookie-law-info' ) ),
	array( 'icon' => 'icon-compliance.svg',      'title' => __( 'Built-in compliance standards', 'cookie-law-info' ),   'desc' => __( 'Supports Google Consent Mode, IAB TCF v2.3, and Google Additional Consent Mode.', 'cookie-law-info' ) ),
	array( 'icon' => 'icon-customisation.svg',   'title' => __( 'More flexible customisation', 'cookie-law-info' ),     'desc' => __( 'Customise styles and layout easily with custom CSS to adjust fonts, button style, and revisit button.', 'cookie-law-info' ) ),
);
$cli_accordion_items = array(
	array(
		'icon' => 'icon-changes.svg', 'title' => __( 'Changes in customisation', 'cookie-law-info' ),
		'desc' => __( 'Updates to banner behavior, animation, and consent interactions', 'cookie-law-info' ),
		'item_class' => 'wt-cli-accordion-item--changes', 'list_class' => '',
		'note' => __( 'These features are being removed to align with evolving privacy standards.', 'cookie-law-info' ),
		'items' => array( __( 'Turning buttons into links or redirect actions', 'cookie-law-info' ), __( 'Banner animations (on load or hide)', 'cookie-law-info' ), __( 'Scroll-based banner movement', 'cookie-law-info' ), __( 'Consent triggered by scroll or timed delay', 'cookie-law-info' ) ),
	),
	array(
		'icon' => 'icon-alternatives.svg', 'title' => __( 'What you can do instead', 'cookie-law-info' ),
		'desc' => __( 'More flexible styling, layout, and compliance-ready controls', 'cookie-law-info' ),
		'item_class' => 'wt-cli-accordion-item--alternatives', 'list_class' => 'wt-cli-bullet-list-green', 'note' => '',
		'items' => array( __( 'Modern customisation using built-in controls and custom CSS', 'cookie-law-info' ), __( 'Better control over layout, styling, and consent behavior', 'cookie-law-info' ), __( 'Automatic cookie blocking and improved compliance handling', 'cookie-law-info' ) ),
	),
	array(
		'icon' => 'icon-capabilities.svg', 'title' => __( 'Additional capabilities you get', 'cookie-law-info' ),
		'desc' => __( 'Advanced compliance, cookie blocking, and geo-targeting features', 'cookie-law-info' ),
		'item_class' => 'wt-cli-accordion-item--capabilities', 'list_class' => 'wt-cli-bullet-list-blue', 'note' => '',
		'items' => array( __( 'Premium layouts and combined GDPR + US consent templates with geo-targeting', 'cookie-law-info' ), __( 'Manual cookie blocking via script URL patterns (Cookie manager → Add cookie → Advanced settings)', 'cookie-law-info' ), __( 'Optional connection to CookieYes web app for automated cookie discovery and blocking', 'cookie-law-info' ) ),
	),
);
$cli_modal_close_btn = '<button type="button" class="wt-cli-modal-close-btn" aria-label="'
	. esc_attr__( 'Close', 'cookie-law-info' )
	. '"><img src="' . esc_url( $cli_uf_img . 'close.svg' ) . '" width="20" height="20" alt=""></button>';
$cli_get_help_link   = '<a href="https://www.cookieyes.com/support/" target="_blank" rel="noopener noreferrer" class="wt-cli-btn-outline">'
	. esc_html__( 'Get help', 'cookie-law-info' )
	. '<img src="' . esc_url( $cli_uf_img . 'icon-external-link.svg' ) . '" width="16" height="16" alt=""></a>';
?>

<!-- Overlay -->
<div id="cli-modal-overlay" class="wt-cli-modal-overlay" aria-hidden="true"></div>

<!-- Modal 1: Features overview -->
<div id="cli-modal-1" class="wt-cli-upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="cli-modal-1-title">
	<div class="wt-cli-upgrade-modal-inner">
		<div class="wt-cli-modal-header">
			<div class="wt-cli-modal-header-text">
				<h2 id="cli-modal-1-title" class="wt-cli-modal-title"><?php echo esc_html__( 'Update to a faster, more flexible cookie banner', 'cookie-law-info' ); ?></h2>
				<p class="wt-cli-modal-subtitle"><?php echo esc_html__( 'Get the latest improvements with a faster, more flexible cookie banner.', 'cookie-law-info' ); ?></p>
			</div>
			<?php echo $cli_modal_close_btn; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
		<div class="wt-cli-modal-body wt-cli-modal-1-body">
			<div class="wt-cli-modal-1-left">
				<div class="wt-cli-modal-1-features-head">
					<h3 class="wt-cli-features-title"><?php echo esc_html__( 'What you get', 'cookie-law-info' ); ?></h3>
					<p class="wt-cli-features-subtitle"><?php echo esc_html__( 'Powerful new features to enhance your compliance', 'cookie-law-info' ); ?></p>
				</div>
				<div class="wt-cli-feature-cards">
					<?php foreach ( $cli_feature_cards as $card ) : ?>
					<div class="wt-cli-feature-card">
						<div class="wt-cli-feature-card-icon">
							<img src="<?php echo esc_url( $cli_uf_img . $card['icon'] ); ?>" width="20" height="20" alt="">
						</div>
						<div class="wt-cli-feature-card-text">
							<p class="wt-cli-feature-card-title"><?php echo esc_html( $card['title'] ); ?></p>
							<p class="wt-cli-feature-card-desc"><?php echo esc_html( $card['desc'] ); ?></p>
						</div>
					</div>
					<?php endforeach; ?>
				</div>
				<div class="wt-cli-modal-note">
					<img src="<?php echo esc_url( $cli_uf_img . 'icon-note.svg' ); ?>" width="16" height="16" alt="">
					<p><strong><?php echo esc_html__( 'Note:', 'cookie-law-info' ); ?></strong> <?php echo esc_html__( "Older banner versions won't receive new features or compliance updates.", 'cookie-law-info' ); ?></p>
				</div>
			</div>
			<div class="wt-cli-modal-1-right">
				<h3 class="wt-cli-video-heading"><?php echo esc_html__( "See what's new", 'cookie-law-info' ); ?></h3>
				<div class="wt-cli-video-preview">
					<video
						class="wt-cli-video-player"
						src="<?php echo esc_url( CLI_PLUGIN_URL . 'admin/videos/banner-update-overview.webm' ); ?>"
						controls
						preload="metadata"
					></video>
				</div>
				<p class="wt-cli-video-caption"><?php echo esc_html__( 'Watch a quick overview of the new features and improvements in the latest banner version.', 'cookie-law-info' ); ?></p>
			</div>
		</div>
		<div class="wt-cli-modal-footer">
			<p class="wt-cli-modal-meta"><?php echo esc_html__( 'Quick update • No pricing impact • Safe rollback within 14 days', 'cookie-law-info' ); ?></p>
			<div class="wt-cli-modal-footer-actions">
				<?php echo $cli_get_help_link; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<button type="button" id="cli-btn-review-changes" class="wt-cli-btn-primary">
					<?php echo esc_html__( 'Review changes', 'cookie-law-info' ); ?>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal 2: What changes accordion -->
<div id="cli-modal-2" class="wt-cli-upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="cli-modal-2-title">
	<div class="wt-cli-upgrade-modal-inner">
		<div class="wt-cli-modal-header">
			<div class="wt-cli-modal-header-text">
				<h2 id="cli-modal-2-title" class="wt-cli-modal-title"><?php echo esc_html__( 'What changes with the new banner', 'cookie-law-info' ); ?></h2>
				<p class="wt-cli-modal-subtitle"><?php echo esc_html__( 'Some legacy customisation options will be replaced with updated, more compliant approaches.', 'cookie-law-info' ); ?></p>
			</div>
			<?php echo $cli_modal_close_btn; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
		<div class="wt-cli-modal-body wt-cli-modal-2-body">
			<div class="wt-cli-accordion-list">

				<?php foreach ( $cli_accordion_items as $accordion ) : ?>
				<div class="wt-cli-accordion-item <?php echo esc_attr( $accordion['item_class'] ); ?>">
					<button type="button" class="wt-cli-accordion-header" aria-expanded="false">
						<div class="wt-cli-accordion-header-left">
							<span class="wt-cli-accordion-icon">
								<img src="<?php echo esc_url( $cli_uf_img . $accordion['icon'] ); ?>" width="20" height="20" alt="">
							</span>
							<div class="wt-cli-accordion-header-text">
								<span class="wt-cli-accordion-title"><?php echo esc_html( $accordion['title'] ); ?></span>
								<span class="wt-cli-accordion-desc"><?php echo esc_html( $accordion['desc'] ); ?></span>
							</div>
						</div>
						<img class="wt-cli-accordion-chevron" src="<?php echo esc_url( $cli_uf_img . 'chevron-down.svg' ); ?>" width="20" height="20" alt="">
					</button>
					<div class="wt-cli-accordion-body">
						<ul class="wt-cli-bullet-list <?php echo esc_attr( $accordion['list_class'] ); ?>">
							<?php foreach ( $accordion['items'] as $item ) : ?>
							<li><?php echo esc_html( $item ); ?></li>
							<?php endforeach; ?>
						</ul>
						<?php if ( ! empty( $accordion['note'] ) ) : ?>
						<div class="wt-cli-modal-note wt-cli-modal-note-sm">
							<img src="<?php echo esc_url( $cli_uf_img . 'icon-note.svg' ); ?>" width="16" height="16" alt="">
							<p><?php echo esc_html( $accordion['note'] ); ?></p>
						</div>
						<?php endif; ?>
					</div>
				</div>
				<?php endforeach; ?>

			</div>
		</div>
		<div class="wt-cli-modal-footer">
			<button type="button" id="cli-btn-view-features" class="wt-cli-btn-back">
				<img src="<?php echo esc_url( $cli_uf_img . 'arrow-left.svg' ); ?>" width="16" height="16" alt="">
				<?php echo esc_html__( 'View new features', 'cookie-law-info' ); ?>
			</button>
			<div class="wt-cli-modal-footer-actions">
				<?php echo $cli_get_help_link; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<a href="<?php echo esc_url( wp_nonce_url( add_query_arg( 'migrate', 'start', admin_url( 'edit.php?post_type=cookielawinfo&page=cookie-law-info' ) ), 'migrate', '_wpnonce' ) ); ?>" class="wt-cli-btn-primary">
					<?php echo esc_html__( 'Update to new version', 'cookie-law-info' ); ?>
				</a>
			</div>
		</div>
	</div>
</div>
