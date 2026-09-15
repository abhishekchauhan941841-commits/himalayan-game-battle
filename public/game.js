
let socket = null;
try {
  socket = io();
} catch (e) {
  console.warn("Socket.io loading deferred or offline mode active", e);
}

let currentRoom = null;
let myName = "Player";
let selectedGame = "chudapatti";
let selectedMode = "multiplayer";
let myCards = [];
let selectedCards = [];

function showScreen(screenId) {
  document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");
}

function selectGame(game) {
  selectedGame = game;
  const title = document.getElementById("selected-game-title");
  if (title) title.innerText = (game === "chudapatti" ? "Chudapatti" : "Bluff") + " Battle Modes";
  showScreen("screen-mode-select");
}

document.addEventListener("DOMContentLoaded", () => {
  // Game Select Clicks
  const chudaCard = document.getElementById("card-chudapatti");
  const chudaBtn = document.getElementById("btn-select-chudapatti");
  if (chudaCard) chudaCard.addEventListener("click", () => selectGame("chudapatti"));
  if (chudaBtn) chudaBtn.addEventListener("click", (e) => { e.stopPropagation(); selectGame("chudapatti"); });

  const bluffCard = document.getElementById("card-bluff");
  const bluffBtn = document.getElementById("btn-select-bluff");
  if (bluffCard) bluffCard.addEventListener("click", () => selectGame("bluff"));
  if (bluffBtn) bluffBtn.addEventListener("click", (e) => { e.stopPropagation(); selectGame("bluff"); });

  // Navigation Back buttons
  const backToGames = document.getElementById("btn-back-to-games");
  if (backToGames) backToGames.addEventListener("click", () => showScreen("screen-game-select"));

  const backToModes = document.getElementById("btn-back-to-modes");
  if (backToModes) backToModes.addEventListener("click", () => showScreen("screen-mode-select"));

  // Mode selections
  const botCard = document.getElementById("card-bot-mode");
  const botBtn = document.getElementById("btn-mode-bot");
  const startBot = () => {
    selectedMode = "bot";
    const nameInput = prompt("Enter your name:", "Player") || "Player";
    myName = nameInput.trim();
    const botRoomId = "BOT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoom = botRoomId;

    if (socket) socket.emit("createOrJoin", { roomId: botRoomId, username: myName, mode: "bot", gameType: selectedGame });
    document.getElementById("arena-room-id").innerText = botRoomId;
    document.getElementById("arena-mode-tag").innerText = "Solo vs Bot";
    document.getElementById("btn-start-match").style.display = "inline-block";
    showScreen("screen-game-arena");
  };
  if (botCard) botCard.addEventListener("click", startBot);
  if (botBtn) botBtn.addEventListener("click", (e) => { e.stopPropagation(); startBot(); });

  const multiCard = document.getElementById("card-multi-mode");
  const multiBtn = document.getElementById("btn-mode-multi");
  const goMulti = () => showScreen("screen-multiplayer-lobby");
  if (multiCard) multiCard.addEventListener("click", goMulti);
  if (multiBtn) multiBtn.addEventListener("click", (e) => { e.stopPropagation(); goMulti(); });

  // Multiplayer Actions
  const createBtn = document.getElementById("btn-create-room");
  if (createBtn) createBtn.addEventListener("click", () => {
    const name = document.getElementById("player-name-input").value.trim();
    if (!name) return alert("Please enter your player name first!");
    myName = name;
    selectedMode = "multiplayer";
    const newRoomId = "HMB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    currentRoom = newRoomId;

    if (socket) socket.emit("createOrJoin", { roomId: newRoomId, username: myName, mode: "multiplayer", gameType: selectedGame });
    document.getElementById("arena-room-id").innerText = newRoomId;
    document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
    document.getElementById("btn-start-match").style.display = "inline-block";
    showScreen("screen-game-arena");
  });

  const joinBtn = document.getElementById("btn-join-room");
  if (joinBtn) joinBtn.addEventListener("click", () => {
    const name = document.getElementById("player-name-input").value.trim();
    const roomCode = document.getElementById("join-room-code-input").value.trim();
    if (!name) return alert("Please enter your player name!");
    if (!roomCode) return alert("Please enter a room code!");
    myName = name;
    currentRoom = roomCode;
    selectedMode = "multiplayer";

    if (socket) socket.emit("createOrJoin", { roomId: roomCode, username: myName, mode: "multiplayer", gameType: selectedGame });
    document.getElementById("arena-room-id").innerText = roomCode;
    document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
    document.getElementById("btn-start-match").style.display = "none";
    showScreen("screen-game-arena");
  });

  // Gameplay Buttons
  const startMatchBtn = document.getElementById("btn-start-match");
  if (startMatchBtn) startMatchBtn.addEventListener("click", () => {
    if (socket) socket.emit("startGame", currentRoom);
    startMatchBtn.style.display = "none";
  });

  const playCardsBtn = document.getElementById("btn-play-cards");
  if (playCardsBtn) playCardsBtn.addEventListener("click", () => {
    if (selectedCards.length === 0) return alert("Select at least 1 card from hand!");
    const claim = document.getElementById("claim-select").value;
    if (socket) socket.emit("playCards", { roomId: currentRoom, cards: selectedCards, claim });
    selectedCards = [];
    renderHand();
  });

  const challengeBtn = document.getElementById("btn-challenge");
  if (challengeBtn) challengeBtn.addEventListener("click", () => {
    if (socket) socket.emit("challenge", { roomId: currentRoom });
  });
});

