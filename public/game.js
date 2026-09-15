
// Immediate screen switcher
window.showScreen = function(id) {
  var screens = document.querySelectorAll(".screen-view");
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove("active");
  }
  var target = document.getElementById(id);
  if (target) target.classList.add("active");
};

window.selectGame = function(name) {
  var title = document.getElementById("selected-game-title");
  if (title) title.innerText = (name === "chudapatti" ? "Chudapatti" : "Bluff") + " Battle Modes";
  window.selectedGame = name;
  window.showScreen("screen-mode-select");
};

window.selectedGame = "chudapatti";
window.currentRoom = null;
window.myName = "Player";
window.myCards = [];
window.selectedCards = [];

// Socket initialization
var socket = null;
try {
  if (typeof io !== "undefined") {
    socket = io();
  }
} catch(e) {
  console.log("Socket init fallback:", e);
}

function initListeners() {
  var chuda = document.getElementById("card-chudapatti");
  if (chuda) {
    chuda.onclick = function() { window.selectGame("chudapatti"); };
  }
  var btnChuda = document.getElementById("btn-select-chudapatti");
  if (btnChuda) {
    btnChuda.onclick = function(e) { e.stopPropagation(); window.selectGame("chudapatti"); };
  }

  var bluff = document.getElementById("card-bluff");
  if (bluff) {
    bluff.onclick = function() { window.selectGame("bluff"); };
  }
  var btnBluff = document.getElementById("btn-select-bluff");
  if (btnBluff) {
    btnBluff.onclick = function(e) { e.stopPropagation(); window.selectGame("bluff"); };
  }

  var backBtn1 = document.getElementById("btn-back-to-games");
  if (backBtn1) backBtn1.onclick = function() { window.showScreen("screen-game-select"); };

  var backBtn2 = document.getElementById("btn-back-to-modes");
  if (backBtn2) backBtn2.onclick = function() { window.showScreen("screen-mode-select"); };

  var botCard = document.getElementById("card-bot-mode");
  var botBtn = document.getElementById("btn-mode-bot");
  var launchBot = function() {
    var pName = prompt("Enter your name:", "Player") || "Player";
    window.myName = pName;
    var botRoom = "BOT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    window.currentRoom = botRoom;
    if (socket) socket.emit("createOrJoin", { roomId: botRoom, username: window.myName, mode: "bot", gameType: window.selectedGame });
    document.getElementById("arena-room-id").innerText = botRoom;
    document.getElementById("arena-mode-tag").innerText = "Solo vs Bot";
    document.getElementById("btn-start-match").style.display = "inline-block";
    window.showScreen("screen-game-arena");
  };
  if (botCard) botCard.onclick = launchBot;
  if (botBtn) botBtn.onclick = function(e) { e.stopPropagation(); launchBot(); };

  var multiCard = document.getElementById("card-multi-mode");
  var multiBtn = document.getElementById("btn-mode-multi");
  var launchMulti = function() { window.showScreen("screen-multiplayer-lobby"); };
  if (multiCard) multiCard.onclick = launchMulti;
  if (multiBtn) multiBtn.onclick = function(e) { e.stopPropagation(); launchMulti(); };

  var createRoom = document.getElementById("btn-create-room");
  if (createRoom) {
    createRoom.onclick = function() {
      var name = document.getElementById("player-name-input").value.trim();
      if (!name) return alert("Please enter your player name first!");
      window.myName = name;
      var newRoom = "HMB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      window.currentRoom = newRoom;
      if (socket) socket.emit("createOrJoin", { roomId: newRoom, username: window.myName, mode: "multiplayer", gameType: window.selectedGame });
      document.getElementById("arena-room-id").innerText = newRoom;
      document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
      document.getElementById("btn-start-match").style.display = "inline-block";
      window.showScreen("screen-game-arena");
    };
  }

  var joinRoom = document.getElementById("btn-join-room");
  if (joinRoom) {
    joinRoom.onclick = function() {
      var name = document.getElementById("player-name-input").value.trim();
      var code = document.getElementById("join-room-code-input").value.trim();
      if (!name) return alert("Enter player name!");
      if (!code) return alert("Enter room code!");
      window.myName = name;
      window.currentRoom = code;
      if (socket) socket.emit("createOrJoin", { roomId: code, username: window.myName, mode: "multiplayer", gameType: window.selectedGame });
      document.getElementById("arena-room-id").innerText = code;
      document.getElementById("arena-mode-tag").innerText = "Online Multiplayer";
      document.getElementById("btn-start-match").style.display = "none";
      window.showScreen("screen-game-arena");
    };
  }

  var startBtn = document.getElementById("btn-start-match");
  if (startBtn) {
    startBtn.onclick = function() {
      if (socket) socket.emit("startGame", window.currentRoom);
      startBtn.style.display = "none";
    };
  }

  var playBtn = document.getElementById("btn-play-cards");
  if (playBtn) {
    playBtn.onclick = function() {
      if (window.selectedCards.length === 0) return alert("Select at least 1 card!");
      var claim = document.getElementById("claim-select").value;
      if (socket) socket.emit("playCards", { roomId: window.currentRoom, cards: window.selectedCards, claim: claim });
      window.selectedCards = [];
      renderHand();
    };
  }

  var chalBtn = document.getElementById("btn-challenge");
  if (chalBtn) {
    chalBtn.onclick = function() {
      if (socket) socket.emit("challenge", { roomId: window.currentRoom });
    };
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initListeners);
} else {
  initListeners();
}

