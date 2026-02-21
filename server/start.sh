#!/bin/bash

# Generate certificate if it doesn't exist
CERT_DIR="/data/certs"
CERT_PATH="$CERT_DIR/cert.pem"
KEY_PATH="$CERT_DIR/key.pem"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  echo "Generating new certificate..."
  mkdir -p "$CERT_DIR"
  openssl ecparam -name prime256v1 -genkey -noout -out "$KEY_PATH"
  openssl req -new -x509 -key "$KEY_PATH" -out "$CERT_PATH" \
    -days 14 -subj "/CN=openworld-quic.fly.dev" \
    -addext "subjectAltName=DNS:openworld-quic.fly.dev"

  # Print the hash for reference
  echo "Certificate hash (update client if needed):"
  openssl x509 -in "$CERT_PATH" -outform DER | openssl dgst -sha256 -binary | base64
else
  echo "Using existing certificate"
  # Print expiry date
  echo "Certificate expires:"
  openssl x509 -in "$CERT_PATH" -noout -enddate
fi

# Start the server
exec node src/server.js
