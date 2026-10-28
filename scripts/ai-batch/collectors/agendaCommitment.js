'use strict';
// I4: Corp turns ending with an installed unscored agenda that gained no
// advancement counter that Corp turn (idleAgendaTurns), and Corp turns ending
// with an agenda in HQ while a remote had no agenda or asset in root
// (hqHoldTurns). Read from public and Corp-known turn-end state; identical in
// both gate arms. Needs observe mode (any collector enables it).
module.exports = {
  name: 'agendaCommitment',
  directions: {
    'agendaCommitment.idleAgendaTurns': 'lower',
    'agendaCommitment.hqHoldTurns': 'lower',
  },
  onEvent(event, game) {
    if (event.type === 'gameStart') game.agendaCommitment = {idleAgendaTurns: 0, hqHoldTurns: 0};
    else if (event.type === 'turnEnd' && event.side === 'corp' && event.agendas) {
      if (event.agendas.idleInstalled > 0) game.agendaCommitment.idleAgendaTurns++;
      if (event.agendas.inHQ > 0 && event.agendas.remoteRoom) game.agendaCommitment.hqHoldTurns++;
    }
  },
  finish(game) { return game.agendaCommitment; },
};
