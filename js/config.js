// Supabase configuration
// VERSION: 2.0 - Fixed duplicate SET_GROUPS declaration
const DB = window.supabase.createClient(
  'https://vngdiukjrfmzwlbefmjf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZ2RpdWtqcmZtendsYmVmbWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0Njk5MDUsImV4cCI6MjA4MzA0NTkwNX0.XBr7aEzSPj-Iw0HYf27T8yXo1nbZ01MhBVa-VIdNZG4'
);

// Card sets definition - 54 cards total
// Each suit: 2-A (13 cards) × 4 suits = 52 cards + 2 Jokers = 54 cards
// 9 sets total: 4 suits × 2 sets each (2-7 and 9-A) + 1 set (8's + Jokers)
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
  showHistoryModal: false,  // For card history
  selectedPassPlayer: '',
  callSetIndex: 0,
  callAssignments: {},
  startPlayer: 'random',
  isSpectator: false,
  spectatingPlayerId: null,
  shouldRender: true,
  allSetAssignments: {},
  turnStartTime: null,
  timeRemaining: 0,
  dropdownOpen: false,
  lastSuccessfulAsk: null,  // Track last opponent we successfully got a card from
  cardHistory: [],  // Track card gains/losses
  notifications: [],  // Active notifications
  selectedCardIndex: 0,  // For arrow navigation
  selectedSetIndex: 0  // For set dropdown navigation (which set group to show)
};

// Define the 9 set groups for dropdown
const SET_GROUPS = [
  { name: 'Spades 2-7', cards: ['2♠', '3♠', '4♠', '5♠', '6♠', '7♠'] },
  { name: 'Spades 9-A', cards: ['9♠', '10♠', 'J♠', 'Q♠', 'K♠', 'A♠'] },
  { name: 'Hearts 2-7', cards: ['2♥', '3♥', '4♥', '5♥', '6♥', '7♥'] },
  { name: 'Hearts 9-A', cards: ['9♥', '10♥', 'J♥', 'Q♥', 'K♥', 'A♥'] },
  { name: 'Diamonds 2-7', cards: ['2♦', '3♦', '4♦', '5♦', '6♦', '7♦'] },
  { name: 'Diamonds 9-A', cards: ['9♦', '10♦', 'J♦', 'Q♦', 'K♦', 'A♦'] },
  { name: 'Clubs 2-7', cards: ['2♣', '3♣', '4♣', '5♣', '6♣', '7♣'] },
  { name: 'Clubs 9-A', cards: ['9♣', '10♣', 'J♣', 'Q♣', 'K♣', 'A♣'] },
  { name: 'Eights + Jokers', cards: ['8♥', '8♦', '8♠', '8♣', 'RJ', 'BJ'] }
];

// Card image mapping
const CARD_IMAGES = {
  '2♠': 'images/cards/2_of_spades.png', '3♠': 'images/cards/3_of_spades.png', '4♠': 'images/cards/4_of_spades.png',
  '5♠': 'images/cards/5_of_spades.png', '6♠': 'images/cards/6_of_spades.png', '7♠': 'images/cards/7_of_spades.png',
  '8♠': 'images/cards/8_of_spades.png', '9♠': 'images/cards/9_of_spades.png', '10♠': 'images/cards/10_of_spades.png',
  'J♠': 'images/cards/jack_of_spades.png', 'Q♠': 'images/cards/queen_of_spades.png', 'K♠': 'images/cards/king_of_spades.png', 'A♠': 'images/cards/ace_of_spades.png',
  '2♥': 'images/cards/2_of_hearts.png', '3♥': 'images/cards/3_of_hearts.png', '4♥': 'images/cards/4_of_hearts.png',
  '5♥': 'images/cards/5_of_hearts.png', '6♥': 'images/cards/6_of_hearts.png', '7♥': 'images/cards/7_of_hearts.png',
  '8♥': 'images/cards/8_of_hearts.png', '9♥': 'images/cards/9_of_hearts.png', '10♥': 'images/cards/10_of_hearts.png',
  'J♥': 'images/cards/jack_of_hearts.png', 'Q♥': 'images/cards/queen_of_hearts.png', 'K♥': 'images/cards/king_of_hearts.png', 'A♥': 'images/cards/ace_of_hearts.png',
  '2♦': 'images/cards/2_of_diamonds.png', '3♦': 'images/cards/3_of_diamonds.png', '4♦': 'images/cards/4_of_diamonds.png',
  '5♦': 'images/cards/5_of_diamonds.png', '6♦': 'images/cards/6_of_diamonds.png', '7♦': 'images/cards/7_of_diamonds.png',
  '8♦': 'images/cards/8_of_diamonds.png', '9♦': 'images/cards/9_of_diamonds.png', '10♦': 'images/cards/10_of_diamonds.png',
  'J♦': 'images/cards/jack_of_diamonds.png', 'Q♦': 'images/cards/queen_of_diamonds.png', 'K♦': 'images/cards/king_of_diamonds.png', 'A♦': 'images/cards/ace_of_diamonds.png',
  '2♣': 'images/cards/2_of_clubs.png', '3♣': 'images/cards/3_of_clubs.png', '4♣': 'images/cards/4_of_clubs.png',
  '5♣': 'images/cards/5_of_clubs.png', '6♣': 'images/cards/6_of_clubs.png', '7♣': 'images/cards/7_of_clubs.png',
  '8♣': 'images/cards/8_of_clubs.png', '9♣': 'images/cards/9_of_clubs.png', '10♣': 'images/cards/10_of_clubs.png',
  'J♣': 'images/cards/jack_of_clubs.png', 'Q♣': 'images/cards/queen_of_clubs.png', 'K♣': 'images/cards/king_of_clubs.png', 'A♣': 'images/cards/ace_of_clubs.png',
  'RJ': 'images/cards/red_joker.png', 'BJ': 'images/cards/black_joker.png'
};

// Polling interval
let pollInterval = null;
let timerInterval = null;
