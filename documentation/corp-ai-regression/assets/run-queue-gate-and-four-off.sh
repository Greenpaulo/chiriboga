#!/bin/bash
set -uo pipefail
bench=/Users/paulbingham/bench
worktree=/Users/paulbingham/apps/netrunner/bisect-causal-gate-and-four-off
label=causal-gate-and-four-off
report="$bench/$label.json"
log="$bench/$label.log"

run_batch() {
  if [[ -f "$report" ]]; then
    echo "SKIP $label: report already exists"
    return 0
  fi
  [[ "$(git -C "$worktree" rev-parse --short=7 HEAD)" == edc177a ]] || return 1
  [[ -z "$(git -C "$worktree" status --porcelain)" ]] || return 1
  if [[ -f "$log" ]]; then
    mv "$log" "$log.previous.$(date +%Y%m%d-%H%M%S)"
  fi
  echo "START $label"
  (
    cd "$worktree" || exit 1
    node scripts/ai-batch.js --pool "$bench/beginner-pool.json" \
      --games 200 --jobs 10 --out "$report" > "$log" 2>&1 &
    batch_pid=$!
    printf '%s\n' "$batch_pid" > "$bench/$label.pid"
    trap 'kill "$batch_pid" 2>/dev/null || true' HUP INT TERM
    wait "$batch_pid"
  )
  local status=$?
  : > "$bench/$label.pid"
  if [[ $status -eq 0 && -f "$report" ]]; then
    echo "DONE $label" | tee -a "$bench/queue.log"
  else
    echo "FAIL $label: exit $status; see $log" | tee -a "$bench/queue.log" >&2
  fi
}

run_batch || echo "FAIL $label: worktree validation failed" >&2
if [[ -f "$report" ]]; then
  for baseline in current orig; do
    node "$worktree/scripts/ai-batch.js" --compare "$bench/$baseline.json" "$report" \
      > "$bench/compare-$baseline-gate-and-four-off.log" 2>&1
    status=$?
    if [[ $status -eq 0 ]]; then
      echo "Comparison saved: $bench/compare-$baseline-gate-and-four-off.log"
    else
      echo "FAIL comparison against $baseline; see comparison log" >&2
    fi
  done
fi
