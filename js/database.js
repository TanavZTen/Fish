// Database operations

async function save(game) {
  if (!state.code) return;
  try {
    await DB.from('games')
      .upsert(
        { room_code: state.code, game_data: game, updated_at: new Date().toISOString() },
        { onConflict: 'room_code' }
      );

    state.game = game;
    if (state.shouldRender) render();
  } catch (e) {
    console.error(e);
  }
}

async function load() {
  if (!state.code) return;
  
  // CRITICAL: Check if ANY select element is focused
  const activeElement = document.activeElement;
  const isSelectFocused = activeElement && activeElement.tagName === 'SELECT';
  const isDropdownOpen = isSelectFocused || activeElement?.hasAttribute('data-dropdown');
  
  // Don't poll/render while modal, dropdown is open, OR any select is focused
  if (state.showCallModal || 
      state.showCounterSetModal || 
      state.showPassTurnModal || 
      state.dropdownOpen || 
      isDropdownOpen) {
    return; // SKIP THIS POLLING CYCLE COMPLETELY
  }
  
  try {
    const { data: gameData, error } = await DB
      .from('games')
      .select('game_data')
      .eq('room_code', state.code)
      .maybeSingle();
    
    if (error) {
      console.error('Database load error:', error);
      return;
    }
    
    if (gameData && gameData.game_data) {
      const oldPhase = state.game?.phase;
      const oldTurn = state.game?.currentTurn;
      const oldHand = state.game?.players.find(p => p.id === myId)?.hand || [];
      const oldSelectedCardIndex = state.selectedCardIndex;
      const oldSelectedCard = state.selectedCard;
      const oldSelectedOpponent = state.selectedOpponent;

      state.game = gameData.game_data;

      // Restore card selection index to prevent flash/jump
      state.selectedCardIndex = oldSelectedCardIndex;

      // ── Reconnect: clear own disconnected flag once per session ────────────
      if (!state.hasMarkedConnected) {
        const me = state.game.players.find(p => p.id === myId);
        if (me?.disconnected) {
          state.hasMarkedConnected = true;
          me.disconnected = false;
          me.lastSeen = Date.now();
          // Save asynchronously without awaiting to avoid blocking render
          DB.from('games')
            .update({ game_data: state.game, updated_at: new Date().toISOString() })
            .eq('room_code', state.code)
            .then(() => {})
            .catch(e => console.error('Reconnect save failed:', e));
        } else if (me) {
          state.hasMarkedConnected = true; // Already connected, no need to save
        }
      }

      // ── Turn stall detection (local, no DB writes) ──────────────────────────
      if (state.game.currentTurn !== state.turnPlayerSince?.playerId) {
        state.turnPlayerSince = { playerId: state.game.currentTurn, since: Date.now() };
      }
      
      // Detect card changes (someone asked you for a card)
      const newHand = state.game.players.find(p => p.id === myId)?.hand || [];
      
      // Only trigger notifications during an active game
      const gameInProgress = state.game.phase === 'game';

      if (oldHand.length > 0 && newHand.length < oldHand.length && gameInProgress) {
        const lostCards = oldHand.filter(card => !newHand.includes(card));

        // Build a card→asker map from recent log entries so each card maps to the right person
        const cardAskerMap = {};
        for (const entry of state.game.log) {
          const m = entry.match(/(.+?) asked .+ for (.+?) - SUCCESS/);
          if (m) cardAskerMap[m[2].trim()] = m[1].trim();
          if (Object.keys(cardAskerMap).length >= lostCards.length * 2) break;
        }

        // Push all notifications to state first, then render once
        lostCards.forEach(card => {
          const asker = cardAskerMap[card] || 'someone';
          state.cardHistory.unshift({ type: 'loss', card, to: asker, timestamp: Date.now() });
          const id = Date.now() + Math.random();
          state.notifications.push({ id, message: `${asker} took ${card} from you!`, type: 'loss', timestamp: Date.now() });
          setTimeout(() => {
            state.notifications = state.notifications.filter(n => n.id !== id);
            if (state.view === 'game') render();
          }, 30000);
        });
      }

      // Detect ALL new ask log entries since last poll for left-side notifications
      if (state.game.settings?.showHistory && state.game.phase === 'game') {
        // Collect every new entry prepended since we last polled
        const newEntries = [];
        for (const entry of state.game.log) {
          if (entry === state.lastSeenLogEntry) break;
          newEntries.push(entry);
        }
        state.lastSeenLogEntry = state.game.log[0] || null;

        const max = state.game.settings?.historyCount || 3;
        // Process oldest-first so newest ends up at top
        for (const entry of newEntries.reverse()) {
          const m = entry.match(/^(.+?) asked (.+?) for (.+?) - (SUCCESS!|FAILED)/);
          if (m) {
            const success = m[4] === 'SUCCESS!';
            const id = Date.now() + Math.random();
            state.askNotifications.unshift({ id, asker: m[1], target: m[2], card: m[3], success });
          }
        }
        state.askNotifications = state.askNotifications.slice(0, max);
      }

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
  state.hasMarkedConnected = false; // Reset so we re-announce on each session start

  // Poll every 2 seconds for fast updates
  pollInterval = setInterval(load, 2000);

  // Immediately load once
  load();
}

// ── Disconnect / Reconnect handling ──────────────────────────────────────────

// Use a keepalive fetch so the request survives page-close
function beaconDisconnect() {
  if (!state.code || !state.game) return;
  const game = JSON.parse(JSON.stringify(state.game));
  const me = game.players.find(p => p.id === myId);
  if (!me) return;
  me.disconnected = true;
  me.lastSeen = Date.now();
  fetch(`${SUPABASE_URL}/rest/v1/games?room_code=eq.${encodeURIComponent(state.code)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ game_data: game }),
    keepalive: true
  });
}

// Mark ourselves reconnected on the first successful poll after returning
async function markReconnected() {
  if (!state.code || !state.game) return;
  try {
    const { data } = await DB.from('games').select('game_data').eq('room_code', state.code).maybeSingle();
    if (!data?.game_data) return;
    const game = data.game_data;
    const me = game.players.find(p => p.id === myId);
    if (me && me.disconnected) {
      me.disconnected = false;
      me.lastSeen = Date.now();
      await DB.from('games').update({ game_data: game, updated_at: new Date().toISOString() }).eq('room_code', state.code);
      state.game = game;
    }
  } catch (e) {
    console.error('Reconnect mark failed:', e);
  }
}

// Page is being closed / refreshed — fire-and-forget disconnect
window.addEventListener('pagehide', beaconDisconnect);

// Tab switched away → mark disconnected; tab back → mark connected
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    beaconDisconnect();
  } else if (state.code && state.game) {
    // Immediately try to clear own disconnected flag
    state.hasMarkedConnected = false;
    markReconnected();
  }
});

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
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  
  // Get opponents with cards
  const opponents = game.players.filter(p => game.teams[oppTeam].includes(p.id) && p.hand.length > 0);
  
  // Scenario 3: No opponents have cards - pass to teammate
  if (opponents.length === 0) {
    const teammates = game.players.filter(p => game.teams[myTeam].includes(p.id) && p.hand.length > 0 && p.id !== myId);
    if (teammates.length > 0) {
      game.currentTurn = teammates[0].id;
      game.log.unshift(`${me.name}'s time expired! No opponents available. Turn passed to ${teammates[0].name}`);
      state.lastSuccessfulAsk = null;
      await save(game);
    }
    return;
  }
  
  // Check if we successfully asked someone this turn
  if (state.lastSuccessfulAsk) {
    // Turn goes to last person we successfully asked
    const lastAsked = game.players.find(p => p.id === state.lastSuccessfulAsk);
    if (lastAsked && lastAsked.hand.length > 0) {
      game.currentTurn = state.lastSuccessfulAsk;
      game.log.unshift(`${me.name}'s time expired! Turn passed to ${lastAsked.name}`);
    } else {
      // Last asked person has no cards, pick random opponent
      const randomIndex = Math.floor(Math.random() * opponents.length);
      game.currentTurn = opponents[randomIndex].id;
      game.log.unshift(`${me.name}'s time expired! Turn passed to ${opponents[randomIndex].name}`);
    }
  } else {
    // Never successfully asked anyone - random opponent
    const randomIndex = Math.floor(Math.random() * opponents.length);
    game.currentTurn = opponents[randomIndex].id;
    game.log.unshift(`${me.name}'s time expired! Turn passed to ${opponents[randomIndex].name}`);
  }
  
  // Clear tracking for next turn
  state.lastSuccessfulAsk = null;
  await save(game);
}
