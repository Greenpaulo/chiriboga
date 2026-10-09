// Focused remediation benchmark. Other cards are from the normal trusted sets.
registerPrecon({
  name: 'Baker Touchstone Benchmark',
  identity: '36009',
  useAsCustomDefault: false,
  useForQuickGame: false,
  useForGauntlet: false,
  useForCustomGame: false,
  deck_set: 'AI benchmarks',
  notes: '45-card Criminal deck, 10 influence. Tests event-funded Baker routes against LEO. Vantage Point cards are limited to Vic, Baker and Touchstone; this does not enable the set or change the normal F4 pool.',
  cards: {
    '30006': 1, // Cleaver
    '30011': 3, // Mutual Favor
    '30012': 3, // Tread Lightly
    '30013': 2, // Docklands Pass
    '30014': 3, // Pennyshaver
    '30015': 3, // Carmen
    '30016': 2, // Marjanah
    '30018': 3, // Red Team
    '30026': 1, // Unity
    '30030': 3, // Sure Gamble
    '30034': 3, // Verbal Plasticity
    '35014': 3, // Clean Getaway
    '35015': 3, // Lie Low
    '35017': 3, // Transfer of Wealth
    '35022': 3, // Open Market
    '36015': 3, // Baker
    '36021': 3, // Touchstone
  },
  sets: ['sg', 'elev', 'vp'],
});
