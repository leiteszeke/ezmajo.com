<?php
/**
 * Mi cuenta → Inicio (replaces WooCommerce's myaccount/dashboard.php, see cuenta.php): greeting, the patterns ready
 * to download, the last order and how to get help.
 *
 * @var WP_User $current_user
 */

defined( 'ABSPATH' ) || exit;

$ezmajo_downloads = wc_get_customer_available_downloads( get_current_user_id() );
$ezmajo_orders    = wc_get_orders( array( 'customer_id' => get_current_user_id(), 'limit' => 1 ) );
$ezmajo_last      = $ezmajo_orders ? $ezmajo_orders[0] : null;
$ezmajo_name      = $current_user->first_name ?: $current_user->display_name;
$ezmajo_business  = ezmajo_business();
?>
<div class="ezmajo-cuenta">
	<p class="ezmajo-cuenta__hola">Hola, <strong><?php echo esc_html( $ezmajo_name ); ?></strong></p>

	<section class="ezmajo-cuenta__bloque">
		<h2>Mis patrones</h2>
		<?php if ( $ezmajo_downloads ) : ?>
			<ul class="ezmajo-cuenta__lista">
				<?php foreach ( array_slice( $ezmajo_downloads, 0, 4 ) as $ezmajo_download ) : ?>
					<li>
						<span><?php echo esc_html( $ezmajo_download['product_name'] ); ?> <small><?php echo esc_html( $ezmajo_download['download_name'] ); ?></small></span>
						<a class="ezmajo-boton" href="<?php echo esc_url( $ezmajo_download['download_url'] ); ?>">Descargar</a>
					</li>
				<?php endforeach; ?>
			</ul>
			<?php if ( count( $ezmajo_downloads ) > 4 ) : ?>
				<p><a href="<?php echo esc_url( wc_get_account_endpoint_url( 'downloads' ) ); ?>">Ver todos tus patrones</a></p>
			<?php endif; ?>
		<?php else : ?>
			<p>Todavía no tienes patrones para descargar. <a href="<?php echo esc_url( get_term_link( 'patrones', 'product_cat' ) ); ?>">Ver patrones</a></p>
		<?php endif; ?>
	</section>

	<?php if ( $ezmajo_last ) : ?>
		<section class="ezmajo-cuenta__bloque">
			<h2>Tu último pedido</h2>
			<p>
				Pedido <a href="<?php echo esc_url( $ezmajo_last->get_view_order_url() ); ?>">#<?php echo esc_html( $ezmajo_last->get_order_number() ); ?></a>
				del <?php echo esc_html( wc_format_datetime( $ezmajo_last->get_date_created() ) ); ?>:
				<strong><?php echo esc_html( wc_get_order_status_name( $ezmajo_last->get_status() ) ); ?></strong>
				· <?php echo wp_kses_post( $ezmajo_last->get_formatted_order_total() ); ?>
			</p>
			<p><a href="<?php echo esc_url( wc_get_account_endpoint_url( 'orders' ) ); ?>">Ver todos tus pedidos</a></p>
		</section>
	<?php endif; ?>

	<section class="ezmajo-cuenta__bloque ezmajo-cuenta__ayuda">
		<h2>¿Necesitas ayuda?</h2>
		<p>
			Escríbenos por <a href="<?php echo esc_url( 'https://wa.me/' . $ezmajo_business['whatsapp'] ); ?>">WhatsApp (<?php echo esc_html( $ezmajo_business['phone_display'] ); ?>)</a>
			o a <a href="mailto:contacto@ezmajo.com">contacto@ezmajo.com</a>.
		</p>
	</section>
</div>
