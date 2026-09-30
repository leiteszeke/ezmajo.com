<?php
/**
 * Plugin Name: Ezmajo
 * Description: Site-specific tweaks for ezmajo.com (security, comments, business info, WhatsApp button). Must-use plugin: always active.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Business details: single source for schema, [ezmajo_horario], [ezmajo_contacto] and the WhatsApp button.
 * Keep in sync with the Google Business Profile.
 */
function ezmajo_business() {
	return array(
		'name'          => 'Arreglos Ezmajo',
		'phone'         => '+34604930764',
		'phone_display' => '604 93 07 64',
		'whatsapp'      => '34604930764',
		'whatsapp_text' => 'Hola, quería consultar por un arreglo.',
		'street'        => 'Carrer del Rosselló, 64',
		'district'      => 'Eixample',
		'postal_code'   => '08029',
		'city'          => 'Barcelona',
		'country'       => 'ES',
		'lat'           => 41.3861582,
		'lng'           => 2.1481135,
		'maps_url'      => 'https://maps.google.com/?cid=16293754735231472786',
		'instagram'     => 'https://www.instagram.com/ezmajo',
		'hours'         => array(
			array(
				'label' => 'Lunes a jueves',
				'days'  => array( 'Monday', 'Tuesday', 'Wednesday', 'Thursday' ),
				'slots' => array( array( '09:30', '13:30' ), array( '16:00', '19:30' ) ),
			),
			array(
				'label' => 'Viernes',
				'days'  => array( 'Friday' ),
				'slots' => array( array( '09:30', '16:00' ) ),
			),
			array(
				'label' => 'Sábado y domingo',
				'days'  => array( 'Saturday', 'Sunday' ),
				'slots' => array(),
			),
		),
	);
}

function ezmajo_whatsapp_url() {
	$b = ezmajo_business();
	return 'https://wa.me/' . $b['whatsapp'] . '?text=' . rawurlencode( $b['whatsapp_text'] );
}

/*
 * Security: don't expose user accounts to anonymous visitors.
 */

// Hide /wp-json/wp/v2/users for non-logged-in requests.
add_filter( 'rest_endpoints', function ( $endpoints ) {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}
	unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
	return $endpoints;
} );

// Block ?author=N enumeration and author archives (single-author business site).
// Priority 1: must run before redirect_canonical, which would reveal the username.
add_action( 'template_redirect', function () {
	if ( is_author() || isset( $_GET['author'] ) ) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
}, 1 );

// No XML-RPC: nothing on this site uses it.
add_filter( 'xmlrpc_enabled', '__return_false' );

// Don't advertise the WordPress version.
remove_action( 'wp_head', 'wp_generator' );

/*
 * Comments: the site has no blog, keep them off everywhere.
 */
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
add_filter( 'comments_array', '__return_empty_array', 10 );

/*
 * Local SEO: turn Yoast's Organization node into a LocalBusiness with address, geo and opening hours.
 * No self-declared ratings: Google ignores/penalises self-serving reviews for LocalBusiness.
 */
add_filter( 'wpseo_schema_organization', function ( $data ) {
	$b = ezmajo_business();

	$data['@type']         = array( 'Organization', 'LocalBusiness' );
	$data['alternateName'] = $b['name'];
	$data['telephone']     = $b['phone'];
	$data['address']       = array(
		'@type'           => 'PostalAddress',
		'streetAddress'   => $b['street'],
		'addressLocality' => $b['city'],
		'addressRegion'   => $b['city'],
		'postalCode'      => $b['postal_code'],
		'addressCountry'  => $b['country'],
	);
	$data['geo']           = array(
		'@type'     => 'GeoCoordinates',
		'latitude'  => $b['lat'],
		'longitude' => $b['lng'],
	);
	$data['hasMap']        = $b['maps_url'];
	$data['areaServed']    = $b['city'];
	$data['sameAs']        = array_values( array_unique( array_merge( (array) ( $data['sameAs'] ?? array() ), array( $b['instagram'], $b['maps_url'] ) ) ) );

	$data['openingHoursSpecification'] = array();
	foreach ( $b['hours'] as $row ) {
		foreach ( $row['slots'] as $slot ) {
			$data['openingHoursSpecification'][] = array(
				'@type'     => 'OpeningHoursSpecification',
				'dayOfWeek' => $row['days'],
				'opens'     => $slot[0],
				'closes'    => $slot[1],
			);
		}
	}

	return $data;
} );

