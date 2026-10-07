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
  h0h1-04-b28b7bf \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-04-b28b7bf \
  ac4ed792889c80b9ca2d0ea401d847dda469894b

run_one \
  h0h1-08-752dbf0 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-08-752dbf0 \
  5d05f451c8b02e6beb42404ba6ba1f380fa775f0

run_one \
  h0h1-12-5de59ce \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-12-5de59ce \
  270abd96642ad73ddc01db4e801481c884cf8b31

run_one \
  h0h1-16-159a8d6 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-16-159a8d6 \
  21214314a8001e7907eae1f4ea080bf0f5969a58

run_one \
  h0h1-20-bd9bd79 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-20-bd9bd79 \
  d2d9160dd710d085234e6c6fe07bb127fb124278

run_one \
  h0h1-24-3c59ec1 \
  /Users/paulbingham/apps/netrunner/bisect-h0h1-24-3c59ec1 \
  5988b40957dea8195f83a47498fc805841aac3bf
