<?php
/**
 * Menu: "Patrones" between Servicios and Contacto; mini cart next to the menu in the header.
 * Idempotent. Run as admin (KSES): wp --user=<admin> eval-file ops/tienda/03-menu.php
 */
$shop = (int) get_option( 'woocommerce_shop_page_id' );
$nav  = 58; // wp_navigation "Menú"
$head = 59; // header template part

$content = get_post_field( 'post_content', $nav );
if ( false === strpos( $content, '"label":"Patrones"' ) ) {
	$link = sprintf(
		'<!-- wp:navigation-link {"label":"Patrones","type":"page","id":%d,"url":"%s","kind":"post-type","metadata":{"bindings":{"url":{"source":"core/post-data","args":{"field":"link"}}}}} /-->',
		$shop,
		esc_url_raw( get_permalink( $shop ) )
	);
	$anchor = '<!-- wp:navigation-link {"label":"Contacto"';
	if ( 1 !== substr_count( $content, $anchor ) ) {
		WP_CLI::error( 'Menu anchor (Contacto) not found' );
	}
	$content = str_replace( $anchor, $link . "\n\n" . $anchor, $content );
	wp_update_post( array( 'ID' => $nav, 'post_content' => wp_slash( $content ) ) );
	WP_CLI::log( 'Menu: Patrones added' );
}

$header = get_post_field( 'post_content', $head );
if ( false === strpos( $header, 'wp:woocommerce/mini-cart' ) ) {
	$anchor = '"justifyContent":"right"}} /-->';
	if ( 1 !== substr_count( $header, $anchor ) ) {
		WP_CLI::error( 'Header anchor (navigation block) not found' );
	}
	$header = str_replace( $anchor, $anchor . "\n\n<!-- wp:woocommerce/mini-cart {\"addToCartBehaviour\":\"open_drawer\",\"hasHiddenPrice\":true} /-->", $header );
	wp_update_post( array( 'ID' => $head, 'post_content' => wp_slash( $header ) ) );
	WP_CLI::log( 'Header: mini cart added' );
}
WP_CLI::success( 'Menu done' );