/*
 * [ezmajo_horario]: opening hours list. [ezmajo_contacto]: address, phone, WhatsApp and hours (footer).
 */
function ezmajo_hours_html() {
	$items = '';
	foreach ( ezmajo_business()['hours'] as $row ) {
		$slots = $row['slots']
			? implode( ' y ', array_map( function ( $s ) {
				return '<span class="ezmajo-horario__tramo">' . esc_html( ltrim( $s[0], '0' ) . '–' . ltrim( $s[1], '0' ) ) . '</span>';
			}, $row['slots'] ) )
			: 'Cerrado';
		$items .= sprintf( '<li><span class="ezmajo-horario__dia">%s</span> <span class="ezmajo-horario__horas">%s</span></li>', esc_html( $row['label'] ), $slots );
	}
	return '<ul class="ezmajo-horario">' . $items . '</ul>';
}
add_shortcode( 'ezmajo_horario', 'ezmajo_hours_html' );

add_shortcode( 'ezmajo_contacto', function () {
	$b = ezmajo_business();
	return sprintf(
		'<div class="ezmajo-contacto">
			<p><a href="%1$s" target="_blank" rel="noopener">%2$s · %3$s, %4$s %5$s</a></p>
			<p><a href="tel:%6$s">%7$s</a> · <a href="%8$s" target="_blank" rel="noopener">WhatsApp</a></p>
			%9$s
		</div>',
		esc_url( $b['maps_url'] ),
		esc_html( $b['street'] ),
		esc_html( $b['district'] ),
		esc_html( $b['postal_code'] ),
		esc_html( $b['city'] ),
		esc_attr( $b['phone'] ),
		esc_html( $b['phone_display'] ),
		esc_url( ezmajo_whatsapp_url() ),
		ezmajo_hours_html()
	);
} );

/*
 * Floating WhatsApp button (bottom right; the cookie banner's revisit button sits bottom left).
 * WhatsApp teal (#128c7e) instead of #25d366: white icon needs >= 3:1 contrast (site has an accessibility statement).
 */
add_action( 'wp_footer', function () {
	printf(
		'<a class="ezmajo-wa" href="%s" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp" title="Escríbenos por WhatsApp">
			<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.04 3C8.86 3 3.03 8.8 3.03 15.95c0 2.29.6 4.52 1.75 6.49L3 29l6.73-1.76a13.04 13.04 0 0 0 6.3 1.6h.01c7.17 0 13-5.8 13-12.95C29.04 8.8 23.21 3 16.04 3Zm0 23.66h-.01a10.8 10.8 0 0 1-5.5-1.5l-.39-.23-4 1.04 1.07-3.88-.26-.4a10.7 10.7 0 0 1-1.65-5.74c0-5.94 4.85-10.77 10.8-10.77 5.95 0 10.79 4.83 10.79 10.77 0 5.94-4.85 10.71-10.85 10.71Zm5.92-8.02c-.32-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.16-.22.32-.84 1.06-1.03 1.27-.19.22-.38.24-.7.08-.32-.16-1.37-.5-2.6-1.6-.96-.85-1.61-1.9-1.8-2.22-.19-.32-.02-.5.14-.65.14-.14.32-.38.49-.57.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.87.4-.3.32-1.14 1.11-1.14 2.71 0 1.6 1.17 3.14 1.33 3.36.16.21 2.3 3.5 5.56 4.9.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.41.19-1.55-.08-.13-.3-.21-.62-.37Z"/></svg>
		</a>',
		esc_url( ezmajo_whatsapp_url() )
	);
} );

