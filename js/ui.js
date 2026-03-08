// UI rendering and event handlers

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function render() {
  try {
    const app = document.getElementById('app');
    if (!app) {
      console.error('App element not found');
      return;
    }

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
      if (state.game.phase === 'gameOver') {
        renderGameOver(app);
      } else if (state.isSpectator) {
        renderSpectatorView(app);
      } else {
        renderGameView(app);
      }
      return;
    }
  } catch (error) {
    console.error('Render error:', error);
  }
}

function renderGameOver(app) {
  const game = state.game;
  const totalPlayers = game.players.length;
  const replayVotes = game.replayVotes || {};
  const votedYes = Object.values(replayVotes).filter(v => v === true).length;
  const votedNo = Object.values(replayVotes).filter(v => v === false).length;
  const notVoted = totalPlayers - Object.keys(replayVotes).length;
  const myVote = replayVotes[myId];
  
  app.innerHTML = `
    <div class="poker-room-bg"></div>
    <div class="container" style="max-width: 900px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, rgba(18, 18, 18, 0.95), rgba(13, 27, 26, 0.95)); border: 2px solid rgba(212, 175, 55, 0.4); border-radius: 20px; padding: 48px; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);">
        
        <div style="font-size: 72px; margin-bottom: 24px;">🏆</div>
        
        <h1 style="font-size: 48px; font-weight: 700; color: var(--gold); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
          Game Over!
        </h1>
        
        <h2 style="font-size: 32px; font-weight: 600; color: var(--gold-light); margin-bottom: 32px;">
          ${game.winner} Wins!
        </h2>
        
        <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 48px; padding: 32px; background: rgba(0, 0, 0, 0.4); border-radius: 12px;">
          <div>
            <div style="font-size: 14px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px;">Team 1</div>
            <div style="font-size: 48px; font-weight: 700; color: ${game.finalScores.team1 >= 5 ? 'var(--gold)' : '#8b949e'};">${game.finalScores.team1}</div>
          </div>
          <div style="font-size: 48px; color: #8b949e;">-</div>
          <div>
            <div style="font-size: 14px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px;">Team 2</div>
            <div style="font-size: 48px; font-weight: 700; color: ${game.finalScores.team2 >= 5 ? 'var(--gold)' : '#8b949e'};">${game.finalScores.team2}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 32px;">
          <h3 style="font-size: 18px; font-weight: 700; color: var(--gold); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.15em;">
            🔄 Replay Vote
          </h3>
          
          <div style="background: rgba(26, 71, 42, 0.3); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <div style="font-size: 14px; color: #c9d1d9; margin-bottom: 16px;">
              ${votedYes} / ${totalPlayers} players want to replay
            </div>
            
            <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 16px;">
              <div style="background: rgba(74, 222, 128, 0.2); padding: 12px 20px; border-radius: 8px; border: 1px solid #4ade80;">
                <span style="color: #4ade80; font-weight: 700;">✓ Yes: ${votedYes}</span>
              </div>
              <div style="background: rgba(248, 81, 73, 0.2); padding: 12px 20px; border-radius: 8px; border: 1px solid #f85149;">
                <span style="color: #f85149; font-weight: 700;">✗ No: ${votedNo}</span>
              </div>
              <div style="background: rgba(139, 148, 158, 0.2); padding: 12px 20px; border-radius: 8px; border: 1px solid #8b949e;">
                <span style="color: #8b949e; font-weight: 700;">? Not voted: ${notVoted}</span>
              </div>
            </div>
            
            ${votedYes === totalPlayers ? `
              <div style="font-size: 16px; color: #4ade80; font-weight: 700; margin-top: 16px;">
                🎉 All players voted yes! Returning to lobby...
              </div>
            ` : ''}
          </div>
          
          ${myVote === undefined ? `
            <div style="display: flex; justify-content: center; gap: 16px;">
              <button onclick="window.app.voteReplay(true)" class="btn-gold" style="padding: 16px 48px; font-size: 16px;">
                ✓ Yes, Replay
              </button>
              <button onclick="window.app.voteReplay(false)" class="btn-secondary" style="padding: 16px 48px; font-size: 16px;">
                ✗ No Thanks
              </button>
            </div>
          ` : `
            <div style="font-size: 16px; color: ${myVote ? '#4ade80' : '#f85149'}; font-weight: 700;">
              You voted: ${myVote ? '✓ Yes' : '✗ No'}
            </div>
            <button onclick="window.app.voteReplay(${!myVote})" style="margin-top: 12px; padding: 10px 24px; background: rgba(139, 148, 158, 0.2); border: 1px solid #8b949e; color: #c9d1d9; border-radius: 6px; cursor: pointer;">
              Change Vote
            </button>
          `}
        </div>
        
        <div style="padding-top: 24px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
          <p style="font-size: 13px; color: #8b949e;">
            All players must vote "Yes" to replay. Otherwise, you can leave to start a new game.
          </p>
        </div>
      </div>
    </div>
  `;
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
            <h3>Team 1 (${state.game.teams.team1.length}/8)</h3>
            ${state.game.players.filter(p => state.game.teams.team1.includes(p.id)).map(p => `
              <div class="team-player ${p.id === myId ? 'you' : ''} ${p.disconnected ? 'disconnected' : ''}">
                <span>${p.name} ${p.id === myId ? '(You)' : ''} ${p.disconnected ? '(DC)' : ''}</span>
                ${isHost && p.isBot ? `<button class="btn-small" onclick="window.app.removeBot('${p.id}')">Remove</button>` : ''}
              </div>
            `).join('')}
            ${isHost ? `<button onclick="window.app.addBot('team1')" style="margin-top: 8px;" ${state.game.teams.team1.length >= 8 || state.game.players.length >= 16 ? 'disabled' : ''}>+ Add Bot${state.game.teams.team1.length >= 8 ? ' (Full)' : ''}</button>` : ''}
          </div>
          
          <div class="team-section t2">
            <h3>Team 2 (${state.game.teams.team2.length}/8)</h3>
            ${state.game.players.filter(p => state.game.teams.team2.includes(p.id)).map(p => `
              <div class="team-player ${p.id === myId ? 'you' : ''} ${p.disconnected ? 'disconnected' : ''}">
                <span>${p.name} ${p.id === myId ? '(You)' : ''} ${p.disconnected ? '(DC)' : ''}</span>
                ${isHost && p.isBot ? `<button class="btn-small" onclick="window.app.removeBot('${p.id}')">Remove</button>` : ''}
              </div>
            `).join('')}
            ${isHost ? `<button onclick="window.app.addBot('team2')" style="margin-top: 8px;" ${state.game.teams.team2.length >= 8 || state.game.players.length >= 16 ? 'disabled' : ''}>+ Add Bot${state.game.teams.team2.length >= 8 ? ' (Full)' : ''}</button>` : ''}
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
          <button onclick="window.app.toggleHistoryModal()" class="btn-small" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d;">
            📜 Card History
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
  // Only show opponents who have cards (can't ask someone with 0 cards)
  const opponents = state.game.players.filter(p => 
    p.id !== myId && 
    state.game.teams[myTeam === 'team1' ? 'team2' : 'team1'].includes(p.id) &&
    p.hand.length > 0  // Only show opponents with cards
  );
  
  const sortedHand = sortHand(me?.hand || []);
  const askableCards = getAskableCards(me?.hand || []);
  const hasCards = me && me.hand.length > 0;
  
  app.innerHTML = `
    <div class="container">
      <div class="card">
        ${renderScoreboard(isMyTurn, currentPlayer)}

        ${renderDisconnectBanner()}

        ${renderTeamSidebar()}

        <div class="activity-strip">
          ${renderLastAsk()}
          ${renderRecentActivity()}
        </div>

        <div style="display: flex; justify-content: center; margin: 12px 0 20px;">
          <button onclick="window.app.toggleHistoryModal()" class="btn-history">📜 Card History</button>
        </div>

        <div class="game-layout">
          <div class="left-panel">
            <div>
              <h3 style="margin-bottom: 10px;">Your Hand (${me?.hand?.length || 0} cards)</h3>
              <div class="game-hand">
                ${sortedHand.map(card => renderCard(card)).join('') || '<p style="color: #8b949e;">No cards - You are now a spectator</p>'}
              </div>
            </div>
            
            ${hasCards ? renderPlayerActions(isMyTurn, opponents, askableCards) : renderSpectatorActions()}
          </div>
          
          <div class="right-panel">
            ${renderSetsStatus()}
          </div>
        </div>
      </div>
    </div>
    
    ${renderNotifications()}
    ${(state.showCallModal || state.showCounterSetModal) ? renderCallModal() : ''}
    ${state.showPassTurnModal ? renderPassTurnModal() : ''}
    ${state.showHistoryModal ? renderHistoryModal() : ''}
  `;
  
  attachGameHandlers(opponents);
}

