#!/bin/bash
# scripts/generate-keys.sh

echo "Generating RS256 keypair for JWT signing..."

# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Convert to Base64 (remove newlines to make it easy to paste into .env)
PRIV_B64=$(cat private.pem | base64 | tr -d '\n')
PUB_B64=$(cat public.pem | base64 | tr -d '\n')

echo "==========================================="
echo "Add these to your .env file:"
echo "-------------------------------------------"
echo "JWT_PRIVATE_KEY_BASE64=\"$PRIV_B64\""
echo "JWT_PUBLIC_KEY_BASE64=\"$PUB_B64\""
echo "==========================================="

# Cleanup temp files
rm private.pem public.pem

echo "Done! The temp PEM files have been removed for security."
