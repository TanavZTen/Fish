// Database operations

async function save(game) {
  if (!state.code) return;
  try {
    const { data: existingData } = await DB
      .from('games')
      .select('id')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (existingData) {
      await DB.from('games')
        .update({ game_data: game, updated_at: new Date().toISOString() })
        .eq('room_code', state.code);
    } else {
      await DB.from('games')
        .insert({ room_code: state.code, game_data: game, updated_at: new Date().toISOString() });
    }
    
    state.game = game;
    if (state.shouldRender) render();
  } catch (e) {
    console.error(e);
  }
}

async function load() {
  if (!state.code) return;
  
  // Don't poll/render while modal or dropdown is open - prevents interruptions
  if (state.showCallModal || state.showCounterSetModal || state.showPassTurnModal || state.dropdownOpen) {
    return;
  }
  
  try {
    const { data: gameData } = await DB
      .from('games')
      .select('game_data')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (gameData && gameData.game_data) {
      const oldPhase = state.game?.phase;
      const oldTurn = state.game?.currentTurn;
      
      // Store current selections before updating
      const oldSelectedCard = state.selectedCard;
      const oldSelectedOpponent = state.selectedOpponent;
      
      state.game = gameData.game_data;
      
      // Restore selections after update
      state.selectedCard = oldSelectedCard;
      state.selectedOpponent = oldSelectedOpponent;
      
      // CRITICAL: Check if we're still in the game
      const amIInGame = state.game.players.find(p => p.id === myId);
      
      // If we're in the players list, NEVER become a spectator
      if (amIInGame) {
        state.isSpectator = false;
        
        // Keep us in the correct view
        if (state.game.phase === 'lobby') {
          if (state.view !== 'lobby') {
            state.view = 'lobby';
          }
        } else if (state.game.phase === 'game') {
          if (state.view !== 'game') {
            state.view = 'game';
          }
        }
      }
      
      // Handle phase transitions carefully
      if (oldPhase === 'lobby' && state.game.phase === 'game') {
        if (amIInGame) {
          // We're in the players list - definitely join the game
          state.view = 'game';
          state.isSpectator = false;
          
          // Initialize timer if enabled
          if (state.game.settings?.timeLimit > 0) {
            state.turnStartTime = Date.now();
            state.timeRemaining = state.game.settings.timeLimit;
            startTimer();
          }
        }
      }
      
      // If turn changed, reset timer
      if (oldTurn !== state.game.currentTurn && state.game.settings?.timeLimit > 0) {
        state.turnStartTime = Date.now();
        state.timeRemaining = state.game.settings.timeLimit;
        startTimer();
      }
      
      if (state.shouldRender) render();
    }
  } catch (e) {
    console.error(e);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  
  // Poll every 45 seconds to avoid interruptions
  pollInterval = setInterval(load, 5000);
  
  // Immediately load once
  load();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  if (!state.game?.settings?.timeLimit || state.game.settings.timeLimit === 0) {
    return;
  }
  
  // Update timer every second
  timerInterval = setInterval(() => {
    if (!state.turnStartTime) return;
    
    const elapsed = Math.floor((Date.now() - state.turnStartTime) / 1000);
    state.timeRemaining = state.game.settings.timeLimit - elapsed;
    
    // Time's up!
    if (state.timeRemaining <= 0) {
      clearInterval(timerInterval);
      state.timeRemaining = 0;
      
      // Auto-pass turn if it's my turn
      if (state.game.currentTurn === myId) {
        handleTimeExpired();
      }
    }
    
    // ONLY re-render timer if:
    // 1. No modals open
    // 2. No dropdown open
    // 3. Time is running low (< 10 seconds) OR not my turn
    const isMyTurn = state.game?.currentTurn === myId;
    const timeCritical = state.timeRemaining <= 10;
    
    if (state.shouldRender && 
        !state.showCallModal && 
        !state.showCounterSetModal && 
        !state.showPassTurnModal && 
        !state.dropdownOpen &&
        (!isMyTurn || timeCritical)) {
      render();
    }
  }, 1000);
}

async function handleTimeExpired() {
  const game = state.game;
  const me = game.players.find(p => p.id === myId);
  const myTeam = game.teams.team1.includes(myId) ? 'team1' : 'team2';
  
  // Find next player on opposing team
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  const opponents = game.players.filter(p => game.teams[oppTeam].includes(p.id) && p.hand.length > 0);
  
  if (opponents.length > 0) {
    game.currentTurn = opponents[0].id;
    game.log.unshift(`${me.name}'s time expired! Turn passed to ${opponents[0].name}`);
    await save(game);
  }
}
