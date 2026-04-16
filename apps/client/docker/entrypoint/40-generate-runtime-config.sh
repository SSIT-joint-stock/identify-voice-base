#!/bin/sh
set -eu

envsubst '${CLIENT_API_BASE_URL}' \
  < /usr/share/nginx/html/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js

