const socket = io();
let myId = null;
let currentMode = 'bot';
let selectedGameTypeVal = 'chudapatti';
let selectedDifficulty = 'hard';
let selectedBotCount = 3;
let currentLang = 'en';
let currentRoomCode = 'PUBLIC_1';

let selectedBluffCardIds = new Set();
let activeGameState = null;

const i18n = {
  en: {
    gameTitle: "HIMALAYAN GAME BATTLE",
    namePlaceholder: "Enter Your Name",
    selectGameTitle: "SELECT GAME TO PLAY:",
    chudapattiName: "Chudapatti",
    bluffName: "Bluff / 420",
    btnMultiplayer: "Private Multiplayer Room",
    btnPlayWithBots: "Play with AI Bots",
    roomModalTitle: "🌐 Private Table Room",
    roomCodeLabel: "Enter 4-Digit Room Code:",
    btnJoinRoom: "Join / Create Room",
    botSetupTitle: "🤖 Singleplayer Bot Setup",
    botCountLabel: "Select Opponents (Bots):",
    aiDiffTitle: "AI BOT DIFFICULTY:",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard (Pro)",
    btnStartBotGame: "Launch Arena",
    btnCancel: "Cancel",
    btnRules: "Rules",
    btnCredits: "Credits & Legal",
    lobbyTitle: "Multiplayer Lobby",
    lobbySub: "Waiting for friends to join...",
    btnStartMatch: "Deal Cards & Start Match",
    btnBack: "Back to Menu",
    matchLogTitle: "Match Action Log",
    leadLabel: "Lead",
    heapLabel: "Heap",
    claimRankLabel: "Claim Rank (दावा):",
    yourTurn: "👉 YOUR TURN",
    matchFinishedTitle: "🏆 MATCH CONCLUDED",
    btnPlayAgain: "Return to Main Menu",
    rulesTitle: "🎴 Game Rules",
    btnUnderstand: "Understood",
    btnClose: "Close",
    creditsDev: "Architected & Engineered by:",
    creditsLegal: "<p>© 2026 O9 Productions. All Rights Reserved.</p><p>Himalayan Strategic Multi-Game Battle Engine.</p>",
    GAME_STARTED_ACE: "Game Commenced! Ace of Spades (A♠) leads.",
    ACE_OF_SPADES_ONLY: "⚠️ First move strictly requires Ace of Spades (A♠)!",
    OUT_OF_TURN_PENALTY: "🚨 {player} played out of turn! Penalized with Heap!",
    ILLEGAL_CUT_PENALTY: "⚠️ {player} committed an Illegal Cut! Ate own penalty!",
    LEGAL_CUT_PENALTY: "💥 CUT! {victim} received {count} penalty cards from {cutter}!",
    TRICK_CLEARED: "✨ Trick Cleared! Won by {winner}.",
    BLUFF_PLAYED: "🎭 {player} claimed {count}x [{rank}s] facedown.",
    BLUFF_PASSED: "✋ {player} passed.",
    ALL_PASSED_DISCARD: "✨ All players passed! Table cleared to Dustbin.",
    BLUFF_CAUGHT: "💥 BLUFF CAUGHT! {bluffer} lied and received {count} penalty cards!",
    BLUFF_FAILED: "🛡️ TRUTH PROVED! {bluffer} was honest. Challenger {challenger} received {count} cards!",
    GAME_OVER_LOSER: "👑 GAME OVER! {loser} is the Outcast (Chuda/Loser) 🤡"
  },
  hi: {
    gameTitle: "हिमालयन गेम बैटल",
    namePlaceholder: "अपना नाम दर्ज करें",
    selectGameTitle: "खेलने के लिए गेम चुनें:",
    chudapattiName: "चूड़ापत्ती",
    bluffName: "ब्लफ़ / 420",
    btnMultiplayer: "प्राइवेट मल्टीप्लेयर रूम",
    btnPlayWithBots: "एआई बॉट्स के साथ खेलें",
    roomModalTitle: "🌐 प्राइवेट टेबल रूम",
    roomCodeLabel: "4-अंकों का रूम कोड दर्ज करें:",
    btnJoinRoom: "रूम में शामिल हों / बनाएं",
    botSetupTitle: "🤖 सिंगलप्लेयर बॉट सेटअप",
    botCountLabel: "विरोधी खिलाड़ी (बॉट्स) चुनें:",
    aiDiffTitle: "एआई कठिनाई चुनें:",
    diffEasy: "सरल",
    diffMedium: "मध्यम",
    diffHard: "कठिन (प्रो)",
    btnStartBotGame: "मैच शुरू करें",
    btnCancel: "रद्द करें",
    btnRules: "नियम",
    btnCredits: "क्रेडिट्स एवं लीगल",
    lobbyTitle: "मल्टीप्लेयर लॉबी",
    lobbySub: "दोस्तों के जुड़ने की प्रतीक्षा...",
    btnStartMatch: "पत्ते बांटें और खेल शुरू करें",
    btnBack: "मुख्य मेनू",
    matchLogTitle: "मैच एक्शन लॉग",
    leadLabel: "लीड",
    heapLabel: "ढेर",
    claimRankLabel: "दावा रैंक (Claim):",
    yourTurn: "👉 आपकी चाल है",
    matchFinishedTitle: "🏆 मुकाबला समाप्त",
    btnPlayAgain: "मुख्य मेनू पर वापस जाएं",
    rulesTitle: "🎴 खेल के नियम",
    btnUnderstand: "समझ गया",
    btnClose: "बंद करें",
    creditsDev: "निर्माता एवं इंजीनियर:",
    creditsLegal: "<p>© 2026 O9 प्रोडक्शंस। सर्वाधिकार सुरक्षित।</p><p>पारंपरिक रोहड़ू हिमालयन रणनीतिक कार्ड गेम इंजन।</p>",
    GAME_STARTED_ACE: "खेल शुरू हुआ! पहला पत्ता हुकुम का इक्का (A♠) ही चलेगा।",
    ACE_OF_SPADES_ONLY: "⚠️ खेल केवल हुकुम के इक्के (A♠) से शुरू हो सकता है!",
    OUT_OF_TURN_PENALTY: "🚨 {player} ने बिना बारी पत्ता फेंका! पेनल्टी मिली!",
    ILLEGAL_CUT_PENALTY: "⚠️ {player} ने गलत काट मारी! खुद को पेनल्टी लगी!",
    LEGAL_CUT_PENALTY: "💥 काट! {cutter} की काट से {victim} को {count} पत्तों की पेनल्टी मिली!",
    TRICK_CLEARED: "✨ राउंड साफ़! {winner} ने चाल जीती।",
    BLUFF_PLAYED: "🎭 {player} ने {count}x [{rank}] पत्ते उल्टे फेंके।",
    BLUFF_PASSED: "✋ {player} ने पास किया।",
    ALL_PASSED_DISCARD: "✨ सबने पास किया! सारे पत्ते डस्टबिन में चले गए।",
    BLUFF_CAUGHT: "💥 झूठ पकड़ा गया! {bluffer} को {count} पत्तों का दंड मिला!",
    BLUFF_FAILED: "🛡️ सच साबित हुआ! {bluffer} सच्चा था। चैलेंजर {challenger} को {count} पत्ते मिले!",
    GAME_OVER_LOSER: "👑 खेल समाप्त! {loser} चूड़ा/हारा हुआ घोषित 🤡"
  }
};

