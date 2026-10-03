#!/bin/sh
# WordPress admin email -> Ezmajo's own address (was the agency's: cayetanols70@gmail.com).
# Set with WP-CLI, so no confirmation email is sent to the old address.
wpe option update admin_email ezmajo.es@gmail.com
