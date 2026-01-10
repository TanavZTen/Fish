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
  allSetAssignments: {},
  turnStartTime: null,
  timeRemaining: 0
};

// Polling interval
let pollInterval = null;
let timerInterval = null;
