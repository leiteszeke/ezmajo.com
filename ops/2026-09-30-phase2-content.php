<?php
/**
 * Phase 2 content changes: footer contact block, hours + WhatsApp on Contacto,
 * meta descriptions and image alt texts.
 *
 * Run on the server: wpe --url=https://ezmajo.com eval-file ops/2026-09-30-phase2-content.php
 * Idempotent: each change checks whether it is already applied.
 */

const EZ_FOOTER   = 50;
const EZ_HOME     = 15;
const EZ_SERVICES = 31;
const EZ_CONTACT  = 44;

function ez_update_content( $id, $content, $what ) {
	$old = get_post_field( 'post_content', $id );
	if ( $old === $content ) {
		WP_CLI::log( "#$id $what: no change" );
		return;
	}
	wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $content ) ) );
	WP_CLI::log( "#$id $what: updated" );
}

/*
 * Footer: address, phone, WhatsApp and hours above the legal links.
 */
$footer = get_post_field( 'post_content', EZ_FOOTER );
if ( false === strpos( $footer, '[ezmajo_contacto]' ) ) {
	$anchor = '<!-- wp:group {"layout":{"type":"constrained"}} -->';
	$pos    = strpos( $footer, $anchor );
	if ( false === $pos ) {
		WP_CLI::error( 'Footer anchor not found' );
	}
	$footer = substr_replace( $footer, "<!-- wp:shortcode -->\n[ezmajo_contacto]\n<!-- /wp:shortcode -->\n\n", $pos, 0 );
}
ez_update_content( EZ_FOOTER, $footer, 'footer' );

/*
 * Contacto: WhatsApp next to the phone, opening hours card, WhatsApp button, directions to the Maps listing.
 */
$wa      = 'https://wa.me/34604930764?text=' . rawurlencode( 'Hola, quería consultar por un arreglo.' );
$contact = get_post_field( 'post_content', EZ_CONTACT );

if ( false === strpos( $contact, '[ezmajo_horario]' ) ) {
	$replacements = array(
		// Intro
		'puedes llamarnos o venir directamente a nuestra tienda.' =>
			'puedes llamarnos, escribirnos por WhatsApp o venir directamente a nuestra tienda.',

		// Phone card -> phone + WhatsApp, followed by the hours card
		'<h3>Teléfono</h3>
            <a href="tel:+34604930764">+34 604 930 764</a>
          </div>
        </div>' =>
			'<h3>Teléfono y WhatsApp</h3>
            <a href="tel:+34604930764">+34 604 930 764</a><br>
            <a href="' . esc_url( $wa ) . '" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
          </div>
        </div>

        <div class="ez-contact-card">
          <div class="ez-contact-icon">🕘</div>
          <div>
            <h3>Horario</h3>
            [ezmajo_horario]
          </div>
        </div>',

		// WhatsApp button between "Llamar ahora" and "Cómo llegar"
		'Llamar ahora
          </a>' =>
			'Llamar ahora
          </a>

          <a class="ez-contact-btn ez-contact-btn-whatsapp" href="' . esc_url( $wa ) . '" target="_blank" rel="noopener">
            WhatsApp
          </a>',

		// "Cómo llegar" opens the Google Business listing (reviews, hours, photos) instead of a plain address search
		'https://www.google.com/maps/search/?api=1&query=Carrer%20del%20Rossell%C3%B3%2064%2C%20Eixample%2C%2008029%20Barcelona' =>
			'https://maps.google.com/?cid=16293754735231472786',

		// Styles for the new elements (page keeps its own <style> block)
		'  @media (max-width: 950px) {' =>
			'  .ez-contact-btn-whatsapp {
    background: #128c7e;
    color: var(--ez-white);
  }

  .ez-contact-card .ezmajo-horario {
    color: var(--ez-muted);
    font-size: 17px;
    line-height: 1.6;
  }

  @media (max-width: 950px) {',
	);

	foreach ( $replacements as $from => $to ) {
		if ( 1 !== substr_count( $contact, $from ) ) {
			WP_CLI::error( 'Contacto: anchor not found exactly once: ' . substr( $from, 0, 60 ) );
		}
		$contact = str_replace( $from, $to, $contact );
	}
}
ez_update_content( EZ_CONTACT, $contact, 'contacto' );

/*
 * Meta descriptions (Yoast)
 */
$descriptions = array(
	EZ_HOME     => 'Arreglos de ropa y costura en el Eixample, Barcelona: bajos, ajustes, transformaciones y bordados. Carrer del Rosselló, 64. Consulta por WhatsApp.',
	EZ_SERVICES => 'Bajos, costuras, entallados, ajustes de cintura y mangas, transformaciones y personalización de prendas en nuestra tienda del Eixample, Barcelona.',
	EZ_CONTACT  => 'Carrer del Rosselló, 64 (Eixample, Barcelona). Lunes a jueves 9:30–13:30 y 16:00–19:30, viernes 9:30–16:00. Teléfono y WhatsApp: 604 93 07 64.',
);
foreach ( $descriptions as $id => $desc ) {
	update_post_meta( $id, '_yoast_wpseo_metadesc', $desc );
	WP_CLI::log( sprintf( '#%d meta description (%d chars)', $id, mb_strlen( $desc ) ) );
}

/*
 * Image alt texts: attachment meta + every <img class="wp-image-ID"> in content.
 */
$alts = array(
	16 => 'Jersey marrón transformado con parches de tela estampada',
	19 => 'Jersey marrón transformado con parches de tela estampada',
	17 => 'Rebeca blanca con detalles de flores bordadas',
	18 => 'Blusa verde de manga japonesa con estampado de hojas',
	20 => 'Chaqueta de punto gris y blanca con botones',
	21 => 'Estola de pelo sintético marrón',
	22 => 'Jersey negro con flores bordadas en las mangas',
	49 => 'Programa Kit Digital financiado por los fondos Next Generation EU de la Unión Europea',
);
foreach ( $alts as $id => $alt ) {
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
}

$ids = get_posts( array(
	'post_type'   => array( 'page', 'post', 'wp_template', 'wp_template_part' ),
	'post_status' => 'publish',
	'numberposts' => -1,
	'fields'      => 'ids',
) );
foreach ( $ids as $id ) {
	$content = get_post_field( 'post_content', $id );
	$new     = preg_replace_callback(
		'/<img\b[^>]*>/',
		function ( $m ) use ( $alts ) {
			if ( ! preg_match( '/\bwp-image-(\d+)\b/', $m[0], $c ) || ! isset( $alts[ (int) $c[1] ] ) ) {
				return $m[0];
			}
			$alt = 'alt="' . esc_attr( $alts[ (int) $c[1] ] ) . '"';
			return preg_match( '/\balt="[^"]*"/', $m[0] )
				? preg_replace( '/\balt="[^"]*"/', $alt, $m[0] )
				: str_replace( '<img ', '<img ' . $alt . ' ', $m[0] );
		},
		$content
	);
	if ( $new !== $content ) {
		ez_update_content( $id, $new, 'alt texts' );
	}
}

// Logo alt ("ezmajo_logo" -> "Ezmajo"); applied separately with:
// wpe post meta update 48 _wp_attachment_image_alt "Ezmajo" (and 47)
