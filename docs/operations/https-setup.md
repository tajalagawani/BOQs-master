# HTTPS setup (when a domain is ready)

> Procedure to enable TLS on the IOX VM. Closes **C1-SC4** ("encryption in
> transit for in-scope services") once executed.

## Prereqs

- A registered domain (e.g. `iox.example.com`)
- DNS A record `iox.example.com → 20.203.125.83`
- Wait ≤ 5 min for DNS to propagate; verify with `dig iox.example.com +short`

## Steps (≈10 minutes total)

```bash
# 1. SSH to the VM
ssh -i ~/.ssh/iox_vm iox@20.203.125.83

# 2. Install certbot (one-off)
sudo apt-get install -y certbot python3-certbot-nginx

# 3. Replace the nginx config with the HTTPS template
DOMAIN="iox.example.com"
sed "s/iox\.example\.com/$DOMAIN/g" /home/iox/app/infra/nginx/iox-https.conf \
  | sudo tee /etc/nginx/sites-available/iox > /dev/null
sudo nginx -t && sudo systemctl reload nginx

# 4. Issue + install the cert
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m taj.alagawani@gmail.com

# 5. Verify
curl -sI https://$DOMAIN | head -1     # → HTTP/2 200
curl -sI http://$DOMAIN | head -1      # → HTTP/1.1 301 Moved Permanently → https://

# 6. Confirm the auto-renew timer is enabled
sudo systemctl status certbot.timer
```

## Cert auto-renewal

certbot installs a `certbot.timer` systemd unit that runs twice daily and
renews any cert with ≤30 days to expiry. No manual action needed.

## Update the OpenAPI server entry

After HTTPS is live, edit `docs/api/openapi.yaml`:

```yaml
servers:
  - url: https://iox.example.com
    description: Production
```

## Roll back if something breaks

```bash
# Restore the HTTP-only config
sudo cp /etc/nginx/sites-available/iox.backup-pre-tls /etc/nginx/sites-available/iox
sudo systemctl reload nginx
```

(`certbot --nginx` creates that backup automatically.)