add_action( 'wp_head', function () {
	?>
<style id="ezmajo-css">
.ezmajo-wa{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:9990;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#128c7e;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.2);transition:transform .2s ease}
.ezmajo-wa:hover,.ezmajo-wa:focus-visible{transform:scale(1.08);color:#fff}
.ezmajo-wa:focus-visible{outline:3px solid #0b0620;outline-offset:3px}
@media print{.ezmajo-wa{display:none}}
.ezmajo-horario{list-style:none;margin:0;padding:0}
.ezmajo-horario li{margin:0 0 .25em}
.ezmajo-horario__dia{font-weight:600}
.ezmajo-horario__tramo{white-space:nowrap}
.ezmajo-contacto{margin-bottom:1.25rem;padding:0 16px;text-align:center;font-size:var(--wp--preset--font-size--small,.9rem);line-height:1.6}
.ezmajo-contacto p{margin:0 0 .35em}
.ezmajo-contacto a{color:inherit}
.ezmajo-contacto .ezmajo-horario li{display:inline-block;margin:0 .6em;white-space:nowrap}
/* Room below the last footer links so the floating button doesn't cover them */
@media (max-width:600px){.wp-site-blocks{padding-bottom:84px}}
.ezmajo-mapa{display:flex;align-items:center;justify-content:center;min-height:inherit;height:100%;background:#f3eee8}
.ezmajo-mapa iframe{width:100%;height:100%;min-height:inherit;border:0;display:block}
.ezmajo-mapa__aviso{max-width:340px;padding:24px;text-align:center;line-height:1.6}
.ezmajo-mapa__aviso p{margin:0 0 16px;color:#4d4556}
.ezmajo-mapa__cargar{display:block;margin:0 auto 12px;padding:12px 26px;border:0;border-radius:999px;background:#100820;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.ezmajo-mapa__cargar:focus-visible{outline:3px solid #f7b6ba;outline-offset:3px}
.ezmajo-mapa__aviso a{color:#100820}
</style>
	<?php
} );

/*
 * [ezmajo_mapa]: Google Maps embed that loads only after consent (GDPR/LSSI).
 * The iframe URL is not in the HTML; it is injected when the visitor clicks "Ver mapa"
 * or has accepted CookieYes' "functional" category (now or later).
 */
add_shortcode( 'ezmajo_mapa', function () {
	$b     = ezmajo_business();
	$query = sprintf( '%s, %s, %s %s', $b['name'], $b['street'], $b['postal_code'], $b['city'] );
	$embed = 'https://www.google.com/maps?q=' . rawurlencode( $query ) . '&output=embed';

	add_action( 'wp_footer', 'ezmajo_map_script', 20 );

	return sprintf(
		'<div class="ezmajo-mapa" data-src="%1$s" data-title="%2$s">
			<div class="ezmajo-mapa__aviso">
				<p>El mapa lo ofrece Google Maps, que usa cookies. Solo se carga si lo pides o si aceptas las cookies funcionales.</p>
				<button type="button" class="ezmajo-mapa__cargar">Ver mapa</button>
				<a href="%3$s" target="_blank" rel="noopener">Abrir en Google Maps</a>
			</div>
		</div>',
		esc_url( $embed ),
		esc_attr( 'Mapa: ' . $query ),
		esc_url( $b['maps_url'] )
	);
} );

function ezmajo_map_script() {
	?>
<script id="ezmajo-mapa-js">
(function () {
	function load(box) {
		if (box.dataset.loaded) return;
		box.dataset.loaded = '1';
		var f = document.createElement('iframe');
		f.src = box.dataset.src;
		f.title = box.dataset.title;
		f.loading = 'lazy';
		f.referrerPolicy = 'no-referrer-when-downgrade';
		f.allowFullscreen = true;
		box.replaceChildren(f);
	}
	function loadAll() { document.querySelectorAll('.ezmajo-mapa').forEach(load); }
	function functionalAccepted() {
		try { return !!(window.getCkyConsent && getCkyConsent().categories.functional); } catch (e) { return false; }
	}
	document.addEventListener('click', function (e) {
		var btn = e.target.closest('.ezmajo-mapa__cargar');
		if (btn) load(btn.closest('.ezmajo-mapa'));
	});
	document.addEventListener('cookieyes_consent_update', function (e) {
		if (e.detail && e.detail.accepted && e.detail.accepted.indexOf('functional') !== -1) loadAll();
	});
	document.addEventListener('cookieyes_banner_load', function () { if (functionalAccepted()) loadAll(); });
	if (functionalAccepted()) loadAll();
})();
</script>
	<?php
}

/*
 * External links open in a new tab (rel="noopener"), including links added later in the editor.
 * Links to ezmajo.com and its subdomains, tel:, mailto: and relative URLs are left alone.
 */
add_filter( 'render_block', function ( $html ) {
	if ( false === stripos( $html, '<a ' ) ) {
		return $html;
	}
	$site = wp_parse_url( home_url(), PHP_URL_HOST );
	$tags = new WP_HTML_Tag_Processor( $html );
	while ( $tags->next_tag( 'a' ) ) {
		$href = (string) $tags->get_attribute( 'href' );
		$host = preg_match( '#^https?://#i', $href ) ? strtolower( (string) wp_parse_url( $href, PHP_URL_HOST ) ) : '';
		if ( '' === $host || $host === $site || str_ends_with( $host, '.' . $site ) ) {
			continue;
		}
		$tags->set_attribute( 'target', '_blank' );
		$rel = trim( (string) $tags->get_attribute( 'rel' ) );
		if ( ! preg_match( '/\bnoopener\b/', $rel ) ) {
			$tags->set_attribute( 'rel', trim( $rel . ' noopener' ) );
		}
	}
	return $tags->get_updated_html();
} );

/*
 * Access levels.
 * - Owners (Ezequiel, Verónica): full administrators and the only accounts that can manage users.
 *   Nobody else can edit, demote or delete them.
 * - "agencia" role (Kit Digital maintenance, user kitdigital): everything an administrator can do,
 *   minus the capabilities below. Computed from the administrator role on every request, so plugins
 *   that add admin capabilities later (e.g. WooCommerce) are included automatically.
 * Note: the agency's SFTP access is outside WordPress; `ezgit status` on the server shows file changes.
 */
const EZMAJO_OWNERS         = array( 2, 3 ); // ezequiel, vero
const EZMAJO_AGENCY_DENIED = array(
	'create_users', 'edit_users', 'delete_users', 'promote_users', 'remove_users', 'list_users',
	'delete_plugins', 'delete_themes',
	'edit_plugins', 'edit_themes', 'edit_files',
);

function ezmajo_is_owner( $user_id ) {
	return in_array( (int) $user_id, EZMAJO_OWNERS, true );
}

// No plugin/theme code editor in the admin for anyone: code changes go through git.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}

add_action( 'init', function () {
	if ( ! get_role( 'agencia' ) ) {
		add_role( 'agencia', 'Agencia (mantenimiento)', array( 'read' => true ) );
	}
} );

add_filter( 'user_has_cap', function ( $allcaps, $caps, $args, $user ) {
	if ( in_array( 'agencia', (array) $user->roles, true ) ) {
		$admin   = get_role( 'administrator' );
		$allcaps = array_merge( $allcaps, $admin ? array_filter( $admin->capabilities ) : array() );
		foreach ( EZMAJO_AGENCY_DENIED as $cap ) {
			$allcaps[ $cap ] = false;
		}
	}
	return $allcaps;
}, 10, 4 );

// Only owners manage users, and owner accounts can only be changed by themselves.
add_filter( 'map_meta_cap', function ( $caps, $cap, $user_id, $args ) {
	if ( ezmajo_is_owner( $user_id ) ) {
		return $caps;
	}
	if ( in_array( $cap, array( 'create_users', 'edit_users', 'delete_users', 'promote_users', 'remove_users', 'list_users' ), true ) ) {
		$caps[] = 'do_not_allow';
	}
	$target = isset( $args[0] ) ? (int) $args[0] : 0;
	if ( in_array( $cap, array( 'edit_user', 'delete_user', 'remove_user', 'promote_user' ), true ) && $target && $target !== (int) $user_id && ezmajo_is_owner( $target ) ) {
		$caps[] = 'do_not_allow';
	}
	return $caps;
}, 10, 4 );

// Non-owners can never hand out the administrator or agencia roles.
add_filter( 'editable_roles', function ( $roles ) {
	if ( ! ezmajo_is_owner( get_current_user_id() ) ) {
		unset( $roles['administrator'], $roles['agencia'] );
	}
	return $roles;
} );
