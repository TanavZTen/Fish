// UI rendering and event handlers

function render() {
  const app = document.getElementById('app');
  
  if (state.view === 'home') {
    renderHome(app);
    return;
  }
  
  if (state.view === 'spectatorPrompt') {
    renderSpectatorPrompt(app);
    return;
  }
  
  if (state.view === 'teamSelect') {
    renderTeamSelect(app);
    return;
  }
  
  if (state.view === 'lobby' && state.game) {
    renderLobby(app);
    return;
  }
  
  if (state.view === 'game' && state.game) {
    if (state.isSpectator) {
      renderSpectatorView(app);
    } else {
      renderGameView(app);
    }
    return;
  }
}

function renderHome(app) {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>LITERATURE</h1>
        <p class="subtitle">9-Set Card Game</p>
        
        <input type="text" placeholder="Your Name" id="name-input" value="${state.name}">
        <button onclick="window.app.createRoom()">Create Room</button>
        
        <div class="divider">- OR -</div>
        
        <input type="text" placeholder="Room Code" id="code-input" value="${state.code}">
        <button onclick="window.app.joinRoom()" class="btn-secondary">Join Room</button>
      </div>
    </div>
  `;
  
  document.getElementById('name-input').oninput = e => state.name = e.target.value;
  document.getElementById('code-input').oninput = e => state.code = e.target.value.toUpperCase();
}

function renderSpectatorPrompt(app) {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 style="text-align:center; margin-bottom:20px;">Game In Progress</h2>
        <p style="text-align:center; color: #8b949e; margin-bottom: 20px;">
          This room has an active game. Would you like to spectate?
        </p>
        
        <button onclick="window.app.becomeSpectator()">Yes, Spectate Game</button>
        <button onclick="window.app.cancel()" class="btn-secondary">No, Go Back</button>
      </div>
    </div>
  `;
}

function renderTeamSelect(app) {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h2 style="text-align:center; margin-bottom:20px;">Choose Your Team</h2>
        
        <button onclick="window.app.confirmTeam('team1')" class="btn-secondary" style="background: #da3633; color: #fff; padding: 20px; margin-bottom: 10px;">
          <div style="font-size: 20px;">Team 1</div>
          <div style="font-size: 12px; margin-top: 4px;">Red Team</div>
        </button>
        
        <button onclick="window.app.confirmTeam('team2')" class="btn-secondary" style="background: #1f6feb; color: #fff; padding: 20px;">
          <div style="font-size: 20px;">Team 2</div>
          <div style="font-size: 12px; margin-top: 4px;">Blue Team</div>
        </button>
        
        <button onclick="window.app.cancel()" class="btn-secondary" style="margin-top: 20px;">Cancel</button>
      </div>
    </div>
  `;
}

function renderLobby(app) {
  const isHost = state.game.hostId === myId;
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1 style="font-size: 36px;">${state.code}</h1>
        <p class="subtitle">Share this code with friends</p>
        <p style="text-align: center; color: ${myTeam === 'team1' ? '#da3633' : '#1f6feb'}; font-weight: 700; margin-bottom: 20px;">
          You're on ${myTeam === 'team1' ? 'Team 1 (Red)' : 'Team 2 (Blue)'}
        </p>
        
        ${isHost ? renderSettings() : ''}
        
        <div class="teams-grid">
          <div class="team-section t1">
            <h3>Team 1 (${state.game.teams.team1.length})</h3>
            ${state.game.players.filter(p => state.game.teams.team1.includes(p.id)).map(p => `
              <div class="team-player ${p.id === myId ? 'you' : ''}">
                <span>${p.name} ${p.id === myId ? '(You)' : ''}</span>
                ${isHost && p.isBot ? `<button class="btn-small" onclick="window.app.removeBot('${p.id}')">Remove</button>` : ''}
              </div>
            `).join('')}
            ${isHost ? `<button onclick="window.app.addBot('team1')" style="margin-top: 8px;">+ Add Bot</button>` : ''}
          </div>
          
          <div class="team-section t2">
            <h3>Team 2 (${state.game.teams.team2.length})</h3>
            ${state.game.players.filter(p => state.game.teams.team2.includes(p.id)).map(p => `
              <div class="team-player ${p.id === myId ? 'you' : ''}">
                <span>${p.name} ${p.id === myId ? '(You)' : ''}</span>
                ${isHost && p.isBot ? `<button class="btn-small" onclick="window.app.removeBot('${p.id}')">Remove</button>` : ''}
              </div>
            `).join('')}
            ${isHost ? `<button onclick="window.app.addBot('team2')" style="margin-top: 8px;">+ Add Bot</button>` : ''}
          </div>
        </div>
        
        ${isHost ? `
          <button onclick="window.app.startGame()" ${state.game.players.length < 4 ? 'disabled' : ''}>
            ${state.game.players.length < 4 ? `Need ${4 - state.game.players.length} more players` : 'Start Game'}
          </button>
        ` : '<p style="text-align: center; color: #8b949e; margin-top: 20px;">Waiting for host to start...</p>'}
      </div>
    </div>
  `;
  
  if (isHost) {
    attachSettingsHandlers();
  }
}