function toggleLogDrawer() {
  document.getElementById('logDrawer').classList.toggle('open');
}

function updateVisualClaimPreview(val) {
  const vCardVal = document.getElementById('vCardVal');
  if (vCardVal) vCardVal.innerText = val;
}

function selectGameType(type) {
  selectedGameTypeVal = type;
  document.getElementById('card-chudapatti').classList.toggle('active', type === 'chudapatti');
  document.getElementById('card-bluff').classList.toggle('active', type === 'bluff');
}

function setLanguage(lang) {
  currentLang = lang;
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('lang-hi').classList.toggle('active', lang === 'hi');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.innerHTML = i18n[lang][key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) el.placeholder = i18n[lang][key];
  });

  updateRulesContent();
}

function updateRulesContent() {
  const isChuda = (selectedGameTypeVal === 'chudapatti');
  document.getElementById('rulesBodyContent').innerHTML = isChuda ? `
    <ul>
      <li><strong>Opening:</strong> Strictly begins with <strong>Ace of Spades (A♠)</strong>.</li>
      <li><strong>Lead Suit:</strong> You MUST follow the table Lead Suit if held.</li>
      <li><strong>Cut:</strong> Void players can cut. Highest lead card takes the pile!</li>
    </ul>
  ` : `
    <ul>
      <li><strong>Opening:</strong> Ace of Spades (A♠) holder opens claiming Aces.</li>
      <li><strong>Face-Down Play:</strong> Play 1 to 4 cards claiming the current rank.</li>
      <li><strong>Challenge:</strong> Click Show to call out bluffs!</li>
    </ul>
  `;
}

