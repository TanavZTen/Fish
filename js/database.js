// Database operations

async function save(game) {
  if (!state.code) return;
  try {
    // Mark current player as connected when saving
    if (!state.isSpectator) {
      const player = game.players.find(p => p.id === myId);
      if (player) {
        player.disconnected = false;
        player.lastSeen = Date.now();
      }
    }
    
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
  
  // Don't poll/render while modal is open - prevents interruptions
  if (state.showCallModal || state.showCounterSetModal) {
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
      const oldView = state.view;
      
      // Store current selections before updating
      const oldSelectedCard = state.selectedCard;
      const oldSelectedOpponent = state.selectedOpponent;
      
      state.game = gameData.game_data;
      
      // Restore selections after update
      state.selectedCard = oldSelectedCard;
      state.selectedOpponent = oldSelectedOpponent;
      
      // Check if we're still in the game
      const amIInGame = state.game.players.find(p => p.id === myId);
      
      // If phase changed from lobby to game
      if (oldPhase === 'lobby' && state.game.phase === 'game') {
        if (amIInGame) {
          state.view = 'game';
          state.isSpectator = false;
        } else {
          state.view = 'spectatorPrompt';
        }
      }
      
      // Mark ourselves as connected on each load (only if we're actually in the game)
      if (!state.isSpectator && amIInGame) {
        amIInGame.disconnected = false;
        amIInGame.lastSeen = Date.now();
      }
      
      if (state.shouldRender) render();
    }
  } catch (e) {
    console.error(e);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  
  // Poll every 10 seconds (fast enough to see others' moves, slow enough to not interrupt)
  pollInterval = setInterval(load, 10000);
  
  // Immediately load once
  load();
}
