#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <commit> <label>" >&2
  exit 2
fi

commit=$1
label=$2
case "$label" in
  *[!A-Za-z0-9_-]*|'')
    echo "invalid label: $label" >&2
    exit 2
    ;;
esac

repo=/Users/paulbingham/apps/netrunner/chiriboga-dev
worktree=/Users/paulbingham/apps/netrunner/bisect-$label
branch=bisect-$label
harness=b52d45123c10201572aaf837714dd019bd9bdfcc

git -C "$repo" rev-parse --verify "${commit}^{commit}" >/dev/null
if [ -e "$worktree" ]; then
  echo "worktree already exists: $worktree" >&2
  exit 1
fi
if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "branch already exists: $branch" >&2
  exit 1
fi

git -C "$repo" worktree add "$worktree" -b "$branch" "$harness"
git -C "$repo" show "${commit}:ai_corp.js" > "$worktree/ai_corp.js"

sed_script=$(mktemp /tmp/chiriboga-shim.XXXXXX)
trap 'rm -f "$sed_script"' EXIT HUP INT TERM

if ! grep -q 'this.options = Object.assign' "$worktree/ai_corp.js"; then
  printf '/^  constructor() {/a\\\n    this.options = Object.assign({}, CorpAI.DEFAULT_OPTIONS);\r\n' > "$sed_script"
  sed -i '' -f "$sed_script" "$worktree/ai_corp.js"
fi

if ! grep -q '_choiceInner' "$worktree/ai_corp.js"; then
  choice_line=$(grep -n -m 1 '^  Choice(optionList, choiceType) {' "$worktree/ai_corp.js" | cut -d: -f1)
  if [ -z "$choice_line" ]; then
    echo "Choice method not found in $worktree/ai_corp.js" >&2
    exit 1
  fi
  sed -i '' "${choice_line}s/^  Choice(optionList, choiceType) {/  _choiceInner(optionList, choiceType) {/" "$worktree/ai_corp.js"
fi

if ! grep -q 'DecisionSnapshots' "$worktree/ai_corp.js"; then
  printf '  Choice(optionList, choiceType) {\r\n    var telemetry = typeof DecisionSnapshots !== "undefined" && DecisionSnapshots.telemetry;\r\n    var startedAt = telemetry ? DecisionSnapshots.Now() : 0;\r\n    var ret = this._choiceInner(optionList, choiceType);\r\n    if (telemetry)\r\n      DecisionSnapshots.Record("corp", choiceType, optionList, ret, DecisionSnapshots.Now() - startedAt);\r\n    return ret;\r\n  }\r\n\r\n' > "$sed_script"
  choice_line=$(grep -n -m 1 '^  _choiceInner(optionList, choiceType) {' "$worktree/ai_corp.js" | cut -d: -f1)
  before_choice=$((choice_line - 1))
  sed -i '' "${before_choice}r $sed_script" "$worktree/ai_corp.js"
fi

if ! grep -q '^CorpAI.DEFAULT_OPTIONS = Object.freeze({' "$worktree/ai_corp.js"; then
  if [ "$(tail -c 1 "$worktree/ai_corp.js" | od -An -tuC | tr -d ' ')" != "10" ]; then
    printf '\r\n' >> "$worktree/ai_corp.js"
  fi
  printf 'CorpAI.DEFAULT_OPTIONS = Object.freeze({\r\n});\r\n' >> "$worktree/ai_corp.js"
fi

git -C "$worktree" add ai_corp.js
git -C "$worktree" commit -m "bench: $label ai_corp with harness shim"
git -C "$worktree" diff --stat "$commit" -- ai_corp.js
printf '%s\n' "$worktree"
