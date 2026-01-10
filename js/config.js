// Supabase configuration
const DB = window.supabase.createClient(
  'https://vngdiukjrfmzwlbefmjf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZ2RpdWtqcmZtendsYmVmbWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0Njk5MDUsImV4cCI6MjA4MzA0NTkwNX0.XBr7aEzSPj-Iw0HYf27T8yXo1nbZ01MhBVa-VIdNZG4'
);

// Card sets definition
const SETS = [
  { name: 'Spades 2-7', cards: ['2♠', '3♠', '4♠', '5♠', '6♠', '7♠'] },
  { name: 'Spades 9-A', cards: ['9♠', '10♠', 'J♠', 'Q♠', 'K♠', 'A♠'] },
  { name: 'Hearts 2-7', cards: ['2♥', '3♥', '4♥', '5♥', '6♥', '7♥'] },
  { name: 'Hearts 9-A', cards: ['9♥', '10♥', 'J♥', 'Q♥', 'K♥', 'A♥'] },
  { name: 'Clubs 2-7', cards: ['2♣', '3♣', '4♣', '5♣', '6♣', '7♣'] },
  { name: 'Clubs 9-A', cards: ['9♣', '10♣', 'J♣', 'Q♣', 'K♣', 'A♣'] },
  { name: 'Diamonds 2-7', cards: ['2♦', '3♦', '4♦', '5♦', '6♦', '7♦'] },
  { name: 'Diamonds 9-A', cards: ['9♦', '10♦', 'J♦', 'Q♦', 'K♦', 'A♦'] },
  { name: 'Eights + Jokers', cards: ['8♥', '8♦', '8♠', '8♣', 'RJ', 'BJ'] }
];

// Player ID management
const myId = localStorage.getItem('player-id') || (() => {
  const id = crypto.randomUUID();
  localStorage.setItem('player-id', id);
  return id;
})();

// Global state
let state = {
  view: 'home',
  name: '',
  code: '',
  team: '',
  game: null,
  selectedCard: '',
  selectedOpponent: '',
  showCallModal: false,
  showCounterSetModal: false,
  showPassTurnModal: false,
  selectedPassPlayer: '',
  callSetIndex: 0,
  callAssignments: {},
  startPlayer: 'random',
  isSpectator: false,
  spectatingPlayerId: null,
  shouldRender: true,
  // Track all assignments for all sets to preserve them
  allSetAssignments: {}
};

// Polling interval (no more heartbeat!)
let pollInterval = null;

// Track page visibility - mark as disconnected when user leaves
document.addEventListener('visibilitychange', async () => {
  if (document.hidden && state.game && state.code && !state.isSpectator) {
    await markAsDisconnected();
  }
});

// Mark as disconnected when leaving page
window.addEventListener('beforeunload', async () => {
  if (state.game && state.code && !state.isSpectator) {
    await markAsDisconnected();
  }
});

async function markAsDisconnected() {
  const game = state.game;
  const player = game.players.find(p => p.id === myId);
  if (player) {
    player.disconnected = true;
    player.lastSeen = Date.now();
    
    try {
      await DB.from('games')
        .update({ game_data: game, updated_at: new Date().toISOString() })
        .eq('room_code', state.code);
    } catch (e) {
      console.error('Failed to mark as disconnected:', e);
    }
  }
}
