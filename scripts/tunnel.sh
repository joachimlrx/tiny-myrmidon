#!/usr/bin/env bash
set -euo pipefail

ensure_cloudflared() {
  if command -v cloudflared &>/dev/null; then
    return 0
  fi

  if [ -x "$HOME/.local/bin/cloudflared" ]; then
    export PATH="$HOME/.local/bin:$PATH"
    return 0
  fi

  echo "==> Downloading cloudflared..."
  mkdir -p "$HOME/.local/bin"
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$HOME/.local/bin/cloudflared"
  chmod +x "$HOME/.local/bin/cloudflared"
  export PATH="$HOME/.local/bin:$PATH"
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

  echo "==> Starting secure Cloudflare tunnel to http://localhost:8080..."
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
  curl -s "qrenco.de/$URL" || true
  echo ""
  echo "Press Ctrl+C to close the tunnel."
  echo ""

  wait "$TUNNEL_PID"
}

main "$@"
