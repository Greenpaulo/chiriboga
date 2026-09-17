// Sound effect manager. Preloads every effect once; PlaySound() re-triggers
// instantly even if the same sound is still finishing from a rapid prior
// event (e.g. drawing multiple cards in one click).
var soundEffects = {
  gainCredit: new Audio('sounds/click-credit.mp3'),
  gainCredit2: new Audio('sounds/click-credit-2.mp3'),
  gainCredit3: new Audio('sounds/click-credit-3.mp3'),
  drawCard: new Audio('sounds/click-card.mp3'),
  drawCard2: new Audio('sounds/click-card-2.mp3'),
  drawCard3: new Audio('sounds/click-card-3.mp3'),
  professionalContacts: new Audio('sounds/professional-contacts.mp3'),
  advance: new Audio('sounds/click-advance.mp3'),
  runInitiated: new Audio('sounds/click-run.mp3'),
  removeTag: new Audio('sounds/click-remove-tag.mp3'),
  installCorp: new Audio('sounds/install-corp.mp3'),
  installRunner: new Audio('sounds/install-runner.mp3'),
  playInstant: new Audio('sounds/play-instant.mp3'),
  rezIce: new Audio('sounds/rez-ice.mp3'),
  rezOther: new Audio('sounds/rez-other.mp3'),
  purge: new Audio('sounds/virus-purge.mp3'),
  agendaScore: new Audio('sounds/agenda-score.mp3'),
  agendaSteal: new Audio('sounds/agenda-steal.mp3'),
  runSuccessful: new Audio('sounds/run-successful.mp3'),
  runUnsuccessful: new Audio('sounds/run-unsuccessful.mp3'),
  archer: new Audio('sounds/archer.mp3'),
  illumination: new Audio('sounds/illumination.mp3'),
  gameEnd: new Audio('sounds/game-end.mp3')
};

var suppressCreditDrawSound = false;

function PlaySound(name) {
  var sfx = soundEffects[name];
  if (!sfx) return;
  sfx.currentTime = 0;
  sfx.play().catch(function () {
    // Ignored: browsers block audio before the first user interaction on
    // the page. Every real game session starts with a menu click, so this
    // only ever fires (harmlessly) if something plays before that.
  });
}

//Use the same sound policy for credits gained from the bank and credits taken
//from hosted card pools (for example Red Team and Telework Contract).
function PlayCreditGainSound(num) {
  if (suppressCreditDrawSound) return;
  num = Number(num);
  if (num === 1) PlaySound('gainCredit');
  else if (num === 2) PlaySound('gainCredit2');
  else if (num >= 3) PlaySound('gainCredit3');
}