function renderSettings() {
  return `
    <div class="settings">
      <h3 style="margin-bottom: 15px; font-size: 16px;">Game Settings (Host Only)</h3>
      
      <div class="setting-row">
        <label>Show Ask History</label>
        <input type="checkbox" id="show-history" ${state.game.settings?.showHistory ? 'checked' : ''}>
      </div>
      
      ${state.game.settings?.showHistory ? `
      <div class="setting-row">
        <label>Recent asks to show</label>
        <select id="history-count">
          <option value="1" ${state.game.settings?.historyCount === 1 ? 'selected' : ''}>1 card</option>
          <option value="2" ${state.game.settings?.historyCount === 2 ? 'selected' : ''}>2 cards</option>
          <option value="3" ${state.game.settings?.historyCount === 3 ? 'selected' : ''}>3 cards</option>
        </select>
      </div>
      ` : ''}
      
      <div class="setting-row">
        <label>Time Limit per Turn</label>
        <select id="time-limit">
          <option value="0" ${state.game.settings?.timeLimit === 0 ? 'selected' : ''}>No limit</option>
          <option value="60" ${state.game.settings?.timeLimit === 60 ? 'selected' : ''}>1 minute</option>
          <option value="120" ${state.game.settings?.timeLimit === 120 ? 'selected' : ''}>2 minutes</option>
        </select>
      </div>
      
      <div class="setting-row">
        <label>Show Card Counts</label>
        <input type="checkbox" id="show-counts" ${state.game.settings?.showCounts ? 'checked' : ''}>
      </div>
      
      <div class="setting-row">
        <label>Starting Player</label>
        <select id="start-player">
          <option value="random" ${state.startPlayer === 'random' ? 'selected' : ''}>Random Player</option>
          ${state.game.players.map(p => 
            `<option value="${p.id}" ${state.startPlayer === p.id ? 'selected' : ''}>${p.name}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;
}

function attachSettingsHandlers() {
  const histCheck = document.getElementById('show-history');
  const countsCheck = document.getElementById('show-counts');
  const histCountSel = document.getElementById('history-count');
  const timeLimitSel = document.getElementById('time-limit');
  const startPlayerSel = document.getElementById('start-player');
  
  if (histCheck) histCheck.onchange = () => toggleSetting('showHistory');
  if (countsCheck) countsCheck.onchange = () => toggleSetting('showCounts');
  if (histCountSel) histCountSel.onchange = (e) => changeSetting('historyCount', Number(e.target.value));
  if (timeLimitSel) timeLimitSel.onchange = (e) => changeSetting('timeLimit', Number(e.target.value));
  if (startPlayerSel) startPlayerSel.onchange = (e) => { state.startPlayer = e.target.value; };
}

