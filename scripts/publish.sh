#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=false
YES=false
TAG=""
OTP=""

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    --yes)
      YES=true
      ;;
    --tag=*)
      TAG="${arg#*=}"
      ;;
    --otp=*)
      OTP="${arg#*=}"
      ;;
    *)
      printf "Unknown argument: %s\n" "$arg"
      printf "Usage: bash ./scripts/publish.sh [--dry-run] [--yes] [--tag=<name>] [--otp=<code>]\n"
      exit 1
      ;;
  esac
done

PACKAGE_NAME="$(node -p "require('./package.json').name")"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"

if [[ "$PACKAGE_NAME" != "@canadianai/favicon-manager" ]]; then
  printf "Expected package name '@canadianai/favicon-manager' but found '%s'\n" "$PACKAGE_NAME"
  exit 1
fi

printf "Preparing to publish %s@%s\n" "$PACKAGE_NAME" "$PACKAGE_VERSION"

NPM_USER="$(npm whoami 2>/dev/null || true)"
if [[ -z "$NPM_USER" ]]; then
  printf "Not logged into npm. Run: npm login\n"
  exit 1
fi

printf "npm user: %s\n" "$NPM_USER"

printf "Building CLI...\n"
npm run cli:build

printf "Running package dry run...\n"
npm pack --dry-run >/dev/null

if [[ "$DRY_RUN" == true ]]; then
  printf "Dry run complete. No publish performed.\n"
  exit 0
fi

PUBLISH_CMD=(npm publish --access public)
if [[ -n "$TAG" ]]; then
  PUBLISH_CMD+=(--tag "$TAG")
fi

if [[ -n "$OTP" ]]; then
  PUBLISH_CMD+=(--otp "$OTP")
elif [[ "$YES" != true ]]; then
  printf "Enter npm OTP code (press Enter to skip): "
  read -r otp_input
  if [[ -n "$otp_input" ]]; then
    PUBLISH_CMD+=(--otp "$otp_input")
  fi
fi

if [[ "$YES" != true ]]; then
  printf "\nAbout to run: "
  printf "%q " "${PUBLISH_CMD[@]}"
  printf "\nContinue? [y/N] "
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    printf "Publish cancelled.\n"
    exit 0
  fi
fi

"${PUBLISH_CMD[@]}"

printf "Published %s@%s\n" "$PACKAGE_NAME" "$PACKAGE_VERSION"
