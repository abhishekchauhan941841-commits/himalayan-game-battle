function switchLanguage(lang) {
  if (typeof I18N !== "undefined") {
    I18N.setLang(lang);
  }
  const enBtn = document.getElementById("lang-en");
  const hiBtn = document.getElementById("lang-hi");
  if (enBtn) enBtn.classList.toggle("active", lang === "en");
  if (hiBtn) hiBtn.classList.toggle("active", lang === "hi");
}

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
  var title = document.getElementById("mode-header-title");
  if (title) {
    title.innerText = (game === "chudapatti" ? "Chudapatti" : "Bluff") + " Game Modes";
  }
  switchView("view-mode-select");
}

function startBotMatch() {
  AudioEngine.init();
  var pName = getName();
  var botSelect = document.getElementById("bot-count-select");
  var botCount = botSelect ? botSelect.value : "3";
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
  var rCode = document.getElementById("display-room-code");
  if (rCode) rCode.innerText = roomCode;

  var gTag = document.getElementById("display-game-tag");
  if (gTag) gTag.innerText = tag;

  var hStart = document.getElementById("btn-host-start");
  if (hStart) hStart.style.display = isHost ? "inline-block" : "none";

  var isBluff = (selectedGame === "bluff");
  var bWrap = document.getElementById("bluff-claim-wrapper");
  if (bWrap) bWrap.style.display = isBluff ? "inline-flex" : "none";

  var bChall = document.getElementById("btn-challenge");
  if (bChall) bChall.style.display = isBluff ? "inline-block" : "none";

  var cInd = document.getElementById("claim-indicator");
  if (cInd) cInd.style.display = isBluff ? "inline-block" : "none";

  var sInd = document.getElementById("suit-indicator");
  if (sInd) sInd.style.display = isBluff ? "none" : "inline-block";

  var tipEl = document.getElementById("hand-tip-text");
  if (tipEl) {
    if (typeof I18N !== "undefined") {
      tipEl.innerText = isBluff ? I18N.t("tipBluff") : I18N.t("tipChuda");
    } else {
      tipEl.innerText = isBluff ? "💡 Tip: Select 1 to 4 cards and play with claim value!" : "💡 Tip: Click on a card during your turn to play it!";
    }
  }

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
    showToast(typeof I18N !== "undefined" ? I18N.t("selectCardFirst") : "Please select a card first!");
    return;
  }
  var claimSelect = document.getElementById("claim-select");
  var claimVal = (selectedGame === "chudapatti") ? cardList[0].value : (claimSelect ? claimSelect.value : "2");
  if (socket) {
    socket.emit("playCards", { roomId: currentRoom, cards: cardList, claim: claimVal });
  }
  AudioEngine.playCardSlide();
  selectedCards = [];
  renderHand();
}