function openModal(id) {
  if (id === 'rulesModal') updateRulesContent();
  document.getElementById(id).style.display = 'flex';
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openBotModal() { openModal('botSetupModal'); }
function openRoomModal() { openModal('roomModal'); }

function selectBotCount(count) {
  selectedBotCount = count;
  document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('botCountVal').innerText = `${count} Bot${count > 1 ? 's' : ''} (${count + 1} Players)`;
}

function setBotDifficulty(level) {
  selectedDifficulty = level;
  ['easy', 'medium', 'hard'].forEach(l => document.getElementById(`btn-${l}`)?.classList.remove('active'));
  document.getElementById(`btn-${level}`)?.classList.add('active');
}

function joinCustomRoom() {
  currentMode = 'multi';
  const name = document.getElementById('usernameInput').value.trim() || 'Player';
  currentRoomCode = (document.getElementById('roomCodeInput').value.trim() || '7788').toUpperCase();
  
  closeModal('roomModal');
  socket.emit('join_room', { name, roomCode: currentRoomCode });
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('lobbyScreen').style.display = 'flex';
  document.getElementById('lobbyRoomDisplay').innerText = currentRoomCode;
}

function launchCustomBotGame() {
  currentMode = 'bot';
  currentRoomCode = `BOT_${Math.floor(Math.random()*1000)}`;
  closeModal('botSetupModal');
  const name = document.getElementById('usernameInput').value.trim() || 'Abhishek';
  
  socket.emit('join_room', { name, roomCode: currentRoomCode });
  socket.emit('start_game_req', {
    gameType: selectedGameTypeVal,
    mode: 'bot',
    botCount: selectedBotCount,
    difficulty: selectedDifficulty
  });
}

function startMultiplayerGame() {
  socket.emit('start_game_req', { gameType: selectedGameTypeVal, mode: 'multi' });
}

function returnToMenu() { location.reload(); }

function handleCardClick(cardId) {
  if (!activeGameState || activeGameState.isResolving) return;

  if (activeGameState.gameType === 'chudapatti') {
    socket.emit('play_chudapatti_card', cardId);
  } else {
    if (selectedBluffCardIds.has(cardId)) selectedBluffCardIds.delete(cardId);
    else if (selectedBluffCardIds.size < 4) selectedBluffCardIds.add(cardId);
    document.getElementById('selectedCount').innerText = selectedBluffCardIds.size;
    renderMyHand();
  }
}

function submitBluffCards() {
  if (selectedBluffCardIds.size === 0 || !activeGameState || activeGameState.isResolving) return;
  const claimed = activeGameState.currentClaimRank || document.getElementById('claimRankSelect').value;
  socket.emit('play_bluff_move', { cardIds: Array.from(selectedBluffCardIds), claimedRank: claimed });
  selectedBluffCardIds.clear();
  document.getElementById('selectedCount').innerText = '0';
}

function submitBluffPass() { if (activeGameState && !activeGameState.isResolving) socket.emit('bluff_pass'); }
function submitBluffShow() { if (activeGameState && !activeGameState.isResolving) socket.emit('bluff_show'); }

function getCardHTML(card, isClickable = true, isSelected = false) {
  const isRed = ['♥', '♦'].includes(card.suit);
  const disabledClass = !isClickable ? 'card-disabled' : '';
  const selectedClass = isSelected ? 'selected-for-bluff' : '';
  return `
    <div class="playing-card ${isRed ? 'red' : ''} ${disabledClass} ${selectedClass}" onclick="handleCardClick('${card.id}')">
      <div class="c-corner-top"><span>${card.value}</span><span>${card.suit}</span></div>
      <div class="c-middle-suit">${card.suit}</div>
      <div class="c-corner-bot"><span>${card.value}</span><span>${card.suit}</span></div>
    </div>
  `;
}

function sortHandCards(hand) {
  const suitOrder = { '♠': 1, '♥': 2, '♦': 3, '♣': 4 };
  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.rank - b.rank;
  });
}

function renderMyHand() {
  if (!activeGameState) return;
  const isMyTurn = (activeGameState.currentTurnId === myId && !activeGameState.isResolving && !activeGameState.isGameOver);
  const sortedHand = sortHandCards(activeGameState.myHand);
  const hasLeadSuit = (activeGameState.gameType === 'chudapatti' && activeGameState.leadSuit) ? sortedHand.some(c => c.suit === activeGameState.leadSuit) : false;

  document.getElementById('playerHand').innerHTML = sortedHand.map((c, i) => {
    let isClickable = isMyTurn;
    if (activeGameState.gameType === 'chudapatti' && hasLeadSuit && c.suit !== activeGameState.leadSuit) isClickable = false;
    return `<div style="z-index: ${i}; display:inline-block;">${getCardHTML(c, isClickable, selectedBluffCardIds.has(c.id))}</div>`;
  }).join('');
}

