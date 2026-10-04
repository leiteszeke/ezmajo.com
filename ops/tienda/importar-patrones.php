<?php
/**
 * Create or update pattern products from plantilla-patrones.csv (one row per pattern; "codigo" is the key).
 *
 * Usage (on the server or staging, as admin):
 *   wp --user=<admin> eval-file ops/tienda/importar-patrones.php <patrones.csv> <carpeta-con-fotos-y-pdf> [validar]
 *
 * - Photos (fotos): file names in the folder, comma-separated; the first one is the main photo.
 * - PDFs (pdf): file names in the folder; copied to the protected downloads folder (never public).
 *   A file ending in -a0.pdf is labelled "PDF A0", anything else "PDF A4".
 * - Re-running updates existing patterns; photos/PDFs already imported are not duplicated.
 */

list( $csv, $dir ) = array_pad( $args, 2, '' );
$dry = in_array( 'validar', $args, true ); // check only, change nothing
if ( ! is_readable( $csv ) || ! is_dir( $dir ) ) {
	WP_CLI::error( 'Usage: importar-patrones.php <patrones.csv> <carpeta> [validar]' );
}
$dir = rtrim( $dir, '/' );

require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

function ez_list( $value ) {
	return array_values( array_filter( array_map( 'trim', explode( ',', (string) $value ) ), 'strlen' ) );
}

function ez_term_ids( $taxonomy, $names, &$errors ) {
	$ids = array();
	foreach ( $names as $name ) {
		$term = get_term_by( 'name', $name, $taxonomy ) ?: get_term_by( 'slug', sanitize_title( $name ), $taxonomy );
		if ( $term ) {
			$ids[] = $term->term_id;
		} else {
			$errors[] = "\"$name\" no existe en $taxonomy";
		}
	}
	return $ids;
}

function ez_attribute( $taxonomy, $ids ) {
	$a = new WC_Product_Attribute();
	$a->set_id( wc_attribute_taxonomy_id_by_name( $taxonomy ) );
	$a->set_name( $taxonomy );
	$a->set_options( $ids );
	$a->set_visible( true );
	return $a;
}

/** Import an image once (tracked by source file name + size). */
function ez_image( $path ) {
	$key      = basename( $path ) . ':' . filesize( $path );
	$existing = get_posts( array( 'post_type' => 'attachment', 'meta_key' => '_ezmajo_source', 'meta_value' => $key, 'fields' => 'ids', 'numberposts' => 1 ) );
	if ( $existing ) {
		return $existing[0];
	}
	$tmp = wp_tempnam( basename( $path ) );
	copy( $path, $tmp );
	$id = media_handle_sideload( array( 'name' => basename( $path ), 'tmp_name' => $tmp ), 0 );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( basename( $path ) . ': ' . $id->get_error_message() );
	}
	update_post_meta( $id, '_ezmajo_source', $key );
	return $id;
}

$handle = fopen( $csv, 'r' );
$header = array_map( fn( $h ) => trim( preg_replace( '/^\xEF\xBB\xBF/', '', $h ) ), fgetcsv( $handle ) );
$line   = 1;
$done   = 0;
$failed = 0;

