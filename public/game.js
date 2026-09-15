
var socket = null;
try {
  socket = io();
} catch (e) {
  console.error("Socket error:", e);
}

var currentRoom = null;
var selectedGame = "chudapatti";
var myCards = [];
var selectedCards = [];

function switchScreen(id) {
  document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
  var el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function getPlayerName() {
  var el = document.getElementById("global-player-name");
  return (el && el.value.trim()) ? el.value.trim() : "Player 1";
}

document.addEventListener("DOMContentLoaded", function() {
  // Step 1: Game Choice
  document.getElementById("btn-choose-chudapatti").onclick = function() {
    selectedGame = "chudapatti";
    document.getElementById("mode-header-title").innerText = "Chudapatti Game Modes";
    switchScreen("view-mode-select");
  };

  document.getElementById("btn-choose-bluff").onclick = function() {
    selectedGame = "bluff";
    document.getElementById("mode-header-title").innerText = "Bluff Game Modes";
    switchScreen("view-mode-select");
  };

  // Back Navigation
  document.getElementById("btn-back-games").onclick = function() { switchScreen("view-game-select"); };
  document.getElementById("btn-back-modes").onclick = function() { switchScreen("view-mode-select"); };

  // Bot Mode (Instant start)
  document.getElementById("btn-start-bot-mode").onclick = function() {
    var pName = getPlayerName();
    var botRoom = "BOT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoom = botRoom;

    setupArenaUI(botRoom, "Solo vs Bot (AI)", false);
    if (socket) {
      socket.emit("joinGame", { roomId: botRoom, username: pName, mode: "bot", gameType: selectedGame });
    }
  };

  // Go to Multiplayer Lobby
  document.getElementById("btn-goto-multiplayer").onclick = function() {
    switchScreen("view-multi-lobby");
  };

  // Create Room
  document.getElementById("btn-create-room").onclick = function() {
    var pName = getPlayerName();
    var newRoom = "ROOM-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    currentRoom = newRoom;

    setupArenaUI(newRoom, "Multiplayer (" + selectedGame.toUpperCase() + ")", true);
    if (socket) {
      socket.emit("joinGame", { roomId: newRoom, username: pName, mode: "multiplayer", gameType: selectedGame });
    }
  };

  // Join Room
  document.getElementById("btn-join-room").onclick = function() {
    var code = document.getElementById("input-room-code").value.trim().toUpperCase();
    if (!code) return alert("Please enter room code!");
    var pName = getPlayerName();
    currentRoom = code;

    setupArenaUI(code, "Multiplayer (" + selectedGame.toUpperCase() + ")", false);
    if (socket) {
      socket.emit("joinGame", { roomId: code, username: pName, mode: "multiplayer", gameType: selectedGame });
    }
  };

  // Host Start Match button
  document.getElementById("btn-host-start").onclick = function() {
    if (socket) socket.emit("startGame", currentRoom);
    this.style.display = "none";
  };

  // Play Selected Cards
  document.getElementById("btn-play-cards").onclick = function() {
    if (selectedCards.length === 0) return alert("Select at least 1 card from your hand!");
    var claimVal = (selectedGame === "chudapatti") ? selectedCards[0].value : document.getElementById("claim-select").value;

    if (socket) {
      socket.emit("playCards", { roomId: currentRoom, cards: selectedCards, claim: claimVal });
    }
    selectedCards = [];
    renderHand();
  };

  // Bluff Challenge
  document.getElementById("btn-challenge").onclick = function() {
    if (socket) socket.emit("challenge", { roomId: currentRoom });
  };
});

function setupArenaUI(roomCode, tag, isHost) {
  document.getElementById("display-room-code").innerText = roomCode;
  document.getElementById("display-game-tag").innerText = tag;
  document.getElementById("btn-host-start").style.display = isHost ? "inline-block" : "none";

  // Game specific controls
  var isBluff = (selectedGame === "bluff");
  document.getElementById("bluff-claim-wrapper").style.display = isBluff ? "inline-block" : "none";
  document.getElementById("btn-challenge").style.display = isBluff ? "inline-block" : "none";
  document.getElementById("claim-stat-box").style.display = isBluff ? "inline-block" : "none";

  switchScreen("view-arena");
}

if (socket) {
  socket.on("yourCards", function(cards) {
    myCards = cards;
    selectedCards = [];
    renderHand();
  });

  socket.on("gameState", function(state) {
    document.getElementById("pile-count").innerText = state.pileCount;
    document.getElementById("current-claim").innerText = state.currentClaim || "None";
    
    var cp = state.players[state.currentTurnIndex];
    document.getElementById("current-turn").innerText = cp ? cp.name : "-";

    var pl = document.getElementById("players-list");
    pl.innerHTML = "";
    state.players.forEach(function(p) {
      var li = document.createElement("li");
      li.innerText = p.name + " (" + p.cardCount + " cards)";
      pl.appendChild(li);
    });

    if (state.lastPlay) {
      document.getElementById("action-announcement").innerText = 
        "👉 " + state.lastPlay.player + " played " + state.lastPlay.cards.length + " card(s) [" + state.lastPlay.claim + "]";
    }
  });

  socket.on("timerUpdate", function(data) {
    var bar = document.getElementById("timer-bar");
    var txt = document.getElementById("timer-text");
    if (!bar || !txt) return;

    txt.innerText = data.timeLeft + "s";
    var pct = (data.timeLeft / data.total) * 100;
    bar.style.width = pct + "%";

    if (data.timeLeft <= 10) bar.style.backgroundColor = "#ef4444";
    else if (data.timeLeft <= 20) bar.style.backgroundColor = "#f59e0b";
    else bar.style.backgroundColor = "#22c55e";
  });

  socket.on("gameMessage", function(msg) {
    var ann = document.getElementById("action-announcement");
    if (ann) ann.innerText = msg;
  });

  socket.on("gameOver", function(data) {
    alert("🏆 MATCH OVER! Winner: " + data.winner);
  });
}

function renderHand() {
  var container = document.getElementById("cards-hand");
  if (!container) return;
  container.innerHTML = "";
  document.getElementById("hand-count").innerText = myCards.length;

  myCards.forEach(function(card) {
    var el = document.createElement("div");
    var isRed = (card.suit === "♥" || card.suit === "♦");
    el.className = "card " + (isRed ? "red" : "");
    el.innerHTML = "<span>" + card.value + "</span><span style="font-size:1.4rem;">" + card.suit + "</span>";

    el.onclick = function() {
      var idx = selectedCards.findIndex(function(c) { return c.value === card.value && c.suit === card.suit; });
      if (idx > -1) {
        selectedCards.splice(idx, 1);
        el.classList.remove("selected");
      } else {
        selectedCards.push(card);
        el.classList.add("selected");
      }
    };

    container.appendChild(el);
  });
}