socket.on('connect', () => { myId = socket.id; });

socket.on('timer_tick', (data) => {
  const bar = document.getElementById('turnTimerProgress');
  const badge = document.getElementById('seatTimer');
  if (bar) bar.style.width = `${(data.remaining / 15) * 100}%`;
  if (badge) badge.innerText = `${data.remaining}s`;
});

socket.on('reveal_bluff_cards', (data) => {
  const trickTable = document.getElementById('trickTable');
  trickTable.className = 'trick-table';

  trickTable.innerHTML = data.cards.map(c => `
    <div style="display:flex; flex-direction:column; align-items:center;">
      ${getCardHTML(c, true)}
      <div style="font-size:11px; margin-top:4px; font-weight:800; color:${c.value === data.claimRank ? '#2ecc71' : '#e74c3c'};">
        ${c.value === data.claimRank ? '✓ REAL' : '✗ BLUFF'}
      </div>
    </div>
  `).join('');

  setTimeout(() => {
    trickTable.classList.add('penalty-sweep-animate');
    setTimeout(() => {
      trickTable.classList.remove('penalty-sweep-animate');
      trickTable.innerHTML = '';
    }, 550);
  }, 1600);
});

socket.on('trigger_discard_animation', () => {
  const trickTable = document.getElementById('trickTable');
  trickTable.classList.add('clean-discard-animate');
  setTimeout(() => {
    trickTable.classList.remove('clean-discard-animate');
    trickTable.innerHTML = '';
  }, 500);
});

