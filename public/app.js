const AudioEngine = {
  ctx: null,
  init: function() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
  },
  playCardSlide: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  },
  playTurnBell: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  },
  playCutHorn: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  },
  playChallengeSound: function() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.setValueAtTime(300, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
};

var socket = null;
try { if (typeof io !== "undefined") socket = io(); } catch(e) { console.error(e); }

var currentRoom = null;
var selectedGame = "chudapatti";
var myCards = [];
var selectedCards = [];
var isMyTurn = false;
var currentPlayersState = [];

function showToast(msg) {
  var t = document.getElementById("toast-msg");
  if (!t) return;
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(function() { t.style.display = "none"; }, 2500);
}

function switchView(viewId) {
  document.querySelectorAll(".screen-view").forEach(function(v) { v.classList.remove("active"); });
  var target = document.getElementById(viewId);
  if (target) target.classList.add("active");
}

function getName() {
  var inp = document.getElementById("global-player-name");
  return (inp && inp.value.trim()) ? inp.value.trim() : "Player 1";
}

function selectGame(game) {
  selectedGame = game;
  document.getElementById("mode-header-title").innerText = (game === "chudapatti" ? "Chudapatti" : "Bluff") + " Game Modes";
  switchView("view-mode-select");
}

function startBotMatch() {
  AudioEngine.init();
  var pName = getName();
  var botCount = document.getElementById("bot-count-select").value;
  var botRoom = "BOT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  currentRoom = botRoom;
  setupArena(botRoom, "Solo vs " + botCount + " Bots (" + (selectedGame === "chudapatti" ? "Chudapatti" : "Bluff") + ")", false);
  if (socket) {
    socket.emit("joinGame", { roomId: botRoom, username: pName, mode: "bot", gameType: selectedGame, botCount: botCount });
  }
}

function createRoom() {
  AudioEngine.init();
  var pName = getName();
  var newRoom = "ROOM-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  currentRoom = newRoom;
  setupArena(newRoom, "Multiplayer (" + (selectedGame === "chudapatti" ? "Chudapatti" : "Bluff") + ")", true);
  if (socket) socket.emit("joinGame", { roomId: newRoom, username: pName, mode: "multiplayer", gameType: selectedGame });
}

function joinRoom() {
  AudioEngine.init();
  var inp = document.getElementById("input-room-code");
  var code = inp ? inp.value.trim().toUpperCase() : "";
  if (!code) return alert("Please enter room code!");
  var pName = getName();
  currentRoom = code;
  setupArena(code, "Multiplayer (" + (selectedGame === "chudapatti" ? "Chudapatti" : "Bluff") + ")", false);
  if (socket) socket.emit("joinGame", { roomId: code, username: pName, mode: "multiplayer", gameType: selectedGame });
}

function setupArena(roomCode, tag, isHost) {
  document.getElementById("display-room-code").innerText = roomCode;
  document.getElementById("display-game-tag").innerText = tag;
  document.getElementById("btn-host-start").style.display = isHost ? "inline-block" : "none";

  var isBluff = (selectedGame === "bluff");
  document.getElementById("bluff-claim-wrapper").style.display = isBluff ? "inline-flex" : "none";
  document.getElementById("btn-challenge").style.display = isBluff ? "inline-block" : "none";
  document.getElementById("claim-indicator").style.display = isBluff ? "inline-block" : "none";
  document.getElementById("suit-indicator").style.display = isBluff ? "none" : "inline-block";
  document.getElementById("hand-tip-text").innerText = isBluff ? "💡 Tip: 1 से 4 पत्ते सेलेक्ट करके क्लेम के साथ फेंकें!" : "💡 Tip: अपनी बारी आने पर पत्ते पर क्लिक करें!";

  switchView("view-arena");
}

function createCardElement(card) {
  var el = document.createElement("div");
  var isRed = (card.suit === "♥" || card.suit === "♦");
  el.className = "card " + (isRed ? "red" : "");

  var topPip = document.createElement("div");
  topPip.className = "card-pip-top";
  topPip.innerHTML = "<span>" + card.value + "</span><span>" + card.suit + "</span>";

  var centerSuit = document.createElement("div");
  centerSuit.className = "card-center-suit";
  centerSuit.innerText = card.suit;

  var botPip = document.createElement("div");
  botPip.className = "card-pip-bottom";
  botPip.innerHTML = "<span>" + card.value + "</span><span>" + card.suit + "</span>";

  el.appendChild(topPip);
  el.appendChild(centerSuit);
  el.appendChild(botPip);
  return el;
}

function createFaceDownCard() {
  var el = document.createElement("div");
  el.className = "card card-facedown";
  el.innerHTML = "<div class='card-back-pattern'>♠♥♦♣</div>";
  return el;
}

