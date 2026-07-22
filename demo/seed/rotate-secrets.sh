#!/bin/sh
# Regenerate every secret Ghost keeps inside its database.
#
# The demo databases in this repository are public, so the values they ship with
# are throwaway placeholders. This script runs on first boot of each site and
# replaces them, so a deployment never uses a secret that anyone can read on
# GitHub. Ghost does not regenerate these itself — blanking them stops it from
# booting — so they have to be generated here.
#
# Requires: sqlite, openssl.
set -eu
DB="$1"

rnd() { head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | cut -c1-"$1"; }
q() { sqlite3 "$DB" "$1"; }

# Session / auth secrets and site hashes
q "UPDATE settings SET value='$(rnd 40)' WHERE key='admin_session_secret';"
q "UPDATE settings SET value='$(rnd 40)' WHERE key='theme_session_secret';"
q "UPDATE settings SET value='$(rnd 42)' WHERE key='members_email_auth_secret';"
q "UPDATE settings SET value='$(rnd 42)' WHERE key='members_otc_secret';"
q "UPDATE settings SET value='$(rnd 30)' WHERE key='public_hash';"
q "UPDATE settings SET value='$(rnd 32)' WHERE key='indexnow_api_key';"
q "UPDATE settings SET value='$(cat /proc/sys/kernel/random/uuid)' WHERE key='db_hash';"

# RSA keypairs that sign Ghost's own and members' JWTs (PKCS#1, as Ghost expects)
for pair in ghost members; do
  openssl genrsa -traditional 1024 >"/tmp/$pair.pem" 2>/dev/null
  openssl rsa -in "/tmp/$pair.pem" -RSAPublicKey_out >"/tmp/$pair.pub" 2>/dev/null
  q "UPDATE settings SET value='$(cat "/tmp/$pair.pem")' WHERE key='${pair}_private_key';"
  q "UPDATE settings SET value='$(cat "/tmp/$pair.pub")' WHERE key='${pair}_public_key';"
  rm -f "/tmp/$pair.pem" "/tmp/$pair.pub"
done

# Admin API keys of Ghost's internal integrations
sqlite3 "$DB" "SELECT id||'|'||length(secret) FROM api_keys;" | while IFS='|' read -r id len; do
  [ -z "$id" ] && continue
  q "UPDATE api_keys SET secret='$(rnd "$len")' WHERE id='$id';"
done

echo "secrets rotated"
