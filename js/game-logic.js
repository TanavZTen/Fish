// Game Logic Functions
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