function renderCard(card) {
  const imageSrc = CARD_IMAGES[card] || '';
  if (!imageSrc) {
    // Fallback if card not in mapping
    return `<div class="game-card" style="background: #21262d; color: #c9d1d9; padding: 10px; border: 2px solid #30363d; border-radius: 8px; min-width: 60px; text-align: center;">${card}</div>`;
  }
  return `<img src="${imageSrc}" class="card-image" alt="${card}" title="${card}" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=\\'game-card\\'>${card}</div>');">`;
}

// Parse the most recent ask log entry into structured data
function parseLastAsk() {
  const log = state.game.log || [];
  for (const entry of log) {
    const m = entry.match(/^(.+?) asked (.+?) for (.+?) - (SUCCESS|FAILED)!/);
    if (m) return { asker: m[1], target: m[2], card: m[3], success: m[4] === 'SUCCESS' };
  }
  return null;
}

function renderScoreboard(isMyTurn, currentPlayer) {
  const s1 = state.game.scores.team1;
  const s2 = state.game.scores.team2;
  const t1Leading = s1 > s2;
  const t2Leading = s2 > s1;
  const tied = s1 === s2;
  const lastAsk = parseLastAsk();
  const timer = state.game.settings?.timeLimit > 0
    ? `<span class="turn-timer ${state.timeRemaining <= 10 ? 'critical' : ''}">⏱ ${formatTime(Math.max(0, state.timeRemaining))}</span>`
    : '';

  return `
    <div class="scoreboard-wrap">

      <!-- Room header row -->
      <div class="scoreboard-topbar">
        <span class="room-code-label">ROOM <strong>${state.code}</strong></span>
      </div>

      <!-- Scores -->
      <div class="scoreboard-scores">
        <div class="score-block ${t1Leading ? 'leading' : ''} team1-block">
          <div class="score-team-name" style="color:#e05555;">TEAM 1</div>
          <div class="score-digits ${t1Leading ? 'score-leading' : ''}">${s1}</div>
          <div class="score-sub">${9 - s1} left</div>
        </div>

        <div class="score-vs-col">
          <div class="score-vs-text">VS</div>
          <div class="score-status ${tied ? 'tied' : t1Leading ? 'team1-up' : 'team2-up'}">
            ${tied && s1 === 0 ? 'FIRST TO 5 SETS' : tied ? 'TIED' : t1Leading ? 'TEAM 1 LEADS' : 'TEAM 2 LEADS'}
          </div>
        </div>

        <div class="score-block ${t2Leading ? 'leading' : ''} team2-block">
          <div class="score-team-name" style="color:#5588e0;">TEAM 2</div>
          <div class="score-digits ${t2Leading ? 'score-leading' : ''}">${s2}</div>
          <div class="score-sub">${9 - s2} left</div>
        </div>
      </div>

      <!-- Turn banner -->
      <div class="turn-banner ${isMyTurn ? 'my-turn' : 'other-turn'}">
        ${isMyTurn
          ? `<span class="turn-dot my-turn-dot"></span><span class="turn-text">YOUR TURN</span>${timer}`
          : `<span class="turn-dot other-turn-dot"></span><span class="turn-text">${currentPlayer?.name || '?'}'s Turn</span>${timer}`
        }
      </div>

      <!-- Last action strip (who asked whom) -->
      ${lastAsk ? `
        <div class="last-action-strip ${lastAsk.success ? 'action-success' : 'action-fail'}">
          <span class="action-asker">${lastAsk.asker}</span>
          <span class="action-arrow">asked</span>
          <span class="action-target">${lastAsk.target}</span>
          <span class="action-card">for <strong>${lastAsk.card}</strong></span>
          <span class="action-result ${lastAsk.success ? 'result-got' : 'result-miss'}">
            ${lastAsk.success ? '✓ GOT IT' : '✗ MISS'}
          </span>
        </div>
      ` : ''}

    </div>
  `;
}

function renderTeamSidebar() {
  const lastAsk = parseLastAsk();
  return `
    <div class="game-sidebar">
      <div>
        <h3 class="sidebar-team-label team1-label">Team 1</h3>
        ${state.game.players.filter(p => state.game.teams.team1.includes(p.id)).map(p => renderTeamPlayer(p, lastAsk)).join('')}
      </div>
      <div>
        <h3 class="sidebar-team-label team2-label">Team 2</h3>
        ${state.game.players.filter(p => state.game.teams.team2.includes(p.id)).map(p => renderTeamPlayer(p, lastAsk)).join('')}
      </div>
    </div>
  `;
}

function renderTeamPlayer(p, lastAsk) {
  const hasCards = p.hand && p.hand.length > 0;
  const isHost = state.game.hostId === myId;
  const isCurrentTurn = state.game.currentTurn === p.id;
  const isAsker = lastAsk && lastAsk.asker === p.name;
  const isTarget = lastAsk && lastAsk.target === p.name;
  const isMe = p.id === myId;

  // Pick the row's highlight class
  let rowClass = 'player-row';
  if (p.disconnected) rowClass += ' player-dc';
  else if (isCurrentTurn) rowClass += ' player-active';
  else if (!hasCards) rowClass += ' player-out';
  if (isMe) rowClass += ' player-me';

  // Status badge (only one at a time, priority order)
  let badge = '';
  if (p.disconnected) {
    badge = '<span class="pbadge badge-dc">DC</span>';
  } else if (isCurrentTurn) {
    badge = `<span class="pbadge badge-turn">${isMe ? 'YOUR TURN' : 'ASKING'}</span>`;
  } else if (isAsker && lastAsk) {
    badge = `<span class="pbadge ${lastAsk.success ? 'badge-got' : 'badge-miss'}">${lastAsk.success ? 'GOT IT' : 'MISSED'}</span>`;
  } else if (isTarget && lastAsk) {
    badge = `<span class="pbadge ${lastAsk.success ? 'badge-gave' : 'badge-blocked'}">${lastAsk.success ? 'GAVE CARD' : 'BLOCKED'}</span>`;
  } else if (!hasCards) {
    badge = '<span class="pbadge badge-out">OUT</span>';
  }

  return `
    <div class="${rowClass}">
      <div class="player-name-row">
        <span class="pname">${p.name}${isMe ? ' <span class="you-label">(You)</span>' : ''}</span>
        <span class="pcount">${hasCards ? p.hand.length + ' cards' : 'no cards'}</span>
      </div>
      <div class="player-badge-row">
        ${badge}
        ${isHost && p.disconnected && !isMe ? `<button onclick="window.app.kickPlayer('${p.id}')" class="kick-btn">Kick</button>` : ''}
      </div>
    </div>
  `;
}

function renderDisconnectBanner() {
  const currentPlayer = state.game.players.find(p => p.id === state.game.currentTurn);
  if (!currentPlayer) return '';

  const turnSince = state.turnPlayerSince?.since || Date.now();
  const stallSeconds = Math.floor((Date.now() - turnSince) / 1000);
  const isStuck = stallSeconds >= 90;
  const isDisconnected = currentPlayer.disconnected;

  if (!isDisconnected && !isStuck) return '';

  // Reset dismiss if the player changed
  if (state.bannerDismissedFor !== currentPlayer.id) {
    state.bannerDismissedFor = null;
  }
  if (state.bannerDismissedFor === currentPlayer.id) return '';

  const isMe = currentPlayer.id === myId;
  const reason = isDisconnected ? 'disconnected' : 'AFK (no action for ' + stallSeconds + 's)';

  return `
    <div style="
      background: rgba(248, 81, 73, 0.12);
      border: 1px solid rgba(248, 81, 73, 0.5);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    ">
      <div style="font-size: 13px; color: #ff8080; flex: 1;">
        ⚠️ <strong>${isMe ? 'You appear' : currentPlayer.name + ' appears'}</strong> ${reason}.
        ${!isMe ? 'The game is waiting.' : 'Refresh the page if you see this by mistake.'}
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button onclick="window.app.dismissBanner('${currentPlayer.id}')" style="
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.5);
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 4px 8px;
          margin: 0;
        " title="Dismiss">&times;</button>
      </div>
    </div>
  `;
}

function renderPlayerActions(isMyTurn, opponents, askableCards) {
  // Get filtered cards based on selected set
  const me = state.game?.players.find(p => p.id === myId);
  const filteredCards = getFilteredAskableCards(me?.hand || []);
  
  // Filter SET_GROUPS to only show sets where you have cards to ask
  const availableSets = SET_GROUPS.map((group, idx) => ({
    ...group,
    index: idx,
    hasCards: askableCards.some(card => group.cards.includes(card))
  })).filter(group => group.hasCards);
  
  // Ensure selectedSetIndex points to an available set
  if (availableSets.length > 0) {
    const currentSetAvailable = availableSets.some(g => g.index === state.selectedSetIndex);
    if (!currentSetAvailable) {
      state.selectedSetIndex = availableSets[0].index;
    }
  }
  
  const selectedSet = SET_GROUPS[state.selectedSetIndex];
  
  return `
    <div>
      <h3 style="margin-bottom: 10px;">Your Actions</h3>
      
      ${isMyTurn ? `
        ${opponents.length > 0 ? `
          <select id="opponent-select" style="margin-bottom: 10px;">
            <option value="">Select Opponent to Ask</option>
            ${opponents.map(p => 
              `<option value="${p.id}" ${state.selectedOpponent === p.id ? 'selected' : ''}>${p.name} (${p.hand.length} cards)</option>`
            ).join('')}
          </select>
        ` : `
          <p style="color: #f85149; background: #161b22; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
            ⚠️ No opponents have cards! You should call a set.
          </p>
        `}
        
        ${askableCards.length > 0 ? `
          <label style="display: block; margin-bottom: 8px; color: var(--gold); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em;">Select Set Group:</label>
          <select id="set-group-select" style="width: 100%; margin-bottom: 20px;">
            ${availableSets.map((group) => 
              `<option value="${group.index}" ${state.selectedSetIndex === group.index ? 'selected' : ''}>${group.name}</option>`
            ).join('')}
          </select>
          
          ${filteredCards.length > 0 ? `
            <div class="card-select-grid">
              ${filteredCards.map((card, idx) => {
                const isSelected = idx === (state.selectedCardIndex % filteredCards.length);
                return `
                  <div class="card-select-item ${isSelected ? 'selected' : ''}" onclick="window.app.selectCard(${idx})" title="${card}">
                    <img src="${CARD_IMAGES[card]}" alt="${card}">
                  </div>
                `;
              }).join('')}
            </div>
            <p style="text-align:center;font-size:13px;color:var(--gold-light);margin:-4px 0 10px;">Selected: <strong class="card-selected-label">${filteredCards[state.selectedCardIndex % filteredCards.length]}</strong></p>
          ` : `
            <p style="color: #f85149; padding: 20px; text-align: center; background: rgba(74, 28, 28, 0.3); border-radius: 8px; border: 1px solid rgba(248, 81, 73, 0.3);">No cards from "${selectedSet.name}" in your hand</p>
          `}
        ` : `
          <p style="color: #8b949e; padding: 12px; text-align: center;">No cards to ask for</p>
        `}
        
        <button data-ask-btn onclick="window.app.askForCard()" ${filteredCards.length === 0 || !state.selectedOpponent || opponents.length === 0 || state.isAsking ? 'disabled' : ''}>
          ${state.isAsking ? 'Asking…' : 'Ask for Card'}
        </button>
      ` : '<p style="color: #8b949e; margin-bottom: 10px;">Waiting for turn...</p>'}
      
      <button onclick="window.app.openCounterSetModal()" class="btn-secondary" style="margin-top: 8px;">
        Counter Set (Risky!)
      </button>
    </div>
  `;
}

function renderSpectatorActions() {
  return `
    <div>
      <button onclick="window.app.openCounterSetModal()" class="btn-secondary">
        Counter Set (Risky!)
      </button>
      <p style="color: #8b949e; margin-top: 10px; font-size: 13px;">You have no cards. You can counter-call sets. If correct, your team scores. If wrong, opponent gets it FREE!</p>
    </div>
  `;
}

function renderLastAsk() {
  const askLogs = state.game.log?.filter(log =>
    log.includes('asked') && (log.includes('SUCCESS') || log.includes('FAILED'))
  ).slice(0, 3) || [];

  return `
    <div style="background: rgba(26, 71, 42, 0.3); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 10px; padding: 12px;">
      <h3 style="font-size: 10px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">📋 Last Ask</h3>
      ${askLogs.length > 0 ? askLogs.map(log => {
        const isSuccess = log.includes('SUCCESS');
        return `
          <div style="font-size: 11px; margin-bottom: 4px; padding: 6px 8px; background: ${isSuccess ? 'rgba(74,222,128,0.08)' : 'rgba(248,81,73,0.08)'}; border-left: 2px solid ${isSuccess ? '#4ade80' : '#f85149'}; border-radius: 4px; color: #e6edf3; line-height: 1.4;">
            ${log}
          </div>
        `;
      }).join('') : '<div style="font-size: 11px; color: #8b949e;">No asks yet</div>'}
    </div>
  `;
}

function renderRecentActivity() {
  const activityLogs = state.game.log?.filter(log =>
    !log.includes('asked') || (!log.includes('SUCCESS') && !log.includes('FAILED'))
  ).slice(0, 4) || [];

  return `
    <div style="background: rgba(13, 27, 26, 0.3); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 10px; padding: 12px;">
      <h3 style="font-size: 10px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">📰 Recent Activity</h3>
      ${activityLogs.length > 0 ? activityLogs.map(log => `
        <div style="font-size: 11px; color: rgba(230,237,243,0.7); margin-bottom: 4px; padding: 6px 8px; background: rgba(0,0,0,0.25); border-radius: 4px; border-left: 2px solid rgba(212,175,55,0.25); line-height: 1.4;">
          ${log}
        </div>
      `).join('') : '<div style="font-size: 11px; color: #8b949e;">No activity yet</div>'}
    </div>
  `;
}

function renderActivityLog() {
  // DEPRECATED - Split into renderLastAsk and renderRecentActivity
  return '';
}

function renderSetsStatus() {
  return `
    <div style="background: rgba(18, 18, 18, 0.8); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 16px;">
      <h3 style="font-size: 12px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">🎯 Sets Status & Calling</h3>
      <div style="display: grid; gap: 6px; max-height: calc(100vh - 280px); overflow-y: auto; padding-right: 4px;">
        ${SETS.map((set, i) => {
          const isClaimed = state.game.claimedSets?.includes(set.name);
          return `
            <button
              onclick="window.app.quickCallSet(${i})"
              ${isClaimed ? 'disabled' : ''}
              style="
                text-align: left;
                padding: 8px 10px;
                background: ${isClaimed ? 'rgba(74, 28, 28, 0.2)' : 'rgba(26, 71, 42, 0.4)'};
                border: 1px solid ${isClaimed ? 'rgba(139, 148, 158, 0.15)' : 'rgba(212, 175, 55, 0.35)'};
                border-radius: 7px;
                cursor: ${isClaimed ? 'not-allowed' : 'pointer'};
                width: 100%;
                margin: 0;
              "
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <strong style="color: ${isClaimed ? '#8b949e' : 'var(--gold-light)'}; font-size: 12px;">${set.name}</strong>
                <span style="font-size: 10px; ${isClaimed ? 'color: #f85149;' : 'color: #4ade80;'} font-weight: 600;">
                  ${isClaimed ? '✗ Claimed' : '✓ Call'}
                </span>
              </div>
              <div style="font-size: 9px; color: #8b949e; font-family: monospace;">${set.cards.join(' · ')}</div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderCallModal() {
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  
  // CRITICAL FIX: For counter set, show ONLY opposing team
  // For regular call, show ONLY your team
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
  
  const closeAction = state.showCounterSetModal ? 'closeCounterSetModal' : 'closeCallModal';
  const submitAction = state.showCounterSetModal ? 'submitCounterSet' : 'submitCall';
  return `
    <div class="modal-overlay" onclick="if(event.target===this) window.app.${closeAction}()">
      <div class="modal" onclick="event.stopPropagation()">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="margin:0; font-size:20px; color:var(--gold);">${state.showCounterSetModal ? 'Counter Set (Risky!)' : 'Call a Set'}</h2>
          <button onclick="window.app.${closeAction}()" style="background:none;border:none;color:var(--gold);font-size:28px;cursor:pointer;padding:0;line-height:1;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>
        ${state.showCounterSetModal ? '<p style="color:#f85149;margin-bottom:14px;font-size:13px;padding:10px;background:rgba(248,81,73,0.1);border-radius:6px;border-left:3px solid #f85149;">⚠️ Counter set uses OPPOSING team players. Wrong guess = they get the set FREE!</p>' : ''}

        <div style="margin-bottom:18px;">
          <label style="display:block;margin-bottom:8px;color:#8b949e;font-weight:600;font-size:13px;">Select Set:</label>
          <select id="set-select" style="width:100%;">
            ${unclaimedSets.map((set) => {
              const actualIndex = SETS.indexOf(set);
              return `<option value="${actualIndex}" ${actualIndex === state.callSetIndex ? 'selected' : ''}>${set.name}</option>`;
            }).join('')}
          </select>
          ${unclaimedSets.length === 0 ? '<p style="color:#f85149;margin-top:8px;font-size:13px;">All sets have been claimed!</p>' : ''}
        </div>

        <div class="card-assignments-container">
          <h3 style="margin-bottom:12px;font-size:14px;color:#c9d1d9;">Assign each card to ${state.showCounterSetModal ? 'an OPPOSING player' : 'a teammate'}:</h3>
          ${SETS[state.callSetIndex].cards.map(card => {
            const iHaveIt = me?.hand?.includes(card);
            return `
              <div class="card-assignment-row">
                <label style="font-size:13px;color:#ffd700;">${card}${iHaveIt ? ' <span style="color:#4ade80;font-size:11px;">(you have it)</span>' : ''}</label>
                <select class="card-assign-select" data-card="${card}">
                  <option value="">-- Who has ${card}? --</option>
                  ${playersToShow.map(p =>
                    `<option value="${p.id}" ${state.callAssignments[card] === p.id ? 'selected' : ''}>${p.name}${p.id === myId ? ' (You)' : ''}</option>`
                  ).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex;gap:10px;margin-top:24px;">
          <button onclick="window.app.${submitAction}()" style="flex:1;padding:13px;">
            Submit ${state.showCounterSetModal ? 'Counter Set' : 'Call'}
          </button>
          <button onclick="window.app.${closeAction}()" class="btn-secondary" style="flex:1;padding:13px;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPassTurnModal() {
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const teammates = state.game.players.filter(p => 
    state.game.teams[myTeam].includes(p.id) && p.hand.length > 0 && p.id !== myId
  );
  
  return `
    <div class="modal-overlay">
      <div class="modal" onclick="event.stopPropagation()">
        <h2 style="margin-bottom:16px;font-size:20px;color:var(--gold);">Pass Turn to Teammate</h2>
        <p style="margin-bottom:16px;color:#8b949e;font-size:14px;">You have no cards left. Select a teammate with cards to pass the turn to:</p>

        <select id="pass-turn-select" style="margin-bottom:20px;">
          <option value="">-- Select Teammate --</option>
          ${teammates.map(p =>
            `<option value="${p.id}" ${state.selectedPassPlayer === p.id ? 'selected' : ''}>${p.name} (${p.hand.length} cards)</option>`
          ).join('')}
        </select>

        <button onclick="window.app.confirmPassTurn()" ${!state.selectedPassPlayer ? 'disabled' : ''} style="padding:13px;">
          Confirm Pass Turn
        </button>
      </div>
    </div>
  `;
}

function renderNotifications() {
  if (state.notifications.length === 0) return '';

  return `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;">
      ${state.notifications.map((notif) => `
        <div class="notification ${notif.type === 'loss' ? 'notification-loss' : 'notification-gain'}"
             style="display: flex; align-items: center; gap: 12px;">
          <span style="flex:1;">${notif.message}</span>
          <button onclick="window.app.dismissNotification(${notif.id})" style="
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.2);
            color: inherit;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            padding: 2px 8px;
            flex-shrink: 0;
            margin: 0;
          ">&times;</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderHistoryModal() {
  const myName = state.game.players.find(p => p.id === myId)?.name || '';

  // Only show cards YOU personally gained or lost
  const entries = [];
  for (const entry of (state.game.log || [])) {
    const m = entry.match(/^(.+?) asked (.+?) for (.+?) - SUCCESS!/);
    if (!m) continue;
    const [, asker, target, card] = m;
    if (asker === myName) {
      entries.push({ type: 'gain', card, label: `from ${target}` });
    } else if (target === myName) {
      entries.push({ type: 'loss', card, label: `taken by ${asker}` });
    }
  }

  const rowColor  = { gain: 'rgba(26,58,26,0.5)', loss: 'rgba(58,26,26,0.5)' };
  const rowBorder = { gain: 'var(--gold)',         loss: '#f85149'            };
  const rowIcon   = { gain: '▲',                  loss: '▼'                  };
  const rowColor2 = { gain: '#4ade80',             loss: '#ff6b6b'            };

  return `
    <div class="modal-overlay" onclick="window.app.toggleHistoryModal()">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 700px; max-height: 85vh; padding: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid rgba(212, 175, 55, 0.3);">
          <h2 style="font-size: 22px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.2em; margin: 0;">📜 Card History</h2>
          <button onclick="window.app.toggleHistoryModal()" style="background: none; border: none; color: var(--gold); font-size: 32px; cursor: pointer; padding: 0; line-height: 1; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
        <div style="max-height: 600px; overflow-y: auto; padding-right: 16px;">
          ${entries.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; color: #8b949e;">
              <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">📋</div>
              <div style="font-size: 16px;">No card transfers yet</div>
            </div>
          ` : entries.map(e => `
            <div style="
              padding: 16px 20px;
              margin-bottom: 10px;
              background: ${rowColor[e.type]};
              border-left: 5px solid ${rowBorder[e.type]};
              border-radius: 10px;
              display: flex;
              align-items: center;
              gap: 14px;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
              <span style="font-size: 22px; color: ${rowColor2[e.type]};">${rowIcon[e.type]}</span>
              <div style="flex:1;">
                <div style="font-size: 16px; font-weight: 700; color: ${rowColor2[e.type]};">${e.card}</div>
                <div style="font-size: 13px; color: rgba(230,237,243,0.7); margin-top: 2px;">${e.label.replace(e.card, '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function refreshAskButton(opponents) {
  const btn = document.querySelector('button[data-ask-btn]');
  if (!btn) return;
  const filteredCards = getFilteredAskableCards(
    state.game?.players.find(p => p.id === myId)?.hand || []
  );
  const canAsk = filteredCards.length > 0 && !!state.selectedOpponent && opponents.length > 0 && !state.isAsking;
  btn.disabled = !canAsk;
  if (!state.isAsking) btn.textContent = 'Ask for Card';
}

function attachGameHandlers(opponents) {
  const oppSelect = document.getElementById('opponent-select');
  const cardDropdown = document.getElementById('card-select-dropdown');
  const setGroupSelect = document.getElementById('set-group-select');
  const setSelect = document.getElementById('set-select');
  const passTurnSelect = document.getElementById('pass-turn-select');
  
  // CRITICAL: Track ALL dropdown interactions
  const allSelects = [oppSelect, cardDropdown, setGroupSelect, setSelect, passTurnSelect].filter(Boolean);
  
  allSelects.forEach(select => {
    // Prevent polling when dropdown is open
    select.addEventListener('focus', () => {
      state.dropdownOpen = true;
    });
    
    select.addEventListener('blur', () => {
      // Delay clearing to allow selection to complete
      setTimeout(() => {
        state.dropdownOpen = false;
      }, 500);
    });
    
    select.addEventListener('mousedown', () => {
      state.dropdownOpen = true;
    });
  });
  
  if (oppSelect) {
    if (state.selectedOpponent) {
      oppSelect.value = state.selectedOpponent;
    }

    oppSelect.onchange = (e) => {
      state.selectedOpponent = e.target.value;
      refreshAskButton(opponents);
    };
  }
  
  // Set group dropdown handler - PREVENT RESETTING
  if (setGroupSelect) {
    // Ensure value is preserved
    if (state.selectedSetIndex !== undefined && state.selectedSetIndex !== null) {
      setGroupSelect.value = state.selectedSetIndex;
    }
    
    setGroupSelect.onchange = (e) => {
      const newIndex = parseInt(e.target.value);
      if (!isNaN(newIndex)) {
        state.selectedSetIndex = newIndex;
        state.selectedCardIndex = 0; // Reset card index
        // Delay render significantly to prevent dropdown from closing
        setTimeout(() => {
          state.dropdownOpen = false;
          render();
        }, 300);
      }
    };
  }
  
  // Card dropdown handler
  if (cardDropdown) {
    cardDropdown.onchange = (e) => {
      state.selectedCardIndex = parseInt(e.target.value);
      render();
    };
  }
  
  // Card selection now uses arrow buttons instead of dropdown
  /*
  if (cardSelect) {
    if (state.selectedCard) {
      cardSelect.value = state.selectedCard;
    }
    
    cardSelect.onmousedown = () => {
      state.dropdownOpen = true;
    };
    
    cardSelect.onclick = () => {
      state.dropdownOpen = true;
    };
    
    cardSelect.onchange = (e) => {
      state.selectedCard = e.target.value;
      setTimeout(() => {
        state.dropdownOpen = false;
      }, 500);
    };
    
    cardSelect.onblur = () => {
      setTimeout(() => {
        state.dropdownOpen = false;
      }, 300);
    };
  }
  */
  
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
    // Prevent polling during dropdown use
    setSelect.addEventListener('focus', () => {
      state.dropdownOpen = true;
    });
    
    setSelect.addEventListener('blur', () => {
      setTimeout(() => {
        state.dropdownOpen = false;
      }, 500);
    });
    
    setSelect.onchange = (e) => {
      try {
        const newIndex = Number(e.target.value);
        const selectedSet = SETS[newIndex];
        
        // Check if this set is already claimed
        if (state.game.claimedSets?.includes(selectedSet.name)) {
          alert('This set has already been claimed! Choose another.');
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
        
        // Instead of full re-render, just update the card assignment dropdowns
        updateCardAssignmentDropdowns();
      } catch (error) {
        console.error('Set select error:', error);
      }
    };
  }
  
  if (state.showCallModal || state.showCounterSetModal) {
    const assignSelects = document.querySelectorAll('.card-assign-select');
    assignSelects.forEach(sel => {
      const card = sel.getAttribute('data-card');
      
      // Prevent polling during dropdown use
      sel.addEventListener('focus', () => {
        state.dropdownOpen = true;
      });
      
      sel.addEventListener('blur', () => {
        setTimeout(() => {
          state.dropdownOpen = false;
        }, 500);
      });
      
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

function updateCardAssignmentDropdowns() {
  // Get current modal info
  const me = state.game.players.find(p => p.id === myId);
  const myTeam = state.game.teams.team1.includes(myId) ? 'team1' : 'team2';
  const oppTeam = myTeam === 'team1' ? 'team2' : 'team1';
  const playersToShow = state.showCounterSetModal 
    ? state.game.players.filter(p => state.game.teams[oppTeam].includes(p.id))
    : state.game.players.filter(p => state.game.teams[myTeam].includes(p.id));
  
  // Get the container
  const container = document.querySelector('.card-assignments-container');
  if (!container) return;
  
  // Rebuild just the card assignment rows
  const set = SETS[state.callSetIndex];
  container.innerHTML = `
    <h3 style="margin-bottom: 15px; font-size: 16px; color: #c9d1d9;">Assign each card to ${state.showCounterSetModal ? 'an OPPOSING player' : 'a teammate'}:</h3>
    ${set.cards.map(card => {
      const iHaveIt = me?.hand?.includes(card);
      return `
        <div class="card-assignment-row">
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
  `;
  
  // Re-attach event listeners to new dropdowns
  const assignSelects = container.querySelectorAll('.card-assign-select');
  assignSelects.forEach(sel => {
    const card = sel.getAttribute('data-card');
    
    if (state.callAssignments[card]) {
      sel.value = state.callAssignments[card];
    }
    
    sel.onchange = (e) => {
      state.callAssignments[card] = e.target.value;
      const currentSetName = SETS[state.callSetIndex].name;
      if (!state.allSetAssignments[currentSetName]) {
        state.allSetAssignments[currentSetName] = {};
      }
      state.allSetAssignments[currentSetName][card] = e.target.value;
      // Don't re-render, just update state
    };
  });
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
  selectCard,
  nextCard,
  previousCard,
  changeSetGroup,
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
  toggleHistoryModal,
  dismissBanner,
  dismissNotification,
  quickCallSet,
  voteReplay,
  skipStuckTurn,
  kickPlayer,
  manualRefresh: async () => {
    await load();
  }
};

// Initialize app
render();
