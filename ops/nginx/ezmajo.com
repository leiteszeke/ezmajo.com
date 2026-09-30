server {
    root /var/www/sftp/web;
    index index.php index.html;
    server_name ezmajo.com;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }
    # WooCommerce paid downloads: only served through PHP (?download_file=...), never directly.
    # nginx ignores the .htaccess WooCommerce puts in this folder.
    location ^~ /wp-content/uploads/woocommerce_uploads/ {
        deny all;
    }
    location = /favicon.ico { log_not_found off; access_log off; }
    # Let WordPress/Yoast generate robots.txt when no static file exists
    location = /robots.txt  { try_files $uri /index.php?$args; log_not_found off; access_log off; }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/ezmajo.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/ezmajo.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = ezmajo.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    server_name ezmajo.com;
    listen 80;
    return 404; # managed by Certbot
}
# www -> apex
server {
    server_name www.ezmajo.com;
    return 301 https://ezmajo.com$request_uri;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ezmajo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ezmajo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    server_name www.ezmajo.com;
    listen 80;
    return 301 https://ezmajo.com$request_uri;
}
