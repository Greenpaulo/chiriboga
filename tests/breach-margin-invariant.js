// I2 M1 invariant, checked on every security evaluation a suite makes: outside
// an honest lockout (margin -Infinity) and unknown pricing (margin null), the
// breach margin is non-negative exactly when the honest verdict is not secure.
// Wraps the uncached evaluator on the AI's prototype; the evaluator is pure, so
// the suite's own assertions are unaffected. Returns a counter of checks made.
const assert = require('assert');

module.exports = function installMarginInvariant(ai) {
  const proto = Object.getPrototypeOf(ai);
  const evaluate = proto._evaluateServerSecurityUncached;
  const counter = {checks: 0};
  proto._evaluateServerSecurityUncached = function (server) {
    const result = evaluate.call(this, server);
    if (server && typeof result.honestIsSecure == 'boolean') {
      const {margin, upperBound} = this._breachMargin(server, result);
      if (result.honestLockout) assert.strictEqual(margin, -Infinity, 'honest lockout margin');
      else if (result.honestMandatoryBreakCost === null) {
        assert.strictEqual(margin, null, 'unknown pricing margin');
        assert.ok(upperBound === null || typeof upperBound == 'number', 'unknown pricing upper bound');
      } else assert.strictEqual(margin >= 0, !result.honestIsSecure,
        'margin ' + margin + ' disagrees with honestIsSecure ' + result.honestIsSecure);
      counter.checks++;
    }
    return result;
  };
  return counter;
};