function sendCardPlay(cardList) {
  if (!cardList || cardList.length === 0) {
    showToast("पहले एक पत्ता चुनें!");
    return;
  }
  var claimVal = (selectedGame === "chudapatti") ? cardList[0].value : document.getElementById("claim-select").value;
  if (socket) {
    socket.emit("playCards", { roomId: currentRoom, cards: cardList, claim: claimVal });
  }
  AudioEngine.playCardSlide();
  selectedCards = [];
  renderHand();
}

window.addEventListener("DOMContentLoaded", function() {
  document.getElementById("card-chudapatti").onclick = function() { selectGame("chudapatti"); };
  document.getElementById("btn-chuda-action").onclick = function(e) { e.stopPropagation(); selectGame("chudapatti"); };

  document.getElementById("card-bluff").onclick = function() { selectGame("bluff"); };
  document.getElementById("btn-bluff-action").onclick = function(e) { e.stopPropagation(); selectGame("bluff"); };

  document.getElementById("btn-back-to-games").onclick = function() { switchView("view-game-select"); };
  document.getElementById("btn-back-to-modes").onclick = function() { switchView("view-mode-select"); };

  document.getElementById("btn-bot-action").onclick = startBotMatch;

  document.getElementById("card-mode-multi").onclick = function() { switchView("view-multi-lobby"); };
  document.getElementById("btn-multi-action").onclick = function(e) { e.stopPropagation(); switchView("view-multi-lobby"); };

  document.getElementById("card-create-room").onclick = createRoom;
  document.getElementById("btn-create-room-act").onclick = function(e) { e.stopPropagation(); createRoom(); };
  document.getElementById("btn-join-room-act").onclick = joinRoom;

  document.getElementById("btn-host-start").onclick = function() {
    if (socket) socket.emit("startGame", currentRoom);
    this.style.display = "none";
  };

  document.getElementById("btn-play-cards").onclick = function() {
    sendCardPlay(selectedCards);
  };

  document.getElementById("btn-challenge").onclick = function() {
    AudioEngine.playChallengeSound();
    if (socket) socket.emit("challenge", { roomId: currentRoom });
  };
});

