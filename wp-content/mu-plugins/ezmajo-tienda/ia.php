<?php
/**
 * "Ayuda para escribir" box in the product editor: sends the name, a few notes and the product photos to Google
 * Gemini (free tier) and fills the description and the Prenda/Patrón fields with a suggestion to review before
 * publishing. Description is replaced (the current one is sent as input, with "Deshacer"); the other fields are only
 * filled when empty.
 *
 * The API key (aistudio.google.com → Get API key) lives only in the server's wp-config.php (never in git):
 *   define( 'EZMAJO_GEMINI_KEY', '…' );
 * Local staging reads it from ops/staging/.env (EZMAJO_GEMINI_KEY=…, gitignored). Without a key the box is hidden.
 * In the EEA the free tier gets the paid-tier data terms: prompts and photos are not used to train Google's models.
 */

defined( 'ABSPATH' ) || exit;

// Newest first: a model that is retired, or out of free quota for the day, falls through to the next one.
const EZMAJO_GEMINI_MODELS = array( 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite' );

function ezmajo_gemini_key() {
	$key = defined( 'EZMAJO_GEMINI_KEY' ) ? EZMAJO_GEMINI_KEY : getenv( 'EZMAJO_GEMINI_KEY' );
	return is_string( $key ) ? trim( $key ) : '';
}

/** Fields the assistant may fill, per kind of product: meta key => what to write there. */
function ezmajo_ia_fields( $kind ) {
	if ( 'prenda' === $kind ) {
		return array(
			'_ezmajo_composicion' => 'Composición de la tela (por ejemplo "100 % algodón"). Solo si las notas la dicen; si no, vacío.',
			'_ezmajo_cuidados'    => 'Cuidados de lavado y planchado, una indicación por línea. Solo si las notas los dicen o se deducen de la composición dada; si no, vacío.',
			'_ezmajo_guia_tallas' => 'Tabla de medidas con "|" entre columnas y una fila por línea, la primera es la cabecera: "Talla | Pecho | Largo" si tiene tallas, o "Pieza | Medidas" si es un set o pieza única. Solo con medidas de las notas; si no hay, vacío.',
		);
	}
	return array(
		'_ezmajo_materiales' => 'Telas recomendadas y avíos (botones, cremallera...), uno por línea. Solo si las notas los dicen; si no, vacío.',
		'_ezmajo_incluye'    => 'Qué incluye el patrón (piezas, instrucciones, márgenes de costura...), uno por línea. Solo si las notas lo dicen; si no, vacío.',
	);
}

add_action( 'add_meta_boxes_product', function () {
	if ( '' === ezmajo_gemini_key() ) {
		return;
	}
	add_meta_box( 'ezmajo-ia', 'Ayuda para escribir', function () {
		?>
		<p style="margin-top:0">Escribe unas notas (qué es, medidas, tela...) y pulsa el botón: se propone la descripción a partir de las notas y las fotos. Revísala antes de publicar.</p>
		<textarea id="ezmajo-ia-notas" rows="5" style="width:100%" placeholder="Ej.: toallón 75 x 75 cm, babita 20 x 28 cm, chupetero 20 cm"></textarea>
		<p><button type="button" class="button button-primary" id="ezmajo-ia-sugerir">✨ Sugerir textos</button></p>
		<p id="ezmajo-ia-estado" aria-live="polite" style="margin-bottom:0"></p>
		<?php
	}, 'product', 'side', 'high' );
} );

add_action( 'admin_footer-post.php', 'ezmajo_ia_script' );
add_action( 'admin_footer-post-new.php', 'ezmajo_ia_script' );
function ezmajo_ia_script() {
	if ( 'product' !== get_current_screen()->post_type || '' === ezmajo_gemini_key() ) {
		return;
	}
	$config = array(
		'ajax'   => admin_url( 'admin-ajax.php' ),
		'nonce'  => wp_create_nonce( 'ezmajo_ia' ),
		'fields' => array_keys( ezmajo_ia_fields( 'prenda' ) + ezmajo_ia_fields( 'patron' ) ),
	);
	?>
	<script>
	( function ( $, cfg ) {
		const estado = $( '#ezmajo-ia-estado' );
		const editor = () => window.tinymce && tinymce.get( 'content' ) && ! tinymce.get( 'content' ).isHidden() ? tinymce.get( 'content' ) : null;
		const getDesc = () => editor() ? editor().getContent() : $( '#content' ).val();
		const setDesc = html => editor() ? editor().setContent( html ) : $( '#content' ).val( html );
		let antes = null;

		$( '#ezmajo-ia-sugerir' ).on( 'click', function () {
			const boton = $( this ).prop( 'disabled', true );
			estado.text( 'Pensando… (unos segundos)' );
			const fotos = [ $( '#_thumbnail_id' ).val(), ...String( $( '#product_image_gallery' ).val() || '' ).split( ',' ) ]
				.filter( id => id && id !== '-1' ).slice( 0, 4 );
			$.post( cfg.ajax, {
				action: 'ezmajo_ia', _ajax_nonce: cfg.nonce, post_id: $( '#post_ID' ).val(),
				tipo: $( '#product-type' ).val() === 'variable' ? 'prenda' : 'patron',
				nombre: $( '#title' ).val(), notas: $( '#ezmajo-ia-notas' ).val(), descripcion: getDesc(), fotos,
			} ).done( r => {
				if ( ! r.success ) { estado.text( r.data || 'No se pudo generar.' ); return; }
				antes = { descripcion: getDesc(), titulo: $( '#title' ).val(), campos: {} };
				setDesc( r.data.descripcion );
				if ( ! $( '#title' ).val() && r.data.nombre ) { $( '#title' ).val( r.data.nombre ).trigger( 'input' ); $( '#title-prompt-text' ).addClass( 'screen-reader-text' ); }
				cfg.fields.forEach( k => {
					const campo = $( '#' + k );
					if ( campo.length && ! campo.val().trim() && r.data.campos[ k ] ) { antes.campos[ k ] = ''; campo.val( r.data.campos[ k ] ); }
				} );
				estado.html( 'Listo: revisa la descripción' + ( Object.keys( antes.campos ).length ? ' y la pestaña ' + ( $( '#product-type' ).val() === 'variable' ? 'Prenda' : 'Patrón' ) : '' ) + '. <a href="#" id="ezmajo-ia-deshacer">Deshacer</a>' );
			} ).fail( () => estado.text( 'No se pudo conectar. Inténtalo otra vez.' ) )
				.always( () => boton.prop( 'disabled', false ) );
		} );

		$( document ).on( 'click', '#ezmajo-ia-deshacer', e => {
			e.preventDefault();
			if ( ! antes ) return;
			setDesc( antes.descripcion );
			$( '#title' ).val( antes.titulo );
			Object.entries( antes.campos ).forEach( ( [ k, v ] ) => $( '#' + k ).val( v ) );
			antes = null;
			estado.text( 'Deshecho.' );
		} );
	} )( jQuery, <?php echo wp_json_encode( $config ); ?> );
	</script>
	<?php
}

add_action( 'wp_ajax_ezmajo_ia', function () {
	check_ajax_referer( 'ezmajo_ia' );
	$post_id = absint( $_POST['post_id'] ?? 0 );
	if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
		wp_send_json_error( 'Sin permiso.' );
	}
	$kind   = 'prenda' === ( $_POST['tipo'] ?? '' ) ? 'prenda' : 'patron';
	$name   = sanitize_text_field( wp_unslash( $_POST['nombre'] ?? '' ) );
	$notes  = sanitize_textarea_field( wp_unslash( $_POST['notas'] ?? '' ) );
	$desc   = trim( wp_strip_all_tags( wp_unslash( $_POST['descripcion'] ?? '' ) ) );
	$photos = array_slice( array_filter( array_map( 'absint', (array) ( $_POST['fotos'] ?? array() ) ) ), 0, 4 );
	if ( '' === $name . $notes . $desc && ! $photos ) {
		wp_send_json_error( 'Escribe el nombre o unas notas, o sube alguna foto.' );
	}

	$fields = ezmajo_ia_fields( $kind );
	$prompt = "Escribes las fichas de la tienda online de Ezmajo, un taller de arreglos y costura de Barcelona que vende patrones de costura en PDF y prendas cosidas en el taller.\n"
		. "Escribe en español de España, tuteando, con un tono cálido y sencillo, sin exageraciones, sin emojis y sin signos de exclamación seguidos.\n"
		. 'Producto: ' . ( 'prenda' === $kind ? 'una prenda o artículo cosido en el taller (se vende hecho).' : 'un patrón de costura en PDF para coser en casa.' ) . "\n"
		. 'Usa solo lo que se ve en las fotos o dicen las notas: no inventes medidas, materiales, composición, tallas ni precios.' . "\n\n"
		. "Devuelve:\n"
		. "- nombre: un nombre de producto corto y claro (máximo 60 caracteres).\n"
		. "- descripcion: 2 o 3 párrafos breves separados por una línea en blanco, texto plano sin títulos ni listas.\n";
	foreach ( $fields as $key => $what ) {
		$prompt .= "- $key: $what\n";
	}
	$prompt .= "\nNombre actual: " . ( $name ?: '(sin nombre)' ) . "\nNotas: " . ( $notes ?: '(ninguna)' ) . ( $desc ? "\nDescripción actual (mejórala): $desc" : '' );

	$parts = array( array( 'text' => $prompt ) );
	foreach ( $photos as $photo_id ) {
		$image = ezmajo_ia_image( $photo_id );
		if ( $image ) {
			$parts[] = array( 'inline_data' => array( 'mime_type' => 'image/jpeg', 'data' => $image ) );
		}
	}
	$properties = array( 'nombre' => array( 'type' => 'STRING' ), 'descripcion' => array( 'type' => 'STRING' ) );
	foreach ( $fields as $key => $what ) {
		$properties[ $key ] = array( 'type' => 'STRING' );
	}
	$body = array(
		'contents'         => array( array( 'role' => 'user', 'parts' => $parts ) ),
		'generationConfig' => array(
			'temperature'      => 0.7,
			'responseMimeType' => 'application/json',
			'responseSchema'   => array( 'type' => 'OBJECT', 'properties' => $properties, 'required' => array_keys( $properties ) ),
		),
	);

	$result = ezmajo_gemini( $body );
	if ( is_wp_error( $result ) ) {
		wp_send_json_error( $result->get_error_message() );
	}
	$campos = array();
	foreach ( $fields as $key => $what ) {
		$campos[ $key ] = sanitize_textarea_field( (string) ( $result[ $key ] ?? '' ) );
	}
	wp_send_json_success( array(
		'nombre'      => sanitize_text_field( (string) ( $result['nombre'] ?? '' ) ),
		'descripcion' => wpautop( esc_html( trim( (string) ( $result['descripcion'] ?? '' ) ) ) ),
		'campos'      => $campos,
	) );
} );

