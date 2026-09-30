# Legacy hostname used while the site was being built: redirect everything to ezmajo.com
server {
    server_name web.ezmajo.com;
    return 301 https://ezmajo.com$request_uri;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/web.ezmajo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/web.ezmajo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    server_name web.ezmajo.com;
    listen 80;
    return 301 https://ezmajo.com$request_uri;
}