socket.on('sync_state', (state) => {
  activeGameState = state;

  if (!state.started && !state.isGameOver) {
    if (currentMode === 'multi') {
      document.getElementById('playerChipsList').innerHTML = state.playersInfo.map(p => `
        <div class="p-chip">👤 ${p.name} ${p.id === myId ? '(You)' : ''}</div>
      `).join('');
      if (state.playersInfo.length >= 2) document.getElementById('startOnlineBtn').style.display = 'block';
    }
    return;
  }

  // Update Match Action Log
  if (state.historyLogs) {
    document.getElementById('logList').innerHTML = state.historyLogs.map(l => `
      <div class="log-item">
        <div class="log-time">${l.time}</div>
        <div>${l.text}</div>
      </div>
    `).join('');
  }

  if (state.isGameOver) {
    const podiumDiv = document.getElementById('podiumScoresList');
    podiumDiv.innerHTML = state.rankings.map(r => `
      <div class="podium-row ${r.rank === 1 ? 'rank-1' : ''} ${r.isLoser ? 'rank-chuda' : ''}">
        <span>${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '🤡'} ${r.name}</span>
        <strong>${r.isLoser ? (currentLang === 'hi' ? 'चूड़ा / Outcast' : 'Outcast (Chuda)') : `#${r.rank} Rank`}</strong>
      </div>
    `).join('');
    openModal('podiumModal');
  }

  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('lobbyScreen').style.display = 'none';
  document.getElementById('gameArena').style.display = 'flex';

  document.getElementById('trashCount').innerText = `Discard: ${state.trashPileCount}`;
  document.getElementById('heapCount').innerText = state.penaltyPileCount;

  // Header badges
  const headerVisualMini = document.getElementById('headerVisualMini');
  if (state.gameType === 'chudapatti') {
    document.getElementById('bluffActionBar').style.display = 'none';
    document.getElementById('leadLabelText').innerText = i18n[currentLang].leadLabel;
    document.getElementById('leadSuitDisplay').innerText = state.leadSuit || 'None';
    headerVisualMini.style.display = 'none';
  } else {
    document.getElementById('bluffActionBar').style.display = 'flex';
    document.getElementById('leadLabelText').innerText = 'Claim';
    
    if (state.currentClaimRank) {
      document.getElementById('leadSuitDisplay').innerText = `${state.currentClaimRank}s`;
      headerVisualMini.style.display = 'inline-block';
      headerVisualMini.innerText = `[ ${state.currentClaimRank} ♠ ]`;
      updateVisualClaimPreview(state.currentClaimRank);
    } else {
      document.getElementById('leadSuitDisplay').innerText = 'Free Choice';
      headerVisualMini.style.display = 'none';
    }

    const rankSelect = document.getElementById('claimRankSelect');
    if (state.currentClaimRank) {
      rankSelect.value = state.currentClaimRank;
      rankSelect.disabled = true;
    } else {
      rankSelect.disabled = false;
      updateVisualClaimPreview(rankSelect.value);
    }

    const isMyTurn = (state.currentTurnId === myId && !state.isResolving);
    document.getElementById('btnShowChallenge').style.display = (state.canChallenge && isMyTurn) ? 'inline-block' : 'none';
  }

  // Alerts
  const alertBanner = document.getElementById('alertBanner');
  if (state.alertKey && i18n[currentLang][state.alertKey]) {
    let msg = i18n[currentLang][state.alertKey];
    Object.keys(state.alertMeta || {}).forEach(k => { msg = msg.replace(`{${k}}`, state.alertMeta[k]); });
    alertBanner.innerText = msg;
    alertBanner.style.display = 'block';
  } else {
    alertBanner.style.display = 'none';
  }

  // Turn status
  const isMyTurn = (state.currentTurnId === myId && !state.isResolving && !state.isGameOver);
  const mySeat = document.getElementById('mySeatBox');
  const myTurnBadge = document.getElementById('myTurnBadge');
  
  if (isMyTurn) {
    mySeat.classList.add('active-turn');
    myTurnBadge.innerText = i18n[currentLang].yourTurn;
    myTurnBadge.style.color = "#f1c40f";
  } else {
    mySeat.classList.remove('active-turn');
    myTurnBadge.innerText = state.isResolving ? "Resolving..." : "Waiting...";
    myTurnBadge.style.color = "#a8d5ba";
  }

  // Opponents Placement
  const myIndex = state.playersInfo.findIndex(p => p.id === myId);
  const total = state.playersInfo.length;
  const opponents = [];
  for (let i = 1; i < total; i++) opponents.push(state.playersInfo[(myIndex + i) % total]);

  const seatIds = ['seatRight', 'seatTop', 'seatLeft', 'seatTopRight', 'seatTopLeft'];
  seatIds.forEach(id => document.getElementById(id)?.style.setProperty('display', 'none'));

  let targetSeatIds = (opponents.length === 1) ? ['seatTop'] : (opponents.length === 2) ? ['seatRight', 'seatLeft'] : (opponents.length === 3) ? ['seatRight', 'seatTop', 'seatLeft'] : ['seatRight', 'seatTopRight', 'seatTopLeft', 'seatLeft'];

  opponents.forEach((opp, i) => {
    const seatEl = document.getElementById(targetSeatIds[i]);
    if (seatEl) {
      seatEl.style.display = 'flex';
      seatEl.innerHTML = `
        <div class="seat-avatar">${opp.isBot ? '🤖' : '👤'}</div>
        <span class="seat-name">${opp.name}</span>
        <span class="seat-cards">🃏 ${opp.cardCount} ${opp.isOut ? (opp.rank ? `#${opp.rank}` : '🏆') : ''}</span>
      `;
      if (opp.id === state.currentTurnId && !state.isResolving && !state.isGameOver) seatEl.classList.add('active-turn');
      else seatEl.classList.remove('active-turn');
    }
  });

  // 3D Card Stack Layering in Center Heap
  const trickTable = document.getElementById('trickTable');
  if (!state.isResolving) {
    if (state.gameType === 'chudapatti') {
      trickTable.innerHTML = state.currentTrick.map(t => `
        <div style="display:flex; flex-direction:column; align-items:center;">
          ${getCardHTML(t.card, true)}
          <div style="font-size:10px; margin-top:3px; color:#fff;">${t.playerName}</div>
        </div>
      `).join('');
    } else if (state.gameType === 'bluff') {
      if (state.penaltyPileCount > 0) {
        let layersHTML = '';
        const visibleLayers = Math.min(state.penaltyPileCount, 6);
        for (let l = 0; l < visibleLayers; l++) {
          const rot = (l * 7 - 14);
          const offX = (l * 3);
          const offY = (l * -2);
          layersHTML += `<div class="heap-layer-card playing-card facedown-card" style="transform: translate(${offX}px, ${offY}px) rotate(${rot}deg); z-index: ${l};"></div>`;
        }
        trickTable.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center;">
            <div class="heap-3d-stack">${layersHTML}</div>
            <div style="font-size:12px; color:#f1c40f; font-weight:bold; margin-top:10px;">
              ${state.lastPlayedPlayerName ? `${state.lastPlayedPlayerName} claimed ${state.lastClaimCount}x [${state.currentClaimRank}s]` : ''}
            </div>
          </div>
        `;
      } else {
        trickTable.innerHTML = '';
      }
    }
  }

  renderMyHand();
});

setLanguage('en');