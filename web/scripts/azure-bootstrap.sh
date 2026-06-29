#!/usr/bin/env bash
# IOX Azure VM bootstrap.
# Idempotent: re-runnable. Stops & cleans up partial state before re-running.
#
# Required env (passed by the caller — usually `scp .env-bootstrap` + source it):
#   ANTHROPIC_API_KEY  Real Anthropic key for the AI extraction agent.
#   AUTH_SECRET        16+ chars. Generate: openssl rand -base64 32
#
# Optional env (defaults shown):
#   GIT_URL=https://github.com/tajalagawani/BOQs-master.git
#   GIT_BRANCH=main
#   APP_DIR=/home/iox/app
#   PG_DB=iox
#   PG_USER=iox
#   PG_PASS=iox_dev_$(hostname)
#   NODE_MAJOR=24
#   PUBLIC_PORT=80          # nginx fronts Next on 3000
set -euo pipefail

# --- Config ----------------------------------------------------------------
GIT_URL="${GIT_URL:-https://github.com/tajalagawani/BOQs-master.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
APP_DIR="${APP_DIR:-/home/iox/app}"
PG_DB="${PG_DB:-iox}"
PG_USER="${PG_USER:-iox}"
PG_PASS="${PG_PASS:-iox_dev_$(hostname)}"
NODE_MAJOR="${NODE_MAJOR:-24}"
PUBLIC_PORT="${PUBLIC_PORT:-80}"

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required (16+ chars)}"

log() { printf '\n\033[1;36m[%s] %s\033[0m\n' "$(date +%H:%M:%S)" "$*"; }

# --- 1. System packages ----------------------------------------------------
log "1/12 apt update + install base packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -yqq \
  build-essential git curl ca-certificates unzip \
  postgresql postgresql-contrib \
  nginx

# --- 2. Node.js via NodeSource --------------------------------------------
log "2/12 install Node ${NODE_MAJOR}"
if ! command -v node >/dev/null || [[ "$(node --version)" != v${NODE_MAJOR}* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -yqq nodejs
fi
node --version
npm --version

# --- 3. Global npm tools ---------------------------------------------------
log "3/12 install pm2 + tsx globally"
sudo npm install -g pm2 tsx >/dev/null
pm2 --version

# --- 4. Clone / update repo ------------------------------------------------
log "4/12 clone repo into ${APP_DIR}"
sudo mkdir -p "$(dirname "$APP_DIR")"
sudo chown "$USER:$USER" "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$GIT_BRANCH" "$GIT_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git fetch origin && git checkout "$GIT_BRANCH" && git pull --ff-only
fi
cd "$APP_DIR/web"

# --- 5. Postgres role + DB -------------------------------------------------
log "5/12 set up Postgres role $PG_USER + database $PG_DB"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE $PG_USER WITH LOGIN PASSWORD '$PG_PASS'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1 \
  || sudo -u postgres createdb -O "$PG_USER" "$PG_DB"
sudo -u postgres psql -c "ALTER ROLE $PG_USER WITH SUPERUSER" >/dev/null   # dev: full privs

# --- 6. Render .env --------------------------------------------------------
log "6/12 render web/.env"
cat > .env <<EOF
DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}?schema=public"
DATABASE_URL_UNPOOLED="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}"

AUTH_SECRET="${AUTH_SECRET}"

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
AI_DEFAULT_MODEL="claude-sonnet-4-6"
AI_CHUNKED_MODEL="claude-haiku-4-5"
AI_CHUNKED_MAX_UNITS=30
EOF
chmod 600 .env

# --- 7. Install JS deps ----------------------------------------------------
log "7/12 npm ci"
npm ci --no-audit --no-fund

# --- 8. Apply schemas ------------------------------------------------------
# This repo's schema is managed by `prisma db push` + Drizzle + manual SQL, NOT
# `prisma migrate`. `migrate deploy` fails with P3015 because the
# prisma/migrations/manual/ folder is read as a migration that has no top-level
# migration.sql. Use db push (same path the local/dev bootstrap uses).
log "8/12 push Prisma schema (db push)"
npx prisma db push --accept-data-loss
npx prisma generate

log "8b/12 apply Drizzle migrations"
PSQL_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}"
for sql in drizzle/migrations/*.sql; do
  echo "  → $(basename "$sql")"
  psql "$PSQL_URL" -v ON_ERROR_STOP=0 -q -f "$sql" 2>&1 | grep -vE "^(CREATE|ALTER|INSERT|SELECT|GRANT|psql:)" | head -3 || true
done

# --- 9. Seeds --------------------------------------------------------------
log "9/12 run seeds"
npm run db:seed
npx tsx scripts/seed-procurex.ts || true   # OK if already seeded

# --- 10. Production build --------------------------------------------------
log "10/12 npm run build"
NODE_OPTIONS="--max-old-space-size=6144" npm run build

# --- 11. Start under pm2 ---------------------------------------------------
log "11/12 start under pm2"
cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    { name: "iox-web",    cwd: __dirname, script: "npm", args: "start", env: { PORT: 3000, NODE_ENV: "production" } },
    { name: "iox-worker", cwd: __dirname, script: "tsx", args: "scripts/dev-worker.ts" },
  ],
};
EOF
pm2 startOrReload ecosystem.config.cjs
pm2 save
# Auto-restart on reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER | tail -2 | sh || true

# --- 12. Nginx reverse proxy ----------------------------------------------
log "12/12 nginx reverse proxy → :3000"
sudo tee /etc/nginx/sites-available/iox >/dev/null <<EOF
server {
  listen ${PUBLIC_PORT} default_server;
  listen [::]:${PUBLIC_PORT} default_server;
  server_name _;
  client_max_body_size 1024M;   # large tender PDFs
  proxy_read_timeout 900s;       # AI extraction is slow on chunked path

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
EOF
sudo ln -sf /etc/nginx/sites-available/iox /etc/nginx/sites-enabled/iox
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# --- Done ------------------------------------------------------------------
log "DONE"
pm2 status
echo ""
echo "App is up at: http://$(curl -s ifconfig.me)/"
echo "Sign-in (ProcureX): http://$(curl -s ifconfig.me)/procurex/sign-in"
echo "  email:    arjun.mehta@iox.local"
echo "  password: dev"
