const socket = io();

let currentRoom = null;
let myName = "Player";
let selectedGame = "chudapatti";
let selectedMode = "multiplayer";
let myCards = [];
let selectedCards = [];

function showScreen(screenId) {
  document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

function selectGame(game) {
  selectedGame = game;
  document.getElementById("selected-game-title").innerText = (game === "chudapatti" ? "Chudapatti (Bluff)" : "Bagh-Chal") + " Battle Modes";
  showScreen("screen-mode-select");
}

function startBotMode() {
  selectedMode = "bot";
  const nameInput = prompt("Enter your name:", "Player") || "Player";
  myName = nameInput.trim();
  const botRoomId = "BOT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  currentRoom = botRoomId;

  socket.emit("createOrJoin", { roomId: botRoomId, username: myName, mode: "bot", gameType: selectedGame });
  
  document.getElementById("arena-room-id").innerText = botRoomId;
  document.getElementById("arena-mode-tag").innerText = "Solo vs Bot";
  document.getElementById("btn-start-match").style.display = "inline-block";
  showScreen("screen-game-arena");
}

function createRoomAction() {
  const name = document.getElementById("player-name-input").value.trim();
  if (!name) return alert("Please enter your player name first!");
  myName = name;
  selectedMode = "multiplayer";

  const newRoomId = "HMB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  currentRoom = newRoomId;

  socket.emit("createOrJoin", { roomId: newRoomId, username: myName, mode: "multiplayer", gameType: selectedGame });

  document.getElementById("arena-room-id").innerText = newRoomId;
  document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
  document.getElementById("btn-start-match").style.display = "inline-block";
  showScreen("screen-game-arena");
}

function joinRoomAction() {
  const name = document.getElementById("player-name-input").value.trim();
  const roomCode = document.getElementById("join-room-code-input").value.trim();
  if (!name) return alert("Please enter your player name!");
  if (!roomCode) return alert("Please enter a room code!");

  myName = name;
  currentRoom = roomCode;
  selectedMode = "multiplayer";

  socket.emit("createOrJoin", { roomId: roomCode, username: myName, mode: "multiplayer", gameType: selectedGame });

  document.getElementById("arena-room-id").innerText = roomCode;
  document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
  document.getElementById("btn-start-match").style.display = "none";
  showScreen("screen-game-arena");
}

function startMatchAction() {
  socket.emit("startGame", currentRoom);
  document.getElementById("btn-start-match").style.display = "none";
}

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
      "👉 " + state.lastPlay.player + " played " + state.lastPlay.cards.length + " card(s) claiming "" + state.lastPlay.claim + """;
  }
});

socket.on("timerUpdate", ({ timeLeft, total }) => {
  const bar = document.getElementById("timer-bar");
  const text = document.getElementById("timer-text");

  text.innerText = timeLeft + "s";
  const percent = (timeLeft / total) * 100;
  bar.style.width = percent + "%";

  if (timeLeft <= 10) bar.style.backgroundColor = "#ef4444";
  else if (timeLeft <= 20) bar.style.backgroundColor = "#eab308";
  else bar.style.backgroundColor = "#22c55e";
});

socket.on("gameMessage", (msg) => {
  document.getElementById("action-announcement").innerText = msg;
});

socket.on("gameOver", ({ winner }) => {
  alert("🏆 MATCH OVER! Winner is: " + winner);
});

function playSelectedCards() {
  if (selectedCards.length === 0) return alert("Select at least 1 card from hand!");
  const claim = document.getElementById("claim-select").value;
  socket.emit("playCards", { roomId: currentRoom, cards: selectedCards, claim });
  selectedCards = [];
  renderHand();
}

function challengeBluff() {
  socket.emit("challenge", { roomId: currentRoom });
}

function renderHand() {
  const container = document.getElementById("cards-hand");
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