if (socket) {
  socket.on("yourCards", function(cards) {
    window.myCards = cards;
    window.selectedCards = [];
    renderHand();
  });

  socket.on("gameState", function(state) {
    document.getElementById("pile-count").innerText = state.pileCount;
    document.getElementById("current-claim").innerText = state.currentClaim || "None";
    var currentP = state.players[state.currentTurnIndex];
    document.getElementById("current-turn").innerText = currentP ? currentP.name : "-";

    var pList = document.getElementById("players-list");
    pList.innerHTML = "";
    state.players.forEach(function(p) {
      var li = document.createElement("li");
      li.innerText = p.name + " (" + p.cardCount + " cards)";
      pList.appendChild(li);
    });

    if (state.lastPlay) {
      document.getElementById("action-announcement").innerText = 
        "👉 " + state.lastPlay.player + " played " + state.lastPlay.cards.length + " card(s) claiming "" + state.lastPlay.claim + """;
    }
  });

  socket.on("timerUpdate", function(data) {
    var bar = document.getElementById("timer-bar");
    var text = document.getElementById("timer-text");
    if (!bar || !text) return;
    text.innerText = data.timeLeft + "s";
    var percent = (data.timeLeft / data.total) * 100;
    bar.style.width = percent + "%";
    if (data.timeLeft <= 10) bar.style.backgroundColor = "#ef4444";
    else if (data.timeLeft <= 20) bar.style.backgroundColor = "#eab308";
    else bar.style.backgroundColor = "#22c55e";
  });

  socket.on("gameMessage", function(msg) {
    var ann = document.getElementById("action-announcement");
    if (ann) ann.innerText = msg;
  });

  socket.on("gameOver", function(res) {
    alert("🏆 MATCH OVER! Winner is: " + res.winner);
  });
}

function renderHand() {
  var container = document.getElementById("cards-hand");
  if (!container) return;
  container.innerHTML = "";
  document.getElementById("hand-count").innerText = window.myCards.length;

  window.myCards.forEach(function(card) {
    var cardEl = document.createElement("div");
    var isRed = card.suit === "♥" || card.suit === "♦";
    cardEl.className = "card " + (isRed ? "red" : "");
    cardEl.innerText = card.value + card.suit;

    cardEl.onclick = function() {
      var idx = window.selectedCards.findIndex(function(c) { return c.value === card.value && c.suit === card.suit; });
      if (idx > -1) {
        window.selectedCards.splice(idx, 1);
        cardEl.classList.remove("selected");
      } else {
        window.selectedCards.push(card);
        cardEl.classList.add("selected");
      }
    };

    container.appendChild(cardEl);
  });
}
