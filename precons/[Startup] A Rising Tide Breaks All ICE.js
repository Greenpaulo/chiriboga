// Exported preconstructed deck
registerPrecon({
    // name: Display name of the precon deck
    name: "[Startup] A Rising Tide Breaks All ICE",
    // identity: Card ID of the identity/commander for this deck
    identity: "30019",  // Tāo Salonga: Telepresence Magician
    // useAsCustomDefault: Whether this deck is the default choice for its identity when auto-selecting
    useAsCustomDefault: false,
    // useForQuickGame: Whether to include this deck in Quick Game selection
    useForQuickGame: false,
    // useForGauntlet: Whether to include this deck in Gauntlet mode selection
    useForGauntlet: false,
    // useForCustomGame: Whether to include this deck in Custom Game mode
    useForCustomGame: true,
    // deck_set: The set or category this deck belongs to
    deck_set: "",
    URL: "https://netrunnerdb.com/en/decklist/012da174-5a67-416e-9593-08b452b6c32c",
    notes: "This is a Startup 26.03 update to two earlier all-Fracter Tao decks for Core. The basic idea is to discard lots of Fracters to increase the base strength of Rising Tide, install Conduit, use Chromatophores to turn the ICE on R&D into barriers, and dig for seven points. Relative to the earlier two Core decks, the major additions are Botulus and Stowaway. This is jank, but surprisingly playable.\n\nRising Tide is your breaker here, with 7 extra fracters to give a potential base strength of 8, inexpensively breaking even the biggest ICE. Ritual and VRcation are used to dig and safely overdraw to fill the heap with those extra copies.\n\nMadani is an essential piece because it allows you to install Chromatophores mid-run, as well as providing click compression by allowing you to install multiple programs on one click, and allowing you to install program on the Corp's turn, gaining additional benefit from DZMZ Optimizer. Ideally, you want to use Ritual and VRcation to load as many programs as you can with one click. Drawing Madani late is crippling, which is why there are three copies in the deck.\n\nChromatophores is the other key card, and you want to load these onto Madani as soon as you can to threaten runs. Scrounge is primarily used to recur these if your opponent trashes the ICE hosting them. Beta Build is usually used to tutor a copy, and can also be used to unexpectedly challenge the scoring remote without committing a copy of Chromatophores.\n\nConduit should be hosted onto Madani and generally installed on the Corp turn right before you're ready to start hammering R&D. Alternately, you can install it with Madani right before breaching if you don't expect to need that install trigger.\n\nBotulus is here as an alternative tool for low subroutine ICE to supplement Chromatophores. If you install it on the Corp turn, you'll have two virus counters on the Runner turn. This can also be useful for threatening the scoring remote because you don't need to run it every turn.\n\nStowaway provides additional econ on repeated runs on R&D and can leverage your Madani once-per-turn install when you don't need Chromatophores or Botulus. You can wait to install this with Madani until just before breaching. If you make the ICE credit neutral or credit positive, the Corp will often trash it, which is OK, because you have more trojans than MU.\n\nFinally, Tāo's ID ability is really helpful for repositioning problematic ICE to create openings. If the Corp is overcommitting to defending R&D, you can use this ability to suddenly shift to targeting the scoring remote. \n\nMéliès U: Only the Brightest can be a very difficult matchup, and you may want to primarily target the scoring remote instead. Bumi 1.0 and Flyswatter can be problematic ICE, and they can show up in any deck, so at times it can be better to move known ICE onto R&D to avoid the risk of these on-rez triggers.\n\nIf you want to shake things up, you can replace a copy of Botulus with Tranquilizer, which can be taxing for very expensive ICE (although I think Botulus is more generically useful). You can also cut a copy of Madani at the risk of losing consistency, and the Stowaways are not essential and can strain your MU. Another DZMZ Optimizer could help with MU so you can keep more trojans online at once.",
    cards: {
        "30004": 2,  // Botulus
        "30016": 2,  // Marjanah
        "30020": 3,  // Creative Commission
        "30021": 3,  // VRcation
        "30022": 2,  // DZMZ Optimizer
        "30024": 2,  // Conduit
        "30027": 3,  // Telework Contract
        "30030": 3,  // Sure Gamble
        "35004": 1,  // Scrounge
        "35009": 3,  // Rising Tide
        "35026": 3,  // Ritual
        "35028": 3,  // Madani
        "35030": 3,  // Chromatophores
        "35032": 3,  // Principia
        "36019": 1,  // Beta Build
        "36024": 3  // Stowaway
    },
    // sets: The set codes this deck is designed with
    sets: ["sg", "elev", "vp"]
});
