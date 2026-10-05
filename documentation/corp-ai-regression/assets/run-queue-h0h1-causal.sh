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
  causal-h0h1-no-server-at-risk \
  /Users/paulbingham/apps/netrunner/bisect-causal-h0h1-no-server-at-risk \
  188a96aa233c198b80c8244b329e83e87158c0b0

run_one \
  causal-h0h1-no-scoring-reserve-bypass \
  /Users/paulbingham/apps/netrunner/bisect-causal-h0h1-no-scoring-reserve-bypass \
  a7b3236df12b99d54520739ae0632d45d102507f

run_one \
  causal-h0h1-no-archives-pressure-allocation \
  /Users/paulbingham/apps/netrunner/bisect-causal-h0h1-no-archives-pressure-allocation \
  839640734103e22a93d63d67e6e9caa359e7e8b9

run_one \
  causal-h0h1-legacy-debt-aging \
  /Users/paulbingham/apps/netrunner/bisect-causal-h0h1-legacy-debt-aging \
  ad597a06f2e583dd1fb3e40814246e3022b88b71
