#!/bin/sh
# Runs as root, fixes ownership for bind mounts, then drops to the app user.
set -e

APP_UID="${DOCKER_UID:-1000}"
APP_GID="${DOCKER_GID:-1000}"
APP_USER="${DOCKER_USER:-app}"

resolve_app_user() {
  if existing="$(getent passwd | awk -F: -v uid="${APP_UID}" '$3 == uid { print $1; exit }')"; then
    APP_USER="${existing}"
    APP_GID="$(id -g "${APP_USER}" 2>/dev/null || echo "${APP_GID}")"
    return 0
  fi
  if ! getent group "${APP_USER}" >/dev/null 2>&1; then
    addgroup -g "${APP_GID}" -S "${APP_USER}" 2>/dev/null \
      || addgroup -S "${APP_USER}"
  fi
  if ! getent passwd "${APP_USER}" >/dev/null 2>&1; then
    adduser -S -u "${APP_UID}" -G "${APP_USER}" -s /bin/sh -h /app "${APP_USER}" 2>/dev/null \
      || adduser -D -u "${APP_UID}" -G "${APP_USER}" -s /bin/sh -h /app "${APP_USER}"
  fi
}

ensure_writable_dirs() {
  mkdir -p /app/node_modules
  mkdir -p /app/uploads /app/logs 2>/dev/null || true
}

fix_ownership() {
  ensure_writable_dirs
  for dir in node_modules uploads logs dist build .cache; do
    if [ -d "/app/${dir}" ]; then
      chown -R "${APP_UID}:${APP_GID}" "/app/${dir}"
    fi
  done
  for file in package.json package-lock.json; do
    if [ -f "/app/${file}" ]; then
      chown "${APP_UID}:${APP_GID}" "/app/${file}"
    fi
  done
}

install_dependencies() {
  if [ ! -f /app/package.json ]; then
    return 0
  fi
  marker=/app/node_modules/.install-marker
  if [ -f /app/package-lock.json ]; then
    if [ ! -f "${marker}" ] \
      || [ /app/package-lock.json -nt "${marker}" ] \
      || [ /app/package.json -nt "${marker}" ]; then
      npm ci
      touch "${marker}"
    fi
  elif [ ! -f "${marker}" ] || [ /app/package.json -nt "${marker}" ]; then
    npm install
    touch "${marker}"
  fi
}

enable_llm_when_ollama_present() {
  # docker compose --profile llm starts ollama on the stack network; turn on LLM
  # unless the user explicitly set LLM_ENABLED=false.
  if [ "${LLM_ENABLED}" = "false" ]; then
    return 0
  fi
  if getent hosts ollama >/dev/null 2>&1; then
    export LLM_ENABLED=true
  fi
}

# Second stage: already running as the app user (via su-exec).
if [ "$1" = "__run__" ]; then
  shift
  cd /app
  enable_llm_when_ollama_present
  install_dependencies
  exec "$@"
fi

if [ "$(id -u)" != "0" ]; then
  cd /app
  enable_llm_when_ollama_present
  install_dependencies
  exec "$@"
fi

resolve_app_user
fix_ownership
exec su-exec "${APP_USER}" "$0" __run__ "$@"