if (socket) {
  socket.on("yourCards", function(cards) {
    myCards = cards;
    selectedCards = [];
    renderHand();
  });

  socket.on("turnError", function(errMsg) {
    showToast(errMsg);
  });

  socket.on("gameState", function(state) {
    currentPlayersState = state.players;
    document.getElementById("lead-suit-display").innerText = state.leadSuit || "कोई नहीं";
    document.getElementById("current-claim").innerText = state.currentClaim || "None";
    
    var cp = state.players[state.currentTurnIndex];
    var turnText = cp ? cp.name : "-";
    document.getElementById("current-turn").innerText = turnText;

    var myName = getName();
    var wasMyTurn = isMyTurn;
    isMyTurn = (cp && cp.name === myName);
    if (!wasMyTurn && isMyTurn) AudioEngine.playTurnBell();

    var layer = document.getElementById("arena-players-layer");
    layer.innerHTML = "";

    var totalPlayers = state.players.length;
    var myIndex = state.players.findIndex(function(p) { return p.name === myName; });
    if (myIndex === -1) myIndex = 0;

    state.players.forEach(function(p, i) {
      var relativeIdx = (i - myIndex + totalPlayers) % totalPlayers;
      var angle = (Math.PI / 2) + (relativeIdx * (2 * Math.PI / totalPlayers));

      var xPercent = 50 + 44 * Math.cos(angle);
      var yPercent = 50 + 42 * Math.sin(angle);

      var isCurrent = (cp && cp.name === p.name);
      var pod = document.createElement("div");
      pod.className = "player-pod " + (isCurrent ? "active-turn" : "");
      pod.id = "pod-player-" + i;
      pod.style.left = xPercent + "%";
      pod.style.top = yPercent + "%";

      var avatarDiv = document.createElement("div");
      avatarDiv.className = "pod-avatar";
      avatarDiv.innerText = p.isBot ? "🤖" : "👤";

      var detailsDiv = document.createElement("div");
      detailsDiv.className = "pod-details";

      var nameSpan = document.createElement("span");
      nameSpan.className = "pod-name";
      nameSpan.innerText = p.name;

      var metaSpan = document.createElement("span");
      metaSpan.className = "pod-meta";
      metaSpan.innerHTML = "<strong>" + p.cardCount + "</strong> पत्ते" + (p.isSafe ? " (" + p.rankTitle + ")" : "");

      detailsDiv.appendChild(nameSpan);
      detailsDiv.appendChild(metaSpan);

      pod.appendChild(avatarDiv);
      pod.appendChild(detailsDiv);
      layer.appendChild(pod);
    });

    var feltZone = document.getElementById("trick-throw-zone");

    // Chudapatti trick render
    if (state.gameType === "chudapatti") {
      if (!state.currentTrick || state.currentTrick.length === 0) {
        var existingCards = feltZone.querySelectorAll(".thrown-card-pod");
        if (existingCards.length > 0) {
          existingCards.forEach(function(c) { c.classList.add("sweep-out"); });
          setTimeout(() => { feltZone.innerHTML = ""; }, 400);
        } else {
          feltZone.innerHTML = "";
        }
        return;
      }

      var prevCount = feltZone.querySelectorAll(".thrown-card-pod").length;
      if (state.currentTrick.length > prevCount) AudioEngine.playCardSlide();

      feltZone.innerHTML = "";
      state.currentTrick.forEach(function(t) {
        var box = document.createElement("div");
        box.className = "thrown-card-pod";

        var label = document.createElement("div");
        label.className = "thrown-player-badge";
        label.innerText = t.playerName;

        var cardEl = createCardElement(t.card);
        box.appendChild(label);
        box.appendChild(cardEl);
        feltZone.appendChild(box);
      });
    } else {
      // BLUFF: Render Face-down mystery cards in center with count & claim
      feltZone.innerHTML = "";
      if (state.pileCount > 0) {
        var pileBox = document.createElement("div");
        pileBox.className = "thrown-card-pod";

        var label = document.createElement("div");
        label.className = "thrown-player-badge";
        label.innerText = (state.lastPlay ? state.lastPlay.player + " claimed " + state.lastPlay.cards.length + "x [" + state.lastPlay.claim + "]" : "Pile: " + state.pileCount + " cards");

        var cardEl = createFaceDownCard();
        pileBox.appendChild(label);
        pileBox.appendChild(cardEl);
        feltZone.appendChild(pileBox);
      }
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

    if (msg.includes("कट मारा") || msg.includes("सारे पत्ते उनको उठाने पड़े") || msg.includes("BLUFF पकड़ा")) {
      AudioEngine.playCutHorn();
      var alertBanner = document.getElementById("cut-alert-box");
      alertBanner.style.display = "block";
      alertBanner.innerText = msg.includes("BLUFF") ? "🔥 BLUFF CHALLENGE!" : "💥 CUT LAGA!";
      setTimeout(function() { alertBanner.style.display = "none"; }, 2500);

      if (currentPlayersState && currentPlayersState.length > 0) {
        currentPlayersState.forEach(function(p, idx) {
          if (msg.includes(p.name)) {
            var targetPod = document.getElementById("pod-player-" + idx);
            if (targetPod) {
              targetPod.classList.add("cut-target");
              setTimeout(function() { targetPod.classList.remove("cut-target"); }, 2400);
            }
          }
        });
      }

      var existingCards = document.querySelectorAll("#trick-throw-zone .thrown-card-pod");
      existingCards.forEach(function(c) { c.classList.add("penalty-out"); });
    }
  });

  socket.on("gameOver", function(data) {
    var res = "🏆 मैच समाप्त!\n\n";
    if (data.winners && data.winners.length > 0) res += "🥇 1st Winner: " + data.winners[0] + "\n";
    if (data.loser) res += "❌ " + (data.gameType === "chudapatti" ? "चुड़ा: " : "Loser: ") + data.loser + "\n";
    alert(res);
  });
}

function renderHand() {
  var box = document.getElementById("cards-hand");
  if (!box) return;
  box.innerHTML = "";
  document.getElementById("hand-count").innerText = myCards.length;

  myCards.forEach(function(card) {
    var el = createCardElement(card);
    var isSel = selectedCards.some(function(c) { return c.value === card.value && c.suit === card.suit; });
    if (isSel) el.classList.add("selected");

    el.onclick = function() {
      if (selectedGame === "chudapatti") {
        if (isMyTurn) {
          sendCardPlay([card]);
        } else {
          selectedCards = [card];
          document.querySelectorAll("#cards-hand .card").forEach(function(c) { c.classList.remove("selected"); });
          el.classList.add("selected");
          showToast("अभी आपकी चाल नहीं है! अपनी बारी का इंतज़ार करें।");
        }
      } else {
        // Bluff: Multi-card selection (up to 4 cards)
        var idx = selectedCards.findIndex(function(c) { return c.value === card.value && c.suit === card.suit; });
        if (idx > -1) {
          selectedCards.splice(idx, 1);
          el.classList.remove("selected");
        } else {
          if (selectedCards.length >= 4) {
            showToast("एक बारी में अधिकतम 4 पत्ते ही फेंक सकते हैं!");
            return;
          }
          selectedCards.push(card);
          el.classList.add("selected");
        }
      }
    };

    box.appendChild(el);
  });
}