/** A product photo, scaled down (the API doesn't need 2000 px), as base64 JPEG. */
function ezmajo_ia_image( $attachment_id ) {
	$file = get_attached_file( $attachment_id );
	if ( ! $file || ! wp_attachment_is_image( $attachment_id ) ) {
		return '';
	}
	$editor = wp_get_image_editor( $file );
	if ( is_wp_error( $editor ) ) {
		return '';
	}
	$editor->resize( 1024, 1024 );
	$editor->set_quality( 80 );
	$saved = $editor->save( wp_tempnam( 'ezmajo-ia' ) . '.jpg', 'image/jpeg' );
	if ( is_wp_error( $saved ) ) {
		return '';
	}
	$data = base64_encode( (string) file_get_contents( $saved['path'] ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	wp_delete_file( $saved['path'] );
	return $data;
}

/** generateContent with the first model that answers; returns the decoded JSON object or a WP_Error to show. */
function ezmajo_gemini( $body ) {
	$error = new WP_Error( 'ezmajo_ia', 'No se pudo generar. Inténtalo en un rato.' );
	foreach ( EZMAJO_GEMINI_MODELS as $model ) {
		$response = wp_remote_post( "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent", array(
			'timeout' => 60,
			'headers' => array( 'Content-Type' => 'application/json', 'x-goog-api-key' => ezmajo_gemini_key() ),
			'body'    => wp_json_encode( $body ),
		) );
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'ezmajo_ia', 'No se pudo conectar con Gemini. Inténtalo otra vez.' );
		}
		$code = wp_remote_retrieve_response_code( $response );
		$json = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 === $code ) {
			$text = '';
			foreach ( $json['candidates'][0]['content']['parts'] ?? array() as $part ) {
				$text .= empty( $part['thought'] ) ? ( $part['text'] ?? '' ) : '';
			}
			$data = json_decode( $text, true );
			return is_array( $data ) ? $data : $error;
		}
		if ( 429 === $code ) {
			$error = new WP_Error( 'ezmajo_ia', 'Se ha usado el cupo gratuito de hoy. Inténtalo mañana.' );
		}
		if ( 401 === $code || ( 400 === $code && false !== stripos( (string) ( $json['error']['message'] ?? '' ), 'API key' ) ) ) {
			return new WP_Error( 'ezmajo_ia', 'La clave de Gemini no es válida. Avisa a Ezequiel.' );
		}
		if ( 403 === $code ) { // e.g. "Your project has been denied access": the Google project, not the key
			return new WP_Error( 'ezmajo_ia', 'Google no deja usar Gemini con esta cuenta ahora mismo. Avisa a Ezequiel.' );
		}
		// 404 (model retired), 429 (quota of this model), 5xx: try the next model.
	}
	return $error;
}