window.addEventListener("DOMContentLoaded", function() {
  if (typeof I18N !== "undefined") {
    switchLanguage(I18N.currentLang);
  }

  var cChuda = document.getElementById("card-chudapatti");
  if (cChuda) cChuda.onclick = function() { selectGame("chudapatti"); };

  var bChuda = document.getElementById("btn-chuda-action");
  if (bChuda) bChuda.onclick = function(e) { e.stopPropagation(); selectGame("chudapatti"); };

  var cBluff = document.getElementById("card-bluff");
  if (cBluff) cBluff.onclick = function() { selectGame("bluff"); };

  var bBluff = document.getElementById("btn-bluff-action");
  if (bBluff) bBluff.onclick = function(e) { e.stopPropagation(); selectGame("bluff"); };

  var bBackGames = document.getElementById("btn-back-to-games");
  if (bBackGames) bBackGames.onclick = function() { switchView("view-game-select"); };

  var bBackModes = document.getElementById("btn-back-to-modes");
  if (bBackModes) bBackModes.onclick = function() { switchView("view-mode-select"); };

  var bBot = document.getElementById("btn-bot-action");
  if (bBot) bBot.onclick = startBotMatch;

  var cMulti = document.getElementById("card-mode-multi");
  if (cMulti) cMulti.onclick = function() { switchView("view-multi-lobby"); };

  var bMulti = document.getElementById("btn-multi-action");
  if (bMulti) bMulti.onclick = function(e) { e.stopPropagation(); switchView("view-multi-lobby"); };

  var cCreate = document.getElementById("card-create-room");
  if (cCreate) cCreate.onclick = createRoom;

  var bCreate = document.getElementById("btn-create-room-act");
  if (bCreate) bCreate.onclick = function(e) { e.stopPropagation(); createRoom(); };

  var bJoin = document.getElementById("btn-join-room-act");
  if (bJoin) bJoin.onclick = joinRoom;

  var bHost = document.getElementById("btn-host-start");
  if (bHost) {
    bHost.onclick = function() {
      if (socket) socket.emit("startGame", currentRoom);
      this.style.display = "none";
    };
  }

  var bPlay = document.getElementById("btn-play-cards");
  if (bPlay) {
    bPlay.onclick = function() {
      sendCardPlay(selectedCards);
    };
  }

  var bChall = document.getElementById("btn-challenge");
  if (bChall) {
    bChall.onclick = function() {
      AudioEngine.playChallengeSound();
      if (socket) socket.emit("challenge", { roomId: currentRoom });
    };
  }
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
    var sDisp = document.getElementById("lead-suit-display");
    if (sDisp) sDisp.innerText = state.leadSuit || (typeof I18N !== "undefined" ? I18N.t("noneText") : "None");

    var cDisp = document.getElementById("current-claim");
    if (cDisp) cDisp.innerText = state.currentClaim || (typeof I18N !== "undefined" ? I18N.t("noneText") : "None");
    
    var cp = state.players[state.currentTurnIndex];
    var turnText = cp ? cp.name : "-";
    var tDisp = document.getElementById("current-turn");
    if (tDisp) tDisp.innerText = turnText;

    var myName = getName();
    var wasMyTurn = isMyTurn;
    isMyTurn = (cp && cp.name === myName);
    if (!wasMyTurn && isMyTurn) AudioEngine.playTurnBell();

    var layer = document.getElementById("arena-players-layer");
    if (layer) {
      layer.innerHTML = "";

      var totalPlayers = state.players.length;
      var myIndex = state.players.findIndex(function(p) { return p.name === myName; });
      if (myIndex === -1) myIndex = 0;

      state.players.forEach(function(p, i) {
        var relativeIdx = (i - myIndex + totalPlayers) % totalPlayers;
        var angle = (Math.PI / 2) - (relativeIdx * (2 * Math.PI / totalPlayers));

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
        metaSpan.innerHTML = "<strong>" + p.cardCount + "</strong> cards" + (p.isSafe ? " (" + p.rankTitle + ")" : "");

        detailsDiv.appendChild(nameSpan);
        detailsDiv.appendChild(metaSpan);

        pod.appendChild(avatarDiv);
        pod.appendChild(detailsDiv);
        layer.appendChild(pod);
      });
    }

    var feltZone = document.getElementById("trick-throw-zone");
    if (!feltZone) return;

    if (state.gameType === "chudapatti") {
      if (!state.currentTrick || state.currentTrick.length === 0) {
        var existingCards = feltZone.querySelectorAll(".thrown-card-pod");
        if (existingCards.length > 0) {
          existingCards.forEach(function(c) { c.classList.add("sweep-out"); });
          setTimeout(function() { feltZone.innerHTML = ""; }, 400);
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

    if (msg.includes("कट मारा") || msg.includes("सारे पत्ते उनको उठाने पड़े") || msg.includes("CUT") || msg.includes("BLUFF")) {
      AudioEngine.playCutHorn();
      var alertBanner = document.getElementById("cut-alert-box");
      if (alertBanner) {
        alertBanner.style.display = "block";
        alertBanner.innerText = msg.includes("BLUFF") ? "🔥 BLUFF CHALLENGE!" : "💥 CUT LAGA!";
        setTimeout(function() { alertBanner.style.display = "none"; }, 2500);
      }

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
    var res = (typeof I18N !== "undefined" ? I18N.t("matchOver") : "🏆 MATCH OVER!") + "\n\n";
    if (data.winners && data.winners.length > 0) res += (typeof I18N !== "undefined" ? I18N.t("winner1st") : "🥇 1st Winner:") + " " + data.winners[0] + "\n";
    if (data.loser) res += (data.gameType === "chudapatti" ? "❌ चुड़ा: " : "❌ Loser: ") + data.loser + "\n";
    alert(res);
  });
}

function renderHand() {
  var box = document.getElementById("cards-hand");
  if (!box) return;
  box.innerHTML = "";

  var hCount = document.getElementById("hand-count");
  if (hCount) hCount.innerText = myCards.length;

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
          showToast(typeof I18N !== "undefined" ? I18N.t("notYourTurn") : "Not your turn yet!");
        }
      } else {
        var idx = selectedCards.findIndex(function(c) { return c.value === card.value && c.suit === card.suit; });
        if (idx > -1) {
          selectedCards.splice(idx, 1);
          el.classList.remove("selected");
        } else {
          if (selectedCards.length >= 4) {
            showToast(typeof I18N !== "undefined" ? I18N.t("maxBluffCards") : "Max 4 cards at once!");
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
