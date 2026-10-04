<?php
/**
 * Menu: "Tienda" (submenu Patrones, Prendas) between Servicios and Contacto; mini cart next to the menu in the header.
 * Idempotent. Run as admin (KSES): wp --user=<admin> eval-file ops/tienda/03-menu.php
 */
$shop = (int) get_option( 'woocommerce_shop_page_id' );
$nav  = 58; // wp_navigation "Menú"
$head = 59; // header template part

$content = get_post_field( 'post_content', $nav );
// Earlier version of this script added a plain "Patrones" link: replaced by the Tienda submenu.
$content = preg_replace( '#<!-- wp:navigation-link \{"label":"Patrones"[^}]*\}(?:\}\}\}\})? /-->\s*#', '', $content );
if ( false === strpos( $content, '"label":"Tienda"' ) ) {
	$link = function ( $term ) {
		return sprintf(
			'<!-- wp:navigation-link {"label":"%s","type":"product_cat","id":%d,"url":"%s","kind":"taxonomy"} /-->',
			esc_attr( $term->name ),
			$term->term_id,
			esc_url_raw( get_term_link( $term ) )
		);
	};
	$submenu = sprintf(
		"<!-- wp:navigation-submenu {\"label\":\"Tienda\",\"type\":\"page\",\"id\":%d,\"url\":\"%s\",\"kind\":\"post-type\"} -->\n%s\n%s\n<!-- /wp:navigation-submenu -->",
		$shop,
		esc_url_raw( get_permalink( $shop ) ),
		$link( get_term_by( 'slug', 'patrones', 'product_cat' ) ),
		$link( get_term_by( 'slug', 'prendas', 'product_cat' ) )
	);
	$anchor = '<!-- wp:navigation-link {"label":"Contacto"';
	if ( 1 !== substr_count( $content, $anchor ) ) {
		WP_CLI::error( 'Menu anchor (Contacto) not found' );
	}
	$content = str_replace( $anchor, $submenu . "\n\n" . $anchor, $content );
	wp_update_post( array( 'ID' => $nav, 'post_content' => wp_slash( $content ) ) );
	WP_CLI::log( 'Menu: Tienda (Patrones, Prendas) added' );
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
