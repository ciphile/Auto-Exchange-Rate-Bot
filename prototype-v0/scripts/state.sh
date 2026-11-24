#!/usr/bin/env bash
# Load/save ./state.json on the `bot-state` branch so runs share state without a database.
#   scripts/state.sh load   -> writes ./state.json ({} if none yet)
#   scripts/state.sh save   -> commits ./state.json to bot-state if it changed
# In Actions it uses GITHUB_TOKEN/GITHUB_REPOSITORY; set STATE_REMOTE_URL to override (tests).
set -euo pipefail

BRANCH=bot-state
FILE=state.json
REMOTE="${STATE_REMOTE_URL:-https://x-access-token:${GITHUB_TOKEN:-}@github.com/${GITHUB_REPOSITORY:-}.git}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

has_branch() { git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" >/dev/null 2>&1; }

case "${1:-}" in
  load)
    if has_branch && git clone -q --depth 1 --branch "$BRANCH" "$REMOTE" "$tmp/repo" 2>/dev/null; then
      [ -f "$tmp/repo/$FILE" ] && cp "$tmp/repo/$FILE" "$FILE"
    fi
    [ -f "$FILE" ] || echo '{}' > "$FILE"
    echo "state loaded"
    ;;
  save)
    [ -f "$FILE" ] || { echo "no $FILE to save"; exit 0; }
    for attempt in 1 2 3; do
      rm -rf "$tmp/repo"
      if has_branch; then
        git clone -q --depth 1 --branch "$BRANCH" "$REMOTE" "$tmp/repo"
      else
        git init -q "$tmp/repo"
        git -C "$tmp/repo" checkout -q --orphan "$BRANCH"
        git -C "$tmp/repo" remote add origin "$REMOTE"
      fi
      cp "$FILE" "$tmp/repo/$FILE"
      git -C "$tmp/repo" add "$FILE"
      if git -C "$tmp/repo" diff --cached --quiet; then echo "state unchanged"; exit 0; fi
      git -C "$tmp/repo" -c user.name=rate-bot -c user.email=rate-bot@users.noreply.github.com \
        commit -q -m "update state"
      if git -C "$tmp/repo" push -q origin "HEAD:$BRANCH"; then echo "state saved"; exit 0; fi
      sleep 2
    done
    echo "could not save state" >&2
    exit 1
    ;;
  *)
    echo "usage: $0 load|save" >&2
    exit 2
    ;;
esac
