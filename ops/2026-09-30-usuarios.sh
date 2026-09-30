#!/bin/sh
# Access levels (see "Access levels" in wp-content/mu-plugins/ezmajo.php).
# Owners created as administrators (passwords generated locally, kept outside the repo):
#   wpe user create ezequiel ezequiel@leites.dev --role=administrator   -> ID 2
#   wpe user create vero verofelicciotti@gmail.com --role=administrator -> ID 3
# Agency account: administrator -> agencia (no user management, no deleting plugins/themes, no code editor)
wpe user set-role kitdigital agencia
# Rollback: wpe user set-role kitdigital administrator
