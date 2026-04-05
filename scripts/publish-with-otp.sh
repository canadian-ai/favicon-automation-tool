#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${1:-}" ]]; then
  printf "Usage: bash ./scripts/publish-with-otp.sh <otp-code>\n"
  exit 1
fi

OTP="$1"
PACKAGE_NAME="$(node -p "require('./package.json').name")"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"

printf "Publishing %s@%s with OTP...\n" "$PACKAGE_NAME" "$PACKAGE_VERSION"

npm publish --access public --ignore-scripts --otp "$OTP"

printf "Publish command completed for %s@%s\n" "$PACKAGE_NAME" "$PACKAGE_VERSION"
