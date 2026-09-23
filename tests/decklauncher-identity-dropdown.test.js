// Run with: node tests/decklauncher-identity-dropdown.test.js
// Regression coverage for the custom identity dropdown panel in
// decklauncher.php. The native <select> popup is rendered by the OS and
// opens as a clipped slice around the selected option for long identity
// lists, so the page now hides the select inside a wrapper and opens a
// styled listbox panel that is always fully visible (viewport cap plus its
// own scrollbar). The hidden select must remain the source of truth for the
// existing .val()/.change()/option:checked call sites, and the shared CSS
// hide rule must stay scoped so gauntlet.php keeps its native popup.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'decklauncher.php'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '..', 'style.css'), 'utf8');
const gauntlet = fs.readFileSync(path.resolve(__dirname, '..', 'gauntlet.php'), 'utf8');

// --- Markup: wrapper, hidden select, trigger button, listbox panel ---
assert(
  source.includes('<div class="custom-select" id="identityselect-custom">'),
  'identity select needs the custom-select wrapper',
);
assert(
  source.includes('<select id="identityselect"></select>'),
  'native select must stay in the DOM as the source of truth',
);
assert(source.includes('id="identityselect-trigger"'), 'custom trigger button is missing');
assert(source.includes('id="identityselect-list"'), 'custom listbox panel is missing');

// --- Wiring: widget defined and initialised after the options exist ---
assert(
  source.includes('function InitIdentityCustomSelect()'),
  'custom dropdown initializer is missing',
);
const optionsMarker = 'var shortTitle = GetIdentityDisplayTitle(playerIdentities[i]);';
const optionsIdx = source.indexOf(optionsMarker);
const initIdx = source.indexOf('InitIdentityCustomSelect();');
assert(optionsIdx > -1, 'identity option builder marker missing');
assert(initIdx > optionsIdx, 'widget must initialize after the <option>s are appended');

const widgetStart = source.indexOf('function InitIdentityCustomSelect()');
const widgetEnd = source.indexOf('function Init() {', widgetStart);
assert(widgetStart > -1 && widgetEnd > widgetStart, 'could not locate widget source');
const widget = source.slice(widgetStart, widgetEnd);

// Choosing a row writes to the select and fires change, like the native popup.
assert(/\$select\.val\(/.test(widget), 'panel selection must write the value back to the hidden select');
assert(
  widget.includes('$select.trigger("change")'),
  'panel selection must fire change so deck regeneration still runs',
);
// Programmatic .val()/.prop("selected") updates fire no event; keep a sync fallback.
assert(widget.includes('setInterval'), 'value changes without events must be polled so the label never goes stale');
assert(
  widget.includes('MutationObserver'),
  'option list rebuilds must be observed to re-render the panel',
);

// --- Precon dropdown uses the same widget ---
assert(
  source.includes('<div class="custom-select" id="preconselect-custom">'),
  'precon select needs the custom-select wrapper',
);
assert(
  source.includes('<select id="preconselect">'),
  'native precon select must stay in the DOM as the source of truth',
);
assert(source.includes('id="preconselect-trigger"'), 'precon trigger button is missing');
assert(source.includes('id="preconselect-list"'), 'precon listbox panel is missing');
assert(
  source.includes('function InitCustomSelect(selectId'),
  'generic custom select widget is missing',
);
assert(
  widget.includes('InitCustomSelect("identityselect"'),
  'identity dropdown must go through the generic widget',
);
const preconInitIdx = source.indexOf('InitCustomSelect("preconselect"');
const preconHandlerIdx = source.indexOf("$('#preconselect').off('change')");
assert(preconInitIdx > -1, 'precon dropdown must be initialized');
assert(
  preconInitIdx > preconHandlerIdx,
  'precon widget must initialize after its change handler is bound so the widget render listener survives',
);
assert(
  /#preconselect-custom\s*\{\s*margin-top:\s*8px/.test(css),
  'precon wrapper must keep the 8px gap the native select had',
);

// --- CSS: panel always fully visible, scrollable inside itself ---
const listRule = css.match(/\.custom-select-list\s*\{[^}]*\}/);
assert(listRule, '.custom-select-list rule missing');
assert(listRule[0].includes('position: absolute'), 'panel must overlay page content');
assert(listRule[0].includes('max-height'), 'panel must be capped to the viewport');
assert(
  /max-height:\s*\d+v[wh]/.test(listRule[0]),
  'panel cap must be viewport-relative so it always fits on screen',
);
assert(listRule[0].includes('overflow-y: auto'), 'panel needs its own scrollbar for long lists');
assert(
  /\.custom-select-list\.open\s*\{\s*display:\s*block/.test(css),
  'open state must show the panel',
);

// Native select hidden only inside the wrapper so gauntlet.php (same shared
// CSS, same select id) keeps its native popup.
assert(
  /\.custom-select > select\s*\{[^}]*display:\s*none/.test(css),
  'native select must be hidden only within .custom-select wrappers',
);
assert(
  !gauntlet.includes('identityselect-custom'),
  'gauntlet still uses the native select; the hide rule must stay scoped',
);
assert(!gauntlet.includes('InitIdentityCustomSelect'), 'widget lives in decklauncher only');

// Trigger mirrors the old select (chevron clearance + ellipsis label).
const triggerRule = css.match(/\.custom-select-trigger\s*\{[^}]*\}/);
assert(triggerRule, '.custom-select-trigger rule missing');
assert(
  triggerRule[0].includes('padding: 10px 34px 10px 12px'),
  'trigger must keep the chevron clearance of the old select',
);
assert(
  css.includes('.custom-select-trigger .custom-select-label'),
  'trigger label styling missing',
);

console.log('Decklauncher custom identity dropdown regression cases passed.');