if (socket) {
  socket.on("yourCards", (cards) => {
    myCards = cards;
    selectedCards = [];
    renderHand();
  });

  socket.on("gameState", (state) => {
    document.getElementById("pile-count").innerText = state.pileCount;
    document.getElementById("current-claim").innerText = state.currentClaim || "None";
    const currentP = state.players[state.currentTurnIndex];
    document.getElementById("current-turn").innerText = currentP ? currentP.name : "-";

    const pList = document.getElementById("players-list");
    pList.innerHTML = "";
    state.players.forEach(p => {
      const li = document.createElement("li");
      li.innerText = p.name + " (" + p.cardCount + " cards)";
      pList.appendChild(li);
    });

    if (state.lastPlay) {
      document.getElementById("action-announcement").innerText = 
        "👉 " + state.lastPlay.player + " played " + state.lastPlay.cards.length + " card(s) claiming \"" + state.lastPlay.claim + "\"";
    }
  });

  socket.on("timerUpdate", ({ timeLeft, total }) => {
    const bar = document.getElementById("timer-bar");
    const text = document.getElementById("timer-text");
    if (!bar || !text) return;
    text.innerText = timeLeft + "s";
    const percent = (timeLeft / total) * 100;
    bar.style.width = percent + "%";
    if (timeLeft <= 10) bar.style.backgroundColor = "#ef4444";
    else if (timeLeft <= 20) bar.style.backgroundColor = "#eab308";
    else bar.style.backgroundColor = "#22c55e";
  });

  socket.on("gameMessage", (msg) => {
    const ann = document.getElementById("action-announcement");
    if (ann) ann.innerText = msg;
  });

  socket.on("gameOver", ({ winner }) => {
    alert("🏆 MATCH OVER! Winner is: " + winner);
  });
}

function renderHand() {
  const container = document.getElementById("cards-hand");
  if (!container) return;
  container.innerHTML = "";
  document.getElementById("hand-count").innerText = myCards.length;

  myCards.forEach(card => {
    const cardEl = document.createElement("div");
    const isRed = card.suit === "♥" || card.suit === "♦";
    cardEl.className = "card " + (isRed ? "red" : "");
    cardEl.innerText = card.value + card.suit;

    cardEl.addEventListener("click", () => {
      const idx = selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
      if (idx > -1) {
        selectedCards.splice(idx, 1);
        cardEl.classList.remove("selected");
      } else {
        selectedCards.push(card);
        cardEl.classList.add("selected");
      }
    });

    container.appendChild(cardEl);
  });
}
