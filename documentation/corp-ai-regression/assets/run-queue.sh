#!/bin/bash
set -euo pipefail

bench=/Users/paulbingham/bench
pool="$bench/beginner-pool.json"
baseline="$bench/current.json"
expected_pool_hash=fe8cb821d04c9dd7

validate_report() {
  local report=$1
  jq -e --arg pool_hash "$expected_pool_hash" --slurpfile base "$baseline" \
    '.poolHash == $pool_hash and
     (.seeds | length) == 200 and
     (.games | length) == 1000 and
     (.failures | length) == 0 and
     .dirty == false and
     .poolHash == $base[0].poolHash and
     .seeds == $base[0].seeds and
     .starts == $base[0].starts and
     .collectors == $base[0].collectors and
     .options == $base[0].options' \
    "$report" >/dev/null
}

run_one() {
  local label=$1
  local worktree=$2
  local expected_head=$3
  local report="$bench/$label.json"
  local log="$bench/$label.log"
  local pidfile="$bench/$label.pid"

  if [[ -f "$report" ]]; then
    if validate_report "$report"; then
      echo "SKIP $label: complete valid report already exists at $report"
      return 0
    fi
    echo "STOP $label: report exists but is incomplete or incompatible: $report" >&2
    return 1
  fi

  if [[ -s "$pidfile" ]]; then
    local old_pid
    old_pid=$(<"$pidfile")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "STOP $label: recorded process $old_pid is still running" >&2
      return 1
    fi
  fi

  if [[ -f "$log" ]]; then
    mv "$log" "$log.previous.$(date +%Y%m%d-%H%M%S)"
  fi

  [[ "$(git -C "$worktree" rev-parse HEAD)" == "$expected_head" ]] || {
    echo "STOP $label: unexpected HEAD in $worktree" >&2
    return 1
  }
  [[ -z "$(git -C "$worktree" status --porcelain)" ]] || {
    echo "STOP $label: worktree is dirty: $worktree" >&2
    return 1
  }

  echo "START $label from $expected_head"
  (
    cd "$worktree"
    node scripts/ai-batch.js --pool "$pool" --games 200 --out "$report" > "$log" 2>&1 &
    local batch_pid=$!
    printf '%s\n' "$batch_pid" > "$pidfile"
    trap 'kill "$batch_pid" 2>/dev/null || true' HUP INT TERM
    wait "$batch_pid"
  )
  : > "$pidfile"

  cat "$log"
  validate_report "$report" || {
    echo "STOP $label: completed report failed validation" >&2
    return 1
  }
  echo "DONE $label: $report"
}

run_one \
  causal-a-no-is-secure-gate \
  /Users/paulbingham/apps/netrunner/bisect-causal-a \
  7f3b63484ddbb64386578a717bf7f93c05eec7bd

run_one \
  causal-b-legacy-ice-weighting \
  /Users/paulbingham/apps/netrunner/bisect-causal-b \
  18cff8669115fbd59ad0844f33b9a9b7a3dd76f9

node /Users/paulbingham/apps/netrunner/chiriboga-dev/scripts/ai-batch.js \
  --compare "$baseline" "$bench/causal-a-no-is-secure-gate.json" \
  > "$bench/compare-current-causal-a.log"
node /Users/paulbingham/apps/netrunner/chiriboga-dev/scripts/ai-batch.js \
  --compare "$baseline" "$bench/causal-b-legacy-ice-weighting.json" \
  > "$bench/compare-current-causal-b.log"

cat "$bench/compare-current-causal-a.log"
cat "$bench/compare-current-causal-b.log"
