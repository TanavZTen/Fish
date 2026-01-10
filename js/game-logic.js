// Game logic functions

function getSetForCard(card) {
  return SETS.find(s => s.cards.includes(card));
}

function sortHand(hand) {
  const grouped = {};
  hand.forEach(card => {
    const set = getSetForCard(card);
    if (set) {
      if (!grouped[set.name]) grouped[set.name] = [];
      grouped[set.name].push(card);
    }
  });
  
  const sorted = [];
  Object.keys(grouped).forEach(setName => {
    const set = SETS.find(s => s.name === setName);
    grouped[setName].sort((a, b) => set.cards.indexOf(a) - set.cards.indexOf(b));
    sorted.push(...grouped[setName]);
  });
  
  return sorted;
}

function getAskableCards(myHand) {
  const askable = [];
  myHand.forEach(card => {
    const set = getSetForCard(card);
    if (set) {
      set.cards.forEach(c => {
        if (!myHand.includes(c) && !askable.includes(c)) {
          askable.push(c);
        }
      });
    }
  });
  return askable;
}

function createRoom() {
  if (!state.name.trim()) return alert('Enter your name');
  state.code = Math.random().toString(36).substring(2, 8).toUpperCase();
  state.view = 'teamSelect';
  render();
}

async function joinRoom() {
  if (!state.name.trim() || !state.code.trim()) return alert('Enter name and room code');
  
  state.code = state.code.toUpperCase().trim();
  
  try {
    const { data: roomData } = await DB
      .from('games')
      .select('game_data')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (!roomData) return alert('Room not found!');
    
    state.game = roomData.game_data;
    
    const existingPlayer = state.game.players.find(p => p.id === myId);
    
    if (existingPlayer) {
      // Rejoin as existing player
      existingPlayer.lastSeen = Date.now();
      existingPlayer.disconnected = false;
      await save(state.game);
      state.view = state.game.phase === 'game' ? 'game' : 'lobby';
      state.isSpectator = false;
      render();
      startPolling();
    } else if (state.game.phase === 'game') {
      // Game already started, offer spectator mode
      state.view = 'spectatorPrompt';
      render();
    } else {
      // New player joining lobby
      state.view = 'teamSelect';
      render();
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

function becomeSpectator() {
  state.isSpectator = true;
  state.spectatingPlayerId = state.game.players[0]?.id || null;
  state.view = 'game';
  startPolling();
  render();
}

async function confirmTeam(team) {
  state.team = team;
  
  if (!state.game) {
    // Creating new game
    const game = {
      hostId: myId,
      phase: 'lobby',
      players: [{ id: myId, name: state.name, hand: [] }],
      teams: { team1: [], team2: [] },
      currentTurn: '',
      scores: { team1: 0, team2: 0 },
      claimedSets: [],
      log: [],
      settings: { 
        showHistory: true,
        historyCount: 2,
        timeLimit: 0,
        showCounts: false
      }
    };
    game.teams[team].push(myId);
    await save(game);
    state.view = 'lobby';
    state.isSpectator = false;
    startPolling();
  } else {
    // Joining existing game
    const game = state.game;
    const existingPlayer = game.players.find(p => p.id === myId);
    
    if (!existingPlayer) {
      // Add new player
      game.players.push({ id: myId, name: state.name, hand: [] });
      game.teams[team].push(myId);
      await save(game);
    } else {
      // Player already exists
      // Update name in case it changed
      existingPlayer.name = state.name;
      
      // Update team if needed
      if (!game.teams[team].includes(myId)) {
        // Remove from old team
        game.teams.team1 = game.teams.team1.filter(id => id !== myId);
        game.teams.team2 = game.teams.team2.filter(id => id !== myId);
        // Add to new team
        game.teams[team].push(myId);
      }
      await save(game);
    }
    state.view = 'lobby';
    state.isSpectator = false;
    startPolling();
  }
}

async function addBot(team) {
  const game = state.game;
  let n = 1;
  while (game.players.some(p => p.name === `Bot ${n}`)) n++;
  const bot = { id: `bot-${Date.now()}`, name: `Bot ${n}`, hand: [], isBot: true };
  game.players.push(bot);
  game.teams[team].push(bot.id);
  await save(game);
}

async function removeBot(id) {
  const game = state.game;
  game.players = game.players.filter(p => p.id !== id);
  game.teams.team1 = game.teams.team1.filter(i => i !== id);
  game.teams.team2 = game.teams.team2.filter(i => i !== id);
  await save(game);
}

async function toggleSetting(key) {
  const game = state.game;
  if (!game.settings) game.settings = {};
  game.settings[key] = !game.settings[key];
  await save(game);
}

async function changeSetting(key, value) {
  const game = state.game;
  if (!game.settings) game.settings = {};
  game.settings[key] = value;
  await save(game);
}

async function startGame() {
  const game = state.game;
  
  if (game.players.length < 4) {
    return alert(`Need at least 4 players. Currently have ${game.players.length}.`);
  }
  
  if (game.teams.team1.length === 0 || game.teams.team2.length === 0) {
    return alert('Both teams need at least one player');
  }
  
  const deck = [];
  SETS.forEach(set => deck.push(...set.cards));
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  // Deal cards
  const per = Math.floor(deck.length / game.players.length);
  game.players.forEach((p, i) => p.hand = deck.slice(i * per, (i + 1) * per));
  game.phase = 'game';
  
  // Set starting player
  if (state.startPlayer === 'random') {
    const randomIndex = Math.floor(Math.random() * game.players.length);
    game.currentTurn = game.players[randomIndex].id;
  } else {
    game.currentTurn = state.startPlayer;
  }
  
  game.log.unshift('Game started!');
  
  // Initialize turn timer
  if (game.settings.timeLimit > 0) {
    state.turnStartTime = Date.now();
    state.timeRemaining = game.settings.timeLimit;
  }
  
  await save(game);
  state.view = 'game';
  
  // Start timer if enabled
  if (game.settings.timeLimit > 0) {
    startTimer();
  }
  
  render();
}

async function askForCard() {
  if (!state.selectedCard || !state.selectedOpponent) {
    return alert('Select a card and opponent');
  }
  
  state.shouldRender = false;
  
  const game = state.game;
  const opponent = game.players.find(p => p.id === state.selectedOpponent);
  const me = game.players.find(p => p.id === myId);
  
  const hasCard = opponent.hand.includes(state.selectedCard);
  
  if (hasCard) {
    opponent.hand = opponent.hand.filter(c => c !== state.selectedCard);
    me.hand.push(state.selectedCard);
    game.log.unshift(`${me.name} asked ${opponent.name} for ${state.selectedCard} - SUCCESS!`);
    
    if (me.hand.length === 0) {
      const myTeam = game.teams.team1.includes(myId) ? 'team1' : 'team2';
      const teammates = game.players.filter(p => 
        game.teams[myTeam].includes(p.id) && p.hand.length > 0 && p.id !== myId
      );
      if (teammates.length > 0) {
        game.currentTurn = teammates[0].id;
        
        // Reset timer for new turn
        if (game.settings.timeLimit > 0) {
          state.turnStartTime = Date.now();
          state.timeRemaining = game.settings.timeLimit;
        }
      }
    }
  } else {
    game.currentTurn = opponent.id;
    game.log.unshift(`${me.name} asked ${opponent.name} for ${state.selectedCard} - FAILED`);
    
    // Reset timer for new turn
    if (game.settings.timeLimit > 0) {
      state.turnStartTime = Date.now();
      state.timeRemaining = game.settings.timeLimit;
    }
  }
  
  state.selectedCard = '';
  state.selectedOpponent = '';
  
  await save(game);
  
  state.shouldRender = true;
  
  // Restart timer if enabled
  if (game.settings.timeLimit > 0) {
    startTimer();
  }
  
  render();
}

function openCallModal() {
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const teammates = state.game.players.filter(p => state.game.teams[myTeam].includes(p.id));
  const teamHasCards = teammates.some(p => p.hand.length > 0);
  
  if (!teamHasCards) {
    return alert('Your team has no cards left! Cannot call a set.');
  }
  
  state.showCallModal = true;
  const unclaimedSets = SETS.filter(s => !state.game.claimedSets?.includes(s.name));
  state.callSetIndex = unclaimedSets.length > 0 ? SETS.indexOf(unclaimedSets[0]) : 0;
  state.callAssignments = {};
  render();
}

function openCounterSetModal() {
  state.showCounterSetModal = true;
  const unclaimedSets = SETS.filter(s => !state.game.claimedSets?.includes(s.name));
  state.callSetIndex = unclaimedSets.length > 0 ? SETS.indexOf(unclaimedSets[0]) : 0;
  state.callAssignments = {};
  render();
}

async function submitCall() {
  const game = state.game;
  const set = SETS[state.callSetIndex];
  const me = game.players.find(p => p.id === myId);
  const myTeam = game.teams.team1.includes(myId) ? 'team1' : 'team2';
  
  if (Object.keys(state.callAssignments).length !== set.cards.length) {
    return alert('You must assign all cards in the set!');
  }
  
  let correct = true;
  set.cards.forEach(card => {
    const actualHolder = game.players.find(p => p.hand.includes(card));
    if (!actualHolder || state.callAssignments[card] !== actualHolder.id) {
      correct = false;
    }
  });
  
  if (correct) {
    game.scores[myTeam]++;
    game.claimedSets.push(set.name);
    game.log.unshift(`${me.name} correctly called ${set.name}! ${myTeam === 'team1' ? 'Team 1' : 'Team 2'} scores!`);
  } else {
    const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
    game.scores[oppTeam]++;
    game.claimedSets.push(set.name);
    game.log.unshift(`${me.name} INCORRECTLY called ${set.name}! ${oppTeam === 'team1' ? 'Team 1' : 'Team 2'} gets the set!`);
  }
  
  // Remove cards from all players
  set.cards.forEach(card => {
    game.players.forEach(p => {
      p.hand = p.hand.filter(c => c !== card);
    });
  });
  
  // Check if current player has no cards and it's their turn
  if (game.currentTurn === myId && me.hand.length === 0) {
    const teammates = game.players.filter(p => 
      game.teams[myTeam].includes(p.id) && p.hand.length > 0 && p.id !== myId
    );
    
    if (teammates.length > 0) {
      // Show pass turn modal
      state.showCallModal = false;
      state.callAssignments = {};
      state.allSetAssignments = {};
      await save(game);
      
      // Show pass turn selection
      state.showPassTurnModal = true;
      render();
      return;
    }
  }
  
  state.showCallModal = false;
  state.callAssignments = {};
  state.allSetAssignments = {};
  await save(game);
  
  if (game.claimedSets.length === 9) {
    setTimeout(() => {
      const winner = game.scores.team1 > game.scores.team2 ? 'Team 1' : 'Team 2';
      alert(`Game Over! ${winner} wins ${game.scores.team1}-${game.scores.team2}!`);
    }, 500);
  }
}

async function submitCounterSet() {
  const game = state.game;
  const set = SETS[state.callSetIndex];
  const me = game.players.find(p => p.id === myId);
  const myTeam = game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  
  if (Object.keys(state.callAssignments).length !== set.cards.length) {
    return alert('You must assign all cards in the set!');
  }
  
  let correct = true;
  set.cards.forEach(card => {
    const actualHolder = game.players.find(p => p.hand.includes(card));
    if (!actualHolder || state.callAssignments[card] !== actualHolder.id) {
      correct = false;
    }
  });
  
  if (correct) {
    game.scores[myTeam]++;
    game.claimedSets.push(set.name);
    game.log.unshift(`${me.name} COUNTER SET correct on ${set.name}! ${myTeam === 'team1' ? 'Team 1' : 'Team 2'} scores!`);
  } else {
    game.scores[oppTeam]++;
    game.claimedSets.push(set.name);
    game.log.unshift(`${me.name} COUNTER SET wrong on ${set.name}! ${oppTeam === 'team1' ? 'Team 1' : 'Team 2'} gets it FREE!`);
  }
  
  set.cards.forEach(card => {
    game.players.forEach(p => {
      p.hand = p.hand.filter(c => c !== card);
    });
  });
  
  state.showCounterSetModal = false;
  state.callAssignments = {};
  await save(game);
  
  if (game.claimedSets.length === 9) {
    setTimeout(() => {
      const winner = game.scores.team1 > game.scores.team2 ? 'Team 1' : 'Team 2';
      alert(`Game Over! ${winner} wins ${game.scores.team1}-${game.scores.team2}!`);
    }, 500);
  }
}

function cancel() {
  state.view = 'home';
  state.code = '';
  state.game = null;
  state.isSpectator = false;
  if (pollInterval) clearInterval(pollInterval);
  render();
}

async function confirmPassTurn() {
  if (!state.selectedPassPlayer) return;
  
  const game = state.game;
  game.currentTurn = state.selectedPassPlayer;
  
  const passer = game.players.find(p => p.id === myId);
  const receiver = game.players.find(p => p.id === state.selectedPassPlayer);
  game.log.unshift(`${passer.name} passed turn to ${receiver.name}`);
  
  // Reset timer for new turn
  if (game.settings.timeLimit > 0) {
    state.turnStartTime = Date.now();
    state.timeRemaining = game.settings.timeLimit;
  }
  
  state.showPassTurnModal = false;
  state.selectedPassPlayer = '';
  
  await save(game);
  
  // Restart timer if enabled
  if (game.settings.timeLimit > 0) {
    startTimer();
  }
}
