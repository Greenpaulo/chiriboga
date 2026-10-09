// Lower event density and fewer redirect pieces than the Vic benchmark.
registerPrecon({
  name: 'Baker Touchstone Economy Benchmark',
  identity: '30010', // Zahya Sadeghi
  useAsCustomDefault: false,
  useForQuickGame: false,
  useForGauntlet: false,
  useForCustomGame: false,
  deck_set: 'AI benchmarks',
  notes: '45-card Criminal benchmark, 14 influence. Two Baker/Touchstone copies, 15 events instead of 18, and Telework Contract instead of Lie Low. Tests intermittent refill pressure with a different identity and economy. Only Baker and Touchstone are from Vantage Point.',
  cards: {
    '30006': 1, // Cleaver
    '30011': 3, // Mutual Favor
    '30012': 3, // Tread Lightly
    '30013': 3, // Docklands Pass
    '30014': 3, // Pennyshaver
    '30015': 3, // Carmen
    '30016': 3, // Marjanah
    '30018': 3, // Red Team
    '30026': 1, // Unity
    '30027': 3, // Telework Contract
    '30030': 3, // Sure Gamble
    '30034': 3, // Verbal Plasticity
    '35014': 3, // Clean Getaway
    '35017': 3, // Transfer of Wealth
    '35022': 3, // Open Market
    '36015': 2, // Baker
    '36021': 2, // Touchstone
  },
  sets: ['sg', 'elev', 'vp'],
});
