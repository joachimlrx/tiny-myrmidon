#!/usr/bin/env bash
set -euo pipefail

CLOUDFLARED_VERSION="2026.11.1"

ensure_cloudflared() {
  if command -v cloudflared &>/dev/null; then
    return 0
  fi

  if [ -x "$HOME/.local/bin/cloudflared" ]; then
    export PATH="$HOME/.local/bin:$PATH"
    return 0
  fi

  local asset_name
  local expected_sha256

  case "$(uname -m)" in
    x86_64|amd64)
      asset_name="cloudflared-linux-amd64"
      expected_sha256="97bb3b02d23a5980fc9c15a1a270e692da1923f103f920d5b16d4931d5ab55e7"
      ;;
    aarch64|arm64)
      asset_name="cloudflared-linux-arm64"
      expected_sha256="b155cec3e48e489cfb8e5c602769fb8c771083018d8881d68b4d18a791567c5a"
      ;;
    *)
      echo "Error: Unsupported cloudflared architecture: $(uname -m)" >&2
      return 1
      ;;
  esac

  local install_dir="$HOME/.local/bin"
  local download_path="$install_dir/$asset_name.tmp"
  local install_path="$install_dir/cloudflared"
  local download_url="https://github.com/cloudflare/cloudflared/releases/download/$CLOUDFLARED_VERSION/$asset_name"

  echo "==> Downloading cloudflared $CLOUDFLARED_VERSION..."
  mkdir -p "$install_dir"
  curl --fail --location --silent --show-error --retry 3 "$download_url" -o "$download_path"

  if ! printf '%s  %s\n' "$expected_sha256" "$download_path" | sha256sum --check --status; then
    rm -f "$download_path"
    echo "Error: cloudflared SHA-256 verification failed." >&2
    return 1
  fi

  chmod 0755 "$download_path"
  mv "$download_path" "$install_path"
  export PATH="$install_dir:$PATH"
}

main() {
  ensure_cloudflared

  LOG_FILE=$(mktemp /tmp/cloudflared-tunnel.XXXXXX.log)

  cleanup() {
    if [ -n "${TUNNEL_PID:-}" ]; then
      kill "$TUNNEL_PID" 2>/dev/null || true
    fi
    rm -f "$LOG_FILE"
  }
  trap cleanup EXIT INT TERM

  echo "==> Starting Cloudflare quick tunnel to http://localhost:8080..."
  cloudflared tunnel --url http://localhost:8080 > "$LOG_FILE" 2>&1 &
  TUNNEL_PID=$!

  echo "==> Waiting for tunnel URL..."
  URL=""
  for _ in {1..30}; do
    if URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -n 1); [ -n "$URL" ]; then
      break
    fi
    sleep 1
  done

  if [ -z "$URL" ]; then
    echo "Error: Failed to obtain public tunnel URL."
    cat "$LOG_FILE"
    exit 1
  fi

  echo ""
  echo "========================================================="
  echo "  Tiny Myrmidon is live for mobile testing:"
  echo "  $URL"
  echo "========================================================="
  echo ""
  echo "Scan this QR code with your mobile camera:"
  echo ""
  curl --fail --silent --show-error "https://qrenco.de/$URL" || true
  echo ""
  echo "Press Ctrl+C to close the tunnel."
  echo ""

  wait "$TUNNEL_PID"
}

main "$@"