function renderSpectatorView(app) {
  const currentPlayer = state.game.players.find(p => p.id === state.game.currentTurn);
  const viewingPlayer = state.game.players.find(p => p.id === state.spectatingPlayerId) || state.game.players[0];
  const sortedHand = sortHand(viewingPlayer?.hand || []);
  
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="spectator-controls">
          <h3 style="margin-bottom: 10px;">👁️ SPECTATOR MODE</h3>
          <label style="display: block; margin-bottom: 5px; font-weight: 700;">Viewing:</label>
          <select id="spectator-select" style="background: #fff; color: #000;">
            ${state.game.players.map(p => 
              `<option value="${p.id}" ${state.spectatingPlayerId === p.id ? 'selected' : ''}>${p.name} ${state.game.currentTurn === p.id ? '👉' : ''}</option>`
            ).join('')}
          </select>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2>Room ${state.code}</h2>
          <button onclick="window.app.manualRefresh()" class="btn-small" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d;">
            🔄 Refresh
          </button>
        </div>
        <p style="margin: 10px 0;">Scores - Team 1: ${state.game.scores.team1} | Team 2: ${state.game.scores.team2}</p>
        <p style="margin: 10px 0; font-weight: 700; color: #888;">
          ⏳ ${currentPlayer?.name}'s Turn
        </p>
        
        ${renderTeamSidebar()}
        
        <div style="margin-top: 20px;">
          <h3 style="margin-bottom: 10px;">${viewingPlayer.name}'s Hand (${viewingPlayer.hand.length} cards)</h3>
          <div class="game-hand">
            ${sortedHand.map(card => renderCard(card)).join('')}
          </div>
        </div>
        
        ${renderActivityLog()}
        ${renderSetsStatus()}
      </div>
    </div>
  `;
  
  const specSelect = document.getElementById('spectator-select');
  if (specSelect) {
    specSelect.onchange = (e) => {
      state.spectatingPlayerId = e.target.value;
      render();
    };
  }
}

function renderGameView(app) {
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const isMyTurn = state.game.currentTurn === myId;
  const currentPlayer = state.game.players.find(p => p.id === state.game.currentTurn);
  const opponents = state.game.players.filter(p => 
    p.id !== myId && 
    state.game.teams[myTeam === 'team1' ? 'team2' : 'team1'].includes(p.id)
  );
  
  const sortedHand = sortHand(me?.hand || []);
  const askableCards = getAskableCards(me?.hand || []);
  const hasCards = me && me.hand.length > 0;
  
  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const showTimer = state.game.settings?.timeLimit > 0;
  const timerColor = state.timeRemaining <= 10 ? '#f85149' : (state.timeRemaining <= 30 ? '#ffa657' : '#4ade80');
  
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2>Room ${state.code}</h2>
          <button onclick="window.app.manualRefresh()" class="btn-small" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d;">
            🔄 Refresh
          </button>
        </div>
        <p style="margin: 10px 0;">Scores - Team 1: ${state.game.scores.team1} | Team 2: ${state.game.scores.team2}</p>
        <p style="margin: 10px 0; font-weight: 700; color: ${isMyTurn ? '#4ade80' : '#888'};">
          ${isMyTurn ? '🟢 YOUR TURN' : `⏳ ${currentPlayer?.name}'s Turn`}
          ${showTimer && isMyTurn ? `<span style="color: ${timerColor}; margin-left: 10px;">⏱️ ${formatTime(state.timeRemaining)}</span>` : ''}
        </p>
        
        ${renderTeamSidebar()}
        
        <div class="game-layout">
          <div class="left-panel">
            <div>
              <h3 style="margin-bottom: 10px;">Your Hand (${me?.hand?.length || 0} cards)</h3>
              <div class="game-hand">
                ${sortedHand.map(card => renderCard(card)).join('') || '<p style="color: #8b949e;">No cards - You are now a spectator</p>'}
              </div>
            </div>
            
            ${hasCards ? renderPlayerActions(isMyTurn, opponents, askableCards) : renderSpectatorActions()}
            ${renderActivityLog()}
          </div>
          
          <div class="right-panel">
            ${renderSetsStatus()}
          </div>
        </div>
      </div>
    </div>
    
    ${(state.showCallModal || state.showCounterSetModal) ? renderCallModal() : ''}
    ${state.showPassTurnModal ? renderPassTurnModal() : ''}
  `;
  
  attachGameHandlers(opponents, askableCards);
}

function renderPassTurnModal() {
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const teammates = state.game.players.filter(p => 
    state.game.teams[myTeam].includes(p.id) && p.hand.length > 0 && p.id !== myId
  );
  
  return `
    <div class="modal">
      <div class="modal-content" onclick="event.stopPropagation()">
        <h2 style="margin-bottom: 20px;">Pass Turn</h2>
        <p style="color: #8b949e; margin-bottom: 20px;">You have no cards left. Select a teammate to pass the turn to:</p>
        
        <select id="pass-turn-select" style="width: 100%; margin-bottom: 20px;">
          <option value="">-- Select Teammate --</option>
          ${teammates.map(p => 
            `<option value="${p.id}" ${state.selectedPassPlayer === p.id ? 'selected' : ''}>${p.name} (${p.hand.length} cards)</option>`
          ).join('')}
        </select>
        
        <button onclick="window.app.confirmPassTurn()" ${!state.selectedPassPlayer ? 'disabled' : ''} style="width: 100%;">
          Pass Turn
        </button>
      </div>
    </div>
  `;
}

function renderCard(card) {
  const isRed = card.includes('♥') || card.includes('♦');
  return `<div class="game-card ${isRed ? 'red' : 'black'}">${card}</div>`;
}

function renderTeamSidebar() {
  return `
    <div class="game-sidebar">
      <div>
        <h3 style="color: #da3633; margin-bottom: 10px;">Team 1</h3>
        ${state.game.players.filter(p => state.game.teams.team1.includes(p.id)).map(p => renderTeamPlayer(p)).join('')}
      </div>
      
      <div>
        <h3 style="color: #1f6feb; margin-bottom: 10px;">Team 2</h3>
        ${state.game.players.filter(p => state.game.teams.team2.includes(p.id)).map(p => renderTeamPlayer(p)).join('')}
      </div>
    </div>
  `;
}

function renderTeamPlayer(p) {
  const hasCards = p.hand && p.hand.length > 0;
  return `
    <div class="team-player ${p.id === myId ? 'you' : ''} ${p.id === myId && !hasCards ? 'spectator-mode' : ''}">
      <span>
        ${p.name} ${p.id === myId ? '(You)' : ''} ${p.id === myId && !hasCards ? '(Spectator)' : ''}
        ${state.game.settings?.showCounts ? ` (${p.hand.length})` : ''}
      </span>
      ${state.game.currentTurn === p.id ? '<span style="color: #4ade80;">👉</span>' : ''}
    </div>
  `;
}

function renderPlayerActions(isMyTurn, opponents, askableCards) {
  return `
    <div>
      <h3 style="margin-bottom: 10px;">Your Actions</h3>
      
      ${isMyTurn ? `
        <select id="opponent-select" style="margin-bottom: 10px;">
          <option value="">Select Opponent to Ask</option>
          ${opponents.map(p => 
            `<option value="${p.id}" ${state.selectedOpponent === p.id ? 'selected' : ''}>${p.name}</option>`
          ).join('')}
        </select>
        
        <select id="card-select" style="margin-bottom: 10px;">
          <option value="">Select Card to Ask For</option>
          ${askableCards.sort().map(card => 
            `<option value="${card}" ${state.selectedCard === card ? 'selected' : ''}>${card}</option>`
          ).join('')}
        </select>
        
        <button onclick="window.app.askForCard()" ${!state.selectedCard || !state.selectedOpponent ? 'disabled' : ''}>
          Ask for Card
        </button>
      ` : '<p style="color: #8b949e; margin-bottom: 10px;">Waiting for turn...</p>'}
      
      <button onclick="window.app.openCallModal()" class="btn-secondary" style="margin-top: 8px;">
        Call a Set
      </button>
    </div>
  `;
}

function renderSpectatorActions() {
  return `
    <div>
      <button onclick="window.app.openCounterSetModal()" class="btn-secondary">
        Counter Set (Spectator Only)
      </button>
      <p style="color: #8b949e; margin-top: 10px; font-size: 13px;">You have no cards. You can counter-call sets. If correct, your team scores. If wrong, opponent gets it FREE!</p>
    </div>
  `;
}

function renderActivityLog() {
  return `
    <div>
      <h3 style="margin-bottom: 10px;">Recent Activity</h3>
      ${state.game.log?.slice(0, state.game.settings?.historyCount || 2).map(log => 
        `<div style="font-size: 14px; color: #8b949e; margin-bottom: 4px; padding: 8px; background: #0d1117; border-radius: 6px;">${log}</div>`
      ).join('') || '<div style="font-size: 14px; color: #8b949e;">No activity yet</div>'}
    </div>
  `;
}

function renderSetsStatus() {
  return `
    <div class="sets-status">
      <h3 style="margin-bottom: 10px;">Sets Status</h3>
      ${SETS.map((set, i) => `
        <div class="set-item ${state.game.claimedSets?.includes(set.name) ? 'claimed' : ''}">
          <strong>${set.name}</strong> 
          ${state.game.claimedSets?.includes(set.name) ? '<span style="color: #4ade80;">✓ Claimed</span>' : '<span style="color: #8b949e;">Available</span>'}
          <div style="font-size: 12px; color: #8b949e; margin-top: 4px;">${set.cards.join(', ')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCallModal() {
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  
  // For counter set: only show opposing team players
  // For regular call: only show your team players
  const playersToShow = state.showCounterSetModal 
    ? state.game.players.filter(p => state.game.teams[oppTeam].includes(p.id))
    : state.game.players.filter(p => state.game.teams[myTeam].includes(p.id));
  
  // Only show unclaimed sets
  const unclaimedSets = SETS.filter(s => !state.game.claimedSets?.includes(s.name));
  
  // Make sure current callSetIndex is valid (not claimed)
  const currentSet = SETS[state.callSetIndex];
  if (state.game.claimedSets?.includes(currentSet.name) && unclaimedSets.length > 0) {
    state.callSetIndex = SETS.indexOf(unclaimedSets[0]);
  }
  
  return `
    <div class="modal" onclick="if(event.target === this) window.app.${state.showCounterSetModal ? 'closeCounterSetModal' : 'closeCallModal'}()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <h2 style="margin-bottom: 20px;">${state.showCounterSetModal ? 'Counter Set (Risky!)' : 'Call a Set'}</h2>
        ${state.showCounterSetModal ? '<p style="color: #f85149; margin-bottom: 15px; font-size: 14px;">⚠️ If you\'re wrong, the opposing team gets this set for FREE!</p>' : ''}
        
        <div style="margin-bottom: 25px;">
          <label style="display: block; margin-bottom: 10px; color: #8b949e; font-weight: 600;">Select Set:</label>
          <select id="set-select" style="width: 100%;">
            ${unclaimedSets.map((set) => {
              const actualIndex = SETS.indexOf(set);
              return `<option value="${actualIndex}" ${actualIndex === state.callSetIndex ? 'selected' : ''}>${set.name}</option>`;
            }).join('')}
          </select>
          ${unclaimedSets.length === 0 ? '<p style="color: #f85149; margin-top: 10px;">All sets have been claimed!</p>' : ''}
        </div>
        
        <div class="card-assignments-container" style="margin-bottom: 25px;">
          <h3 style="margin-bottom: 15px; font-size: 16px; color: #c9d1d9;">Assign each card to ${state.showCounterSetModal ? 'an opposing player' : 'a teammate'}:</h3>
          ${SETS[state.callSetIndex].cards.map(card => {
            const iHaveIt = me?.hand?.includes(card);
            return `
              <div class="card-assignment-row" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 700; font-size: 15px; color: #ffd700;">${card}</label>
                <select class="card-assign-select" data-card="${card}">
                  <option value="">-- Select who has ${card} --</option>
                  ${playersToShow.map(p => 
                    `<option value="${p.id}" ${state.callAssignments[card] === p.id ? 'selected' : ''}>${p.name}${p.id === myId ? ' (You)' : ''}${iHaveIt && p.id === myId ? ' ✓' : ''}</option>`
                  ).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 30px;">
          <button onclick="window.app.${state.showCounterSetModal ? 'submitCounterSet' : 'submitCall'}()" style="flex: 1; padding: 14px;">
            Submit ${state.showCounterSetModal ? 'Counter Set' : 'Call'}
          </button>
          <button onclick="window.app.${state.showCounterSetModal ? 'closeCounterSetModal' : 'closeCallModal'}()" class="btn-secondary" style="flex: 1; padding: 14px;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachGameHandlers(opponents, askableCards) {
  const oppSelect = document.getElementById('opponent-select');
  const cardSelect = document.getElementById('card-select');
  const setSelect = document.getElementById('set-select');
  const passTurnSelect = document.getElementById('pass-turn-select');
  
  if (oppSelect) {
    // Set initial value from state
    if (state.selectedOpponent) {
      oppSelect.value = state.selectedOpponent;
    }
    
    oppSelect.onchange = (e) => {
      state.selectedOpponent = e.target.value;
      // Don't re-render, just update state
    };
  }
  
  if (cardSelect) {
    // Set initial value from state
    if (state.selectedCard) {
      cardSelect.value = state.selectedCard;
    }
    
    cardSelect.onchange = (e) => {
      state.selectedCard = e.target.value;
      // Don't re-render, just update state
    };
  }
  
  if (passTurnSelect) {
    if (state.selectedPassPlayer) {
      passTurnSelect.value = state.selectedPassPlayer;
    }
    
    passTurnSelect.onchange = (e) => {
      state.selectedPassPlayer = e.target.value;
      // Re-render to enable/disable button
      render();
    };
  }
  
  if (setSelect) {
    setSelect.onchange = (e) => {
      const newIndex = Number(e.target.value);
      const selectedSet = SETS[newIndex];
      
      // Check if this set is already claimed
      if (state.game.claimedSets?.includes(selectedSet.name)) {
        alert('This set has already been claimed! Choose another.');
        // Reset to first unclaimed set
        const unclaimedSets = SETS.filter(s => !state.game.claimedSets?.includes(s.name));
        if (unclaimedSets.length > 0) {
          state.callSetIndex = SETS.indexOf(unclaimedSets[0]);
        }
        render();
        return;
      }
      
      // Save current assignments before switching
      const oldSetName = SETS[state.callSetIndex].name;
      state.allSetAssignments[oldSetName] = {...state.callAssignments};
      
      // Switch to new set
      state.callSetIndex = newIndex;
      
      // Restore assignments for this set if they exist
      const newSetName = SETS[newIndex].name;
      state.callAssignments = state.allSetAssignments[newSetName] || {};
      
      render();
    };
  }
  
  if (state.showCallModal || state.showCounterSetModal) {
    const assignSelects = document.querySelectorAll('.card-assign-select');
    assignSelects.forEach(sel => {
      const card = sel.getAttribute('data-card');
      
      // Restore value if it exists
      if (state.callAssignments[card]) {
        sel.value = state.callAssignments[card];
      }
      
      sel.onchange = (e) => {
        state.callAssignments[card] = e.target.value;
        // Also save to allSetAssignments
        const currentSetName = SETS[state.callSetIndex].name;
        if (!state.allSetAssignments[currentSetName]) {
          state.allSetAssignments[currentSetName] = {};
        }
        state.allSetAssignments[currentSetName][card] = e.target.value;
        // Don't re-render, just update state
      };
    });
  }
}

// Export functions to window.app
window.app = {
  createRoom,
  joinRoom,
  becomeSpectator,
  confirmTeam,
  cancel,
  addBot,
  removeBot,
  startGame,
  askForCard,
  openCallModal,
  openCounterSetModal,
  closeCallModal: () => {
    state.showCallModal = false;
    state.callAssignments = {};
    render();
  },
  closeCounterSetModal: () => {
    state.showCounterSetModal = false;
    state.callAssignments = {};
    render();
  },
  submitCall,
  submitCounterSet,
  confirmPassTurn,
  manualRefresh: async () => {
    await load();
  }
};

// Initialize app
render();
