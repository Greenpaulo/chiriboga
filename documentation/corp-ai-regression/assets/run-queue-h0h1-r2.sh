#!/bin/bash
set -uo pipefail

bench=/Users/paulbingham/bench
pool="$bench/beginner-pool.json"
queue_log="$bench/queue.log"
jobs=10

run_one() {
  local label=$1
  local worktree=$2
  local expected_head=$3
  local report="$bench/$label.json"
  local log="$bench/$label.log"
  local pidfile="$bench/$label.pid"
  local actual_head
  local batch_pid
  local status

  if [[ -f "$report" ]]; then
    echo "SKIP $label: $report already exists"
    return 0
  fi

  actual_head=$(git -C "$worktree" rev-parse HEAD 2>/dev/null) || {
    echo "FAIL $label: cannot read worktree $worktree" | tee -a "$queue_log" >&2
    return 0
  }
  if [[ "$actual_head" != "$expected_head" ]]; then
    echo "FAIL $label: expected HEAD $expected_head, found $actual_head" | tee -a "$queue_log" >&2
    return 0
  fi
  if [[ -n "$(git -C "$worktree" status --porcelain)" ]]; then
    echo "FAIL $label: dirty worktree $worktree" | tee -a "$queue_log" >&2
    return 0
  fi

  if [[ -f "$log" ]]; then
    mv "$log" "$log.previous.$(date +%Y%m%d-%H%M%S)"
  fi

  echo "START $label from $expected_head"
  (
    cd "$worktree" || exit 1
    node scripts/ai-batch.js \
      --pool "$pool" \
      --games 200 \
      --jobs "$jobs" \
      --out "$report" \
      > "$log" 2>&1 &
    batch_pid=$!
    printf '%s\n' "$batch_pid" > "$pidfile"
    trap 'kill "$batch_pid" 2>/dev/null || true' HUP INT TERM
    wait "$batch_pid"
  )
  status=$?
  : > "$pidfile"

  if [[ $status -ne 0 ]]; then
    echo "FAIL $label: ai-batch exited $status; see $log" | tee -a "$queue_log" >&2
    return 0
  fi
  if [[ ! -f "$report" ]]; then
    echo "FAIL $label: ai-batch exited successfully without $report" | tee -a "$queue_log" >&2
    return 0
  fi

  echo "DONE $label" | tee -a "$queue_log"
}

run_one \
  h0h1-r2-21-5e6af68 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-21-5e6af68 \
  56ed6e9f1062951d8a3e7886804a2c2f498dab11

run_one \
  h0h1-r2-22-87243c0 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-22-87243c0 \
  a120eae60ffa5b451fe29a3e884b095125679a0e

run_one \
  h0h1-r2-23-c143116 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-23-c143116 \
  4d7be88622bbc071c5ea7928b1d8bd4b113389a1

run_one \
  h0h1-r2-25-a3d57d3 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-25-a3d57d3 \
  f498fdd6969e009127cb42d7f6db0bca96100700

run_one \
  h0h1-r2-26-f234aa5 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-26-f234aa5 \
  ecadeb0d9134179fa1f56255187048bc8cbbc822

run_one \
  h0h1-r2-27-35ca729 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-r2-27-35ca729 \
  fb6b7f974c206ef4d5bc37001c4348b53b4294d9
