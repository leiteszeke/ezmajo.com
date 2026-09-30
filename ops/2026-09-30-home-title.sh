#!/bin/sh
# Home page <title> (and og:title): "Ezmajo - Tienda de Arreglos" (was "Inicio - Ezmajo")
wpe post meta update 15 _yoast_wpseo_title 'Ezmajo - Tienda de Arreglos'
wpe option update blogdescription 'Tienda de Arreglos'
wpe --url=https://ezmajo.com yoast index --reindex --skip-confirmation
wpe --url=https://ezmajo.com cache-enabler clear
