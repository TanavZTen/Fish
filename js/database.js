// Database Operations
let pollInterval = null;
let heartbeatInterval = null;

async function updateHeartbeat() {
  if (!state.game || !state.code || state.isSpectator) return;
  
  const game = state.game;
  const player = game.players.find(p => p.id === myId);
  if (player) {
    player.lastSeen = Date.now();
    player.disconnected = false;
    
    const { data: existingData } = await DB
      .from('games')
      .select('id')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (existingData) {
      await DB.from('games')
        .update({ game_data: game, updated_at: new Date().toISOString() })
        .eq('room_code', state.code);
    }
    
    state.game = game;
  }
}

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
  try {
    const { data: gameData } = await DB
      .from('games')
      .select('game_data')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (gameData && gameData.game_data) {
      const oldPhase = state.game?.phase;
      state.game = gameData.game_data;
      
      const now = Date.now();
      state.game.players.forEach(p => {
        if (!p.isBot && p.lastSeen && now - p.lastSeen > 15000) {
          p.disconnected = true;
        } else if (!p.isBot) {
          p.disconnected = false;
        }
      });
      
      if (oldPhase === 'lobby' && state.game.phase === 'game') {
        const player = state.game.players.find(p => p.id === myId);
        if (player) {
          state.view = 'game';
          state.isSpectator = false;
        } else {
          state.view = 'spectatorPrompt';
        }
      }
      
      if (state.shouldRender) render();
    }
  } catch (e) {
    console.error(e);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  pollInterval = setInterval(load, 2000);
  if (!state.isSpectator) {
    heartbeatInterval = setInterval(updateHeartbeat, 5000);
    updateHeartbeat();
  }
}
