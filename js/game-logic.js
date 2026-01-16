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
      // Rejoin as existing player - update name and mark as connected
      existingPlayer.name = state.name;  // Update name in case it changed
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
    
    // Check if adding this player would exceed limits
    if (!existingPlayer) {
      if (game.players.length >= 16) {
        return alert('Game is full! Maximum 16 players allowed.');
      }
      
      if (game.teams[team].length >= 8) {
        const teamName = team === 'team1' ? 'Team 1' : 'Team 2';
        return alert(`${teamName} is full! Maximum 8 players per team.`);
      }
      
      // Add new player with the name they entered
      game.players.push({ id: myId, name: state.name, hand: [] });
      game.teams[team].push(myId);
      await save(game);
    } else {
      // Player already exists - update their name and team
      existingPlayer.name = state.name;
      
      // Update team if needed
      if (!game.teams[team].includes(myId)) {
        // Check if new team is full
        if (game.teams[team].length >= 8) {
          const teamName = team === 'team1' ? 'Team 1' : 'Team 2';
          return alert(`${teamName} is full! Maximum 8 players per team.`);
        }
        
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
    render(); // Force immediate render to show updated name
    startPolling();
  }
}

async function addBot(team) {
  const game = state.game;
  
  // Check if game is full
  if (game.players.length >= 16) {
    return alert('Cannot add bot. Game is full! Maximum 16 players allowed.');
  }
  
  // Check if team is full
  if (game.teams[team].length >= 8) {
    const teamName = team === 'team1' ? 'Team 1' : 'Team 2';
    return alert(`Cannot add bot. ${teamName} is full! Maximum 8 players per team.`);
  }
  
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
  
  // Validate player count (4-16 players)
  if (game.players.length < 4) {
    return alert(`Need at least 4 players. Currently have ${game.players.length}.`);
  }
  
  if (game.players.length > 16) {
    return alert(`Maximum 16 players allowed. Currently have ${game.players.length}.`);
  }
  
  // Validate teams
  if (game.teams.team1.length === 0 || game.teams.team2.length === 0) {
    return alert('Both teams need at least one player');
  }
  
  // Validate max 8 players per team
  if (game.teams.team1.length > 8) {
    return alert(`Team 1 has ${game.teams.team1.length} players. Maximum 8 players per team.`);
  }
  
  if (game.teams.team2.length > 8) {
    return alert(`Team 2 has ${game.teams.team2.length} players. Maximum 8 players per team.`);
  }
  
  const deck = [];
  SETS.forEach(set => deck.push(...set.cards));
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  // Deal cards - distribute ALL 54 cards FAIRLY between teams
  // Strategy: Alternate giving extra cards between teams to ensure balance
  const cardsPerPlayer = Math.floor(deck.length / game.players.length);
  const remainder = deck.length % game.players.length;
  
  // Create alternating order: T1, T2, T1, T2, T1, T2...
  const team1Players = game.players.filter(p => game.teams.team1.includes(p.id));
  const team2Players = game.players.filter(p => game.teams.team2.includes(p.id));
  const alternatingPlayers = [];
  const maxTeamSize = Math.max(team1Players.length, team2Players.length);
  
  for (let i = 0; i < maxTeamSize; i++) {
    if (i < team1Players.length) alternatingPlayers.push(team1Players[i]);
    if (i < team2Players.length) alternatingPlayers.push(team2Players[i]);
  }
  
  // Deal cards to alternating players
  let cardIndex = 0;
  alternatingPlayers.forEach((p, i) => {
    // First 'remainder' players get one extra card
    // This way extra cards are distributed fairly between teams
    const numCards = i < remainder ? cardsPerPlayer + 1 : cardsPerPlayer;
    p.hand = deck.slice(cardIndex, cardIndex + numCards);
    cardIndex += numCards;
  });
  
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
  // Get filtered askable cards (only from selected set)
  const me = state.game.players.find(p => p.id === myId);
  const askableCards = getFilteredAskableCards(me?.hand || []);
  
  if (askableCards.length === 0) {
    return alert('You have no cards in this set to ask for. Try a different set.');
  }
  
  const selectedCard = askableCards[state.selectedCardIndex % askableCards.length];
  
  if (!selectedCard || !state.selectedOpponent) {
    return alert('Select an opponent to ask');
  }
  
  state.shouldRender = false;
  
  const game = state.game;
  const opponent = game.players.find(p => p.id === state.selectedOpponent);
  
  const hasCard = opponent.hand.includes(selectedCard);
  
  if (hasCard) {
    opponent.hand = opponent.hand.filter(c => c !== selectedCard);
    me.hand.push(selectedCard);
    game.log.unshift(`${me.name} asked ${opponent.name} for ${selectedCard} - SUCCESS!`);
    
    // Track card history
    state.cardHistory.unshift({
      type: 'gain',
      card: selectedCard,
      from: opponent.name,
      timestamp: Date.now()
    });
    
    // Show big notification
    addNotification(`You gained ${selectedCard} from ${opponent.name}!`);
    
    // Track who we successfully asked (for timer expiry)
    state.lastSuccessfulAsk = opponent.id;
    
    // Reset timer on successful ask since you get to go again
    if (game.settings.timeLimit > 0) {
      state.turnStartTime = Date.now();
      state.timeRemaining = game.settings.timeLimit;
    }
    
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
    game.log.unshift(`${me.name} asked ${opponent.name} for ${selectedCard} - FAILED`);
    
    // Clear last successful ask since turn is changing
    state.lastSuccessfulAsk = null;
    
    // Reset timer for new turn
    if (game.settings.timeLimit > 0) {
      state.turnStartTime = Date.now();
      state.timeRemaining = game.settings.timeLimit;
    }
  }
  
  // Reset card selection index for next turn
  state.selectedCardIndex = 0;
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
    
    // DON'T change turn - calling a set doesn't steal the turn
    // Turn only changes if current turn holder runs out of cards
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
  
  // IMPORTANT: Check for win condition FIRST before pass turn logic
  const gameEnded = game.scores.team1 >= 5 || game.scores.team2 >= 5;
  
  if (gameEnded) {
    const winner = game.scores.team1 >= 5 ? 'Team 1' : 'Team 2';
    
    state.showCallModal = false;
    state.callAssignments = {};
    state.allSetAssignments = {};
    await save(game);
    
    setTimeout(() => {
      const goToLobby = confirm(`Game Over!\n\n${winner} wins ${game.scores.team1}-${game.scores.team2}!\n\nClick OK to return to lobby, or Cancel to view final state.`);
      
      if (goToLobby) {
        // Reset game back to lobby
        game.phase = 'lobby';
        game.scores = { team1: 0, team2: 0 };
        game.claimedSets = [];
        game.log = ['Returned to lobby. Ready for new game!'];
        game.currentTurn = '';
        
        // Reset all player hands
        game.players.forEach(p => p.hand = []);
        
        save(game);
        state.view = 'lobby';
        render();
      }
    }, 500);
    return;
  }
  
  // Find who has the current turn
  const currentTurnPlayer = game.players.find(p => p.id === game.currentTurn);
  const currentTurnTeam = game.teams.team1.includes(game.currentTurn) ? 'team1' : 'team2';
  
  // Check if the current turn holder has no cards left (regardless of who called the set)
  if (currentTurnPlayer && currentTurnPlayer.hand.length === 0) {
    const currentTurnTeammates = game.players.filter(p => 
      game.teams[currentTurnTeam].includes(p.id) && p.hand.length > 0 && p.id !== game.currentTurn
    );
    
    if (currentTurnTeammates.length > 0) {
      // Current turn player has no cards, they need to pass
      // If I'M the current turn player, show ME the modal
      if (game.currentTurn === myId) {
        state.showCallModal = false;
        state.callAssignments = {};
        state.allSetAssignments = {};
        await save(game);
        
        // Show pass turn modal for ME to choose
        state.showPassTurnModal = true;
        render();
        return;
      }
      // If I'm NOT the current turn player, just close the modal and save
      else {
        state.showCallModal = false;
        state.callAssignments = {};
        state.allSetAssignments = {};
        await save(game);
        return;
      }
    }
  }
  
  state.showCallModal = false;
  state.callAssignments = {};
  state.allSetAssignments = {};
  await save(game);
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
  
  // Check if either team has reached 5 sets (winning condition)
  if (game.scores.team1 >= 5 || game.scores.team2 >= 5) {
    const winner = game.scores.team1 >= 5 ? 'Team 1' : 'Team 2';
    
    setTimeout(() => {
      const goToLobby = confirm(`Game Over!\n\n${winner} wins ${game.scores.team1}-${game.scores.team2}!\n\nClick OK to return to lobby, or Cancel to view final state.`);
      
      if (goToLobby) {
        // Reset game back to lobby
        game.phase = 'lobby';
        game.scores = { team1: 0, team2: 0 };
        game.claimedSets = [];
        game.log = ['Returned to lobby. Ready for new game!'];
        game.currentTurn = '';
        
        // Reset all player hands
        game.players.forEach(p => p.hand = []);
        
        save(game);
        state.view = 'lobby';
        render();
      }
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
  state.lastSuccessfulAsk = null;  // Clear for new turn
  
  await save(game);
  
  // Restart timer if enabled
  if (game.settings.timeLimit > 0) {
    startTimer();
  }
}

// Notification system for card gains/losses
function addNotification(message, type = 'gain') {
  const id = Date.now() + Math.random();
  state.notifications.push({ id, message, type, timestamp: Date.now() });
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    state.notifications = state.notifications.filter(n => n.id !== id);
    if (state.view === 'game') render();
  }, 30000);
  
  if (state.view === 'game') render();
}

function toggleHistoryModal() {
  state.showHistoryModal = !state.showHistoryModal;
  render();
}

function nextCard() {
  const me = state.game?.players.find(p => p.id === myId);
  const askableCards = getFilteredAskableCards(me?.hand || []);
  if (askableCards.length > 0) {
    state.selectedCardIndex = (state.selectedCardIndex + 1) % askableCards.length;
    render();
  }
}

function previousCard() {
  const me = state.game?.players.find(p => p.id === myId);
  const askableCards = getFilteredAskableCards(me?.hand || []);
  if (askableCards.length > 0) {
    state.selectedCardIndex = (state.selectedCardIndex - 1 + askableCards.length) % askableCards.length;
    render();
  }
}

// Get askable cards filtered by selected set group
function getFilteredAskableCards(hand) {
  const askableCards = getAskableCards(hand);
  const selectedSet = SET_GROUPS[state.selectedSetIndex];
  
  // Filter to only cards in the selected set group
  return askableCards.filter(card => selectedSet.cards.includes(card));
}

function changeSetGroup(direction) {
  if (direction === 'next') {
    state.selectedSetIndex = (state.selectedSetIndex + 1) % SET_GROUPS.length;
  } else {
    state.selectedSetIndex = (state.selectedSetIndex - 1 + SET_GROUPS.length) % SET_GROUPS.length;
  }
  state.selectedCardIndex = 0; // Reset card index when changing sets
  render();
}