while ( ( $cells = fgetcsv( $handle ) ) !== false ) {
	$line++;
	if ( ! array_filter( $cells ) ) {
		continue;
	}
	$row    = array_combine( $header, array_pad( $cells, count( $header ), '' ) );
	$row    = array_map( 'trim', $row );
	$errors = array();

	foreach ( array( 'codigo', 'nombre', 'tipo', 'precio', 'pdf' ) as $required ) {
		if ( '' === $row[ $required ] ) {
			$errors[] = "falta \"$required\"";
		}
	}
	$price = str_replace( ',', '.', str_replace( '.', '', $row['precio'] ) );
	if ( '' !== $row['precio'] && ! is_numeric( $price ) ) {
		$errors[] = "precio no válido: {$row['precio']}";
	}
	$dificultad = ez_term_ids( 'pa_dificultad', ez_list( $row['dificultad'] ), $errors );
	$tallas     = ez_term_ids( 'pa_talla', ez_list( $row['tallas'] ), $errors );
	$formatos   = ez_term_ids( 'pa_formato', ez_list( $row['formatos'] ?: 'A4' ), $errors );
	$fotos      = ez_list( $row['fotos'] );
	$pdfs       = ez_list( $row['pdf'] );
	foreach ( array_merge( $fotos, $pdfs ) as $file ) {
		if ( ! is_readable( "$dir/$file" ) ) {
			$errors[] = "no encuentro el archivo $file";
		}
	}

	$label = "Fila $line ({$row['codigo']} {$row['nombre']})";
	if ( $errors ) {
		WP_CLI::warning( "$label: " . implode( '; ', $errors ) );
		$failed++;
		continue;
	}
	if ( $dry ) {
		WP_CLI::log( "$label: OK" );
		$done++;
		continue;
	}

	$id      = wc_get_product_id_by_sku( $row['codigo'] );
	$product = $id ? wc_get_product( $id ) : new WC_Product_Simple();
	$product->set_sku( $row['codigo'] );
	$product->set_name( $row['nombre'] );
	$product->set_status( in_array( strtolower( $row['publicado'] ), array( 'si', 'sí', 'yes', '1' ), true ) ? 'publish' : 'draft' );
	$product->set_regular_price( $price );
	$product->set_virtual( true );
	$product->set_downloadable( true );
	$product->set_sold_individually( true );
	$product->set_download_limit( 5 );
	$product->set_download_expiry( 30 );
	$product->set_short_description( $row['resumen'] );
	$product->set_description( $row['descripcion'] );

	// "tipo" is a subcategory of Patrones (Blusas, Jerséis...); created there if new
	$patrones = (int) get_term_by( 'slug', 'patrones', 'product_cat' )->term_id;
	$cat      = term_exists( $row['tipo'], 'product_cat', $patrones ) ?: wp_insert_term( $row['tipo'], 'product_cat', array( 'parent' => $patrones ) );
	$product->set_category_ids( array( (int) $cat['term_id'] ) );
	$product->set_attributes( array(
		ez_attribute( 'pa_dificultad', $dificultad ),
		ez_attribute( 'pa_talla', $tallas ),
		ez_attribute( 'pa_formato', $formatos ),
	) );

	$product->update_meta_data( '_ezmajo_hojas_a4', (int) $row['hojas_a4'] ?: '' );
	$product->update_meta_data( '_ezmajo_hojas_a0', (int) $row['hojas_a0'] ?: '' );
	foreach ( array( 'materiales', 'metraje', 'medidas', 'incluye' ) as $field ) {
		$product->update_meta_data( "_ezmajo_$field", $row[ $field ] );
	}

	if ( $fotos ) {
		$images = array_map( fn( $f ) => ez_image( "$dir/$f" ), $fotos );
		$product->set_image_id( array_shift( $images ) );
		$product->set_gallery_image_ids( $images );
	}

	// PDFs -> protected folder, one download per file
	$target = wp_upload_dir()['basedir'] . '/woocommerce_uploads/patrones/' . sanitize_file_name( $row['codigo'] );
	wp_mkdir_p( $target );
	$downloads = array();
	foreach ( $pdfs as $file ) {
		copy( "$dir/$file", "$target/$file" );
		$download = new WC_Product_Download();
		$download->set_id( md5( $row['codigo'] . $file ) ); // stable: re-imports keep customers' download links valid
		$download->set_name( preg_match( '/-a0\.pdf$/i', $file ) ? 'Patrón PDF A0' : 'Patrón PDF A4' );
		$download->set_file( content_url( 'uploads/woocommerce_uploads/patrones/' . sanitize_file_name( $row['codigo'] ) . "/$file" ) );
		$downloads[] = $download;
	}
	$product->set_downloads( $downloads );

	$product->save();
	WP_CLI::log( sprintf( '%s: %s #%d (%s)', $label, $id ? 'actualizado' : 'creado', $product->get_id(), $product->get_status() ) );
	$done++;
}
fclose( $handle );

$summary = sprintf( '%d patrones %s, %d con errores', $done, $dry ? 'validados' : 'importados', $failed );
$failed ? WP_CLI::warning( $summary ) : WP_CLI::success( $summary );
