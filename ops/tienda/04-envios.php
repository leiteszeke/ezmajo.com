<?php
/**
 * Garment shipping: zone "España península" (by postcode) and free pickup at the shop. Idempotent.
 * Run: wp --user=<admin> eval-file ops/tienda/04-envios.php            (production)
 *      wp --user=<admin> eval-file ops/tienda/04-envios.php staging    (also adds a flat test rate)
 *
 * Correos (official WooCommerce plugin, needs a contract) adds its own methods to the zone once installed:
 * WooCommerce -> Ajustes -> Envío -> España península -> Añadir método. Until then production only offers pickup.
 */

$staging = in_array( 'staging', $args ?? array(), true );

/*
 * Zone: mainland Spain. Excluded: 07 Baleares, 35/38 Canarias, 51 Ceuta, 52 Melilla.
 */
$zone = null;
foreach ( WC_Shipping_Zones::get_zones() as $data ) {
	if ( 'España península' === $data['zone_name'] ) {
		$zone = new WC_Shipping_Zone( $data['id'] );
	}
}
$zone = $zone ?: new WC_Shipping_Zone();
$zone->set_zone_name( 'España península' );
$zone->set_zone_order( 0 );
$zone->set_locations( array(
	array( 'code' => 'ES', 'type' => 'country' ),
	array( 'code' => '01000...06999', 'type' => 'postcode' ),
	array( 'code' => '08000...34999', 'type' => 'postcode' ),
	array( 'code' => '36000...37999', 'type' => 'postcode' ),
	array( 'code' => '39000...50999', 'type' => 'postcode' ),
) );
$zone->save();
WP_CLI::log( 'Zone: España península (' . $zone->get_id() . ')' );

if ( $staging ) {
	$has_flat = false;
	foreach ( $zone->get_shipping_methods() as $method ) {
		$has_flat = $has_flat || 'flat_rate' === $method->id;
	}
	if ( ! $has_flat ) {
		$instance = $zone->add_shipping_method( 'flat_rate' );
		update_option( "woocommerce_flat_rate_{$instance}_settings", array(
			'title'      => 'Envío a domicilio (tarifa de prueba)',
			'tax_status' => 'taxable',
			'cost'       => '4.95',
		) );
		WP_CLI::log( 'Staging: flat test rate added' );
	}
}

/*
 * Pickup at the shop (block checkout "Recoger"): available for any address, free.
 */
$business = ezmajo_business();
update_option( 'woocommerce_pickup_location_settings', array(
	'enabled'    => 'yes',
	'title'      => 'Recogida en tienda',
	'tax_status' => 'taxable',
	'cost'       => '',
) );
update_option( 'pickup_location_pickup_locations', array(
	array(
		'name'    => 'Ezmajo, Barcelona',
		'address' => array(
			'address_1' => $business['street'],
			'city'      => $business['city'],
			'state'     => 'B',
			'postcode'  => $business['postal_code'],
			'country'   => $business['country'],
		),
		'details' => 'Te avisamos por email cuando tu pedido esté listo. Horario: lunes a jueves 9:30–13:30 y 16:00–19:30, viernes 9:30–16:00.',
		'enabled' => true,
	),
) );
WP_CLI::log( 'Pickup: Recogida en tienda' );

WP_CLI::success( 'Shipping setup done' );
