require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log(" Connected to MongoDB Atlas!"))
    .catch(err => console.error(" Mongo Error:", err));
}

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};
const TURN_TIMEOUT_SEC = 30;

const CARD_RANKS = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck = [];
  for (let s of suits) {
    for (let v of values) deck.push({ suit: s, value: v });
  }
  return deck.sort(() => Math.random() - 0.5);
}

function sanitizeState(room) {
  return {
    id: room.id,
    gameType: room.gameType,
    isBotGame: room.isBotGame,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.cards.length,
      isBot: p.isBot,
      isSafe: p.isSafe,
      rankTitle: p.rankTitle || ""
    })),
    currentTurnIndex: room.currentTurnIndex,
    leadSuit: room.leadSuit,
    currentTrick: room.currentTrick,
    pileCount: room.pile.length,
    lastPlay: room.lastPlay,
    gameActive: room.gameActive,
    winners: room.winners,
    loser: room.loser
  };
}

function getActivePlayers(room) {
  return room.players.filter(p => !p.isSafe);
}

function startTurnTimer(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive) return;

  if (room.timer) clearInterval(room.timer);
  room.timeLeft = TURN_TIMEOUT_SEC;
  io.to(roomId).emit("timerUpdate", { timeLeft: room.timeLeft, total: TURN_TIMEOUT_SEC });

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.isSafe) return;

  // Bot Turn Trigger
  if (currentPlayer.isBot) {
    setTimeout(() => {
      executeBotTurn(roomId);
    }, 1200);
    return;
  }

  room.timer = setInterval(() => {
    room.timeLeft -= 1;
    io.to(roomId).emit("timerUpdate", { timeLeft: room.timeLeft, total: TURN_TIMEOUT_SEC });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      handleTimeout(roomId);
    }
  }, 1000);
}

function handleTimeout(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive || room.isResolving) return;

  const cp = room.players[room.currentTurnIndex];
  if (!cp || cp.isSafe || cp.cards.length === 0) return;

  io.to(roomId).emit("gameMessage", `⏰ ${cp.name} का टाइम खत्म!`);

  let cardToPlay;
  if (room.gameType === "chudapatti" && room.leadSuit) {
    const matching = cp.cards.find(c => c.suit === room.leadSuit);
    cardToPlay = matching || cp.cards[0];
  } else {
    cardToPlay = cp.cards[0];
  }

  playTurn(roomId, cp.id, [cardToPlay], cardToPlay.value);
}

function executeBotTurn(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive || room.isResolving) return;

  const bot = room.players[room.currentTurnIndex];
  if (!bot || !bot.isBot || bot.isSafe || bot.cards.length === 0) return;

  if (room.gameType === "bluff") {
    if (room.lastPlay && Math.random() < 0.25) {
      handleChallenge(roomId, bot.id);
      return;
    }
    const claim = room.currentClaim || bot.cards[0].value;
    const match = bot.cards.find(c => c.value === claim);
    const card = match || bot.cards[0];
    playTurn(roomId, bot.id, [card], claim);
    return;
  }

  // Chudapatti Bot Move
  let cardToPlay;
  if (room.isFirstTurn) {
    const aceSpade = bot.cards.find(c => c.suit === "♠" && c.value === "A");
    cardToPlay = aceSpade || bot.cards[0];
  } else if (room.leadSuit) {
    const sameSuitCards = bot.cards.filter(c => c.suit === room.leadSuit);
    if (sameSuitCards.length > 0) {
      sameSuitCards.sort((a, b) => CARD_RANKS[a.value] - CARD_RANKS[b.value]);
      cardToPlay = sameSuitCards[0];
    } else {
      const otherCards = [...bot.cards].sort((a, b) => CARD_RANKS[b.value] - CARD_RANKS[a.value]);
      cardToPlay = otherCards[0];
    }
  } else {
    const sorted = [...bot.cards].sort((a, b) => CARD_RANKS[a.value] - CARD_RANKS[b.value]);
    cardToPlay = sorted[0];
  }

  playTurn(roomId, bot.id, [cardToPlay], cardToPlay.value);
}

function dealAndStart(roomId) {
  const room = rooms[roomId];
  if (!room || room.players.length < 2) return;

  const deck = createDeck();
  const numPlayers = room.players.length;

  room.players.forEach(p => { p.cards = []; p.isSafe = false; p.rankTitle = ""; });
  deck.forEach((card, idx) => {
    room.players[idx % numPlayers].cards.push(card);
  });

  room.gameActive = true;
  room.isResolving = false;
  room.currentTrick = [];
  room.pile = [];
  room.winners = [];
  room.loser = null;
  room.lastPlay = null;
  room.leadSuit = null;
  room.currentClaim = null;

  if (room.gameType === "chudapatti") {
    room.isFirstTurn = true;
    let starterIndex = 0;
    room.players.forEach((p, idx) => {
      if (p.cards.some(c => c.suit === "♠" && c.value === "A")) {
        starterIndex = idx;
      }
    });
    room.currentTurnIndex = starterIndex;
    const starter = room.players[starterIndex];
    io.to(roomId).emit("gameMessage", `🃏 मैच शुरू! ${starter.name} के पास ♠A (हुकुम का इक्का) है, पहली चाल उनकी है।`);
  } else {
    room.isFirstTurn = false;
    room.currentTurnIndex = 0;
    io.to(roomId).emit("gameMessage", "🎭 Bluff मैच शुरू! पहली चाल चलें।");
  }

  room.players.forEach(p => {
    if (!p.isBot) io.to(p.id).emit("yourCards", p.cards);
  });

  io.to(roomId).emit("gameState", sanitizeState(room));
  startTurnTimer(roomId);
}

function checkPlayerVictory(roomId, player) {
  const room = rooms[roomId];
  if (player.cards.length === 0 && !player.isSafe) {
    player.isSafe = true;
    const winRank = room.winners.length + 1;
    player.rankTitle = `${winRank}st Winner`;
    room.winners.push(player.name);
    io.to(roomId).emit("gameMessage", `🎉 ${player.name} के सारे पत्ते खत्म! वो safe होकर ${player.rankTitle} बने!`);

    const remaining = getActivePlayers(room);
    if (remaining.length === 1) {
      const loserPlayer = remaining[0];
      loserPlayer.isSafe = true;
      loserPlayer.rankTitle = "चुड़ा";
      room.loser = loserPlayer.name;
      endGame(roomId);
      return true;
    }
  }
  return false;
}

function nextTurnIndex(room) {
  let idx = room.currentTurnIndex;
  for (let i = 0; i < room.players.length; i++) {
    idx = (idx + 1) % room.players.length;
    if (!room.players[idx].isSafe) return idx;
  }
  return idx;
}

function playTurn(roomId, socketId, cards, claim) {
  const room = rooms[roomId];
  if (!room || !room.gameActive || room.isResolving) return;

  const player = room.players[room.currentTurnIndex];
  if (!player || player.id !== socketId || player.isSafe) return;

  const playedCard = cards[0];

  if (room.gameType === "chudapatti") {
    if (room.isFirstTurn) {
      if (playedCard.suit !== "♠" || playedCard.value !== "A") {
        io.to(player.id).emit("gameMessage", "❌ पहली चाल में ♠A (हुकुम का इक्का) चलना अनिवार्य है!");
        return;
      }
      room.isFirstTurn = false;
    }

    const hasLeadSuit = player.cards.some(c => c.suit === room.leadSuit);
    if (room.leadSuit && playedCard.suit !== room.leadSuit && hasLeadSuit) {
      io.to(player.id).emit("gameMessage", `❌ आपके पास ${room.leadSuit} मौजूद है, आपको वही चलना होगा!`);
      return;
    }

    if (room.timer) clearInterval(room.timer);

    player.cards = player.cards.filter(c => !(c.suit === playedCard.suit && c.value === playedCard.value));
    if (!player.isBot) io.to(player.id).emit("yourCards", player.cards);

    if (!room.leadSuit) {
      room.leadSuit = playedCard.suit;
    }

    room.currentTrick.push({
      playerIndex: room.currentTurnIndex,
      playerName: player.name,
      card: playedCard
    });

    room.lastPlay = { player: player.name, cards: [playedCard], claim: playedCard.value };
    checkPlayerVictory(roomId, player);

    // CUT / DAAND CONDITION
    if (playedCard.suit !== room.leadSuit) {
      room.isResolving = true;
      io.to(roomId).emit("gameMessage", `💥 ${player.name} ने कट मारा (${playedCard.value}${playedCard.suit})!`);
      io.to(roomId).emit("gameState", sanitizeState(room));

      let highestVal = -1;
      let penaltyPlayerIndex = -1;
      room.currentTrick.forEach(t => {
        if (t.card.suit === room.leadSuit) {
          const rank = CARD_RANKS[t.card.value];
          if (rank > highestVal) {
            highestVal = rank;
            penaltyPlayerIndex = t.playerIndex;
          }
        }
      });

      const penaltyPlayer = room.players[penaltyPlayerIndex];

      setTimeout(() => {
        if (!room.gameActive) return;
        const penaltyCards = room.currentTrick.map(t => t.card);
        penaltyPlayer.cards.push(...penaltyCards, ...room.pile);
        room.pile = [];

        io.to(roomId).emit("gameMessage", `🚨 ${penaltyPlayer.name} का ${room.leadSuit} सबसे बड़ा था, सारे पत्ते उनको उठाने पड़े!`);
        if (!penaltyPlayer.isBot) io.to(penaltyPlayer.id).emit("yourCards", penaltyPlayer.cards);

        room.currentTrick = [];
        room.leadSuit = null;
        room.isResolving = false;

        room.currentTurnIndex = room.players.findIndex(p => p.id === player.id);
        if (room.players[room.currentTurnIndex].isSafe) {
          room.currentTurnIndex = nextTurnIndex(room);
        }

        io.to(roomId).emit("gameState", sanitizeState(room));
        startTurnTimer(roomId);
      }, 2000);
      return;
    }

    // ROUND COMPLETE CONDITION
    const activePlayers = getActivePlayers(room);
    if (room.currentTrick.length >= activePlayers.length) {
      room.isResolving = true;
      io.to(roomId).emit("gameMessage", `✨ चाल पूरी हुई! पत्ते साफ़ हो रहे हैं...`);
      io.to(roomId).emit("gameState", sanitizeState(room));

      let highestVal = -1;
      let trickWinnerIndex = -1;
      room.currentTrick.forEach(t => {
        const rank = CARD_RANKS[t.card.value];
        if (rank > highestVal) {
          highestVal = rank;
          trickWinnerIndex = t.playerIndex;
        }
      });

      setTimeout(() => {
        if (!room.gameActive) return;
        room.pile.push(...room.currentTrick.map(t => t.card));
        const winner = room.players[trickWinnerIndex];
        io.to(roomId).emit("gameMessage", `👑 ${winner.name} का पत्ता सबसे बड़ा था! अगली चाल उनकी है।`);

        room.currentTrick = [];
        room.leadSuit = null;
        room.isResolving = false;

        room.currentTurnIndex = trickWinnerIndex;
        if (room.players[room.currentTurnIndex].isSafe) {
          room.currentTurnIndex = nextTurnIndex(room);
        }

        io.to(roomId).emit("gameState", sanitizeState(room));
        startTurnTimer(roomId);
      }, 1800);
      return;
    }

    // Normal switch to next player
    room.currentTurnIndex = nextTurnIndex(room);
    io.to(roomId).emit("gameState", sanitizeState(room));
    startTurnTimer(roomId);
    return;
  }

  // Bluff logic
  if (room.timer) clearInterval(room.timer);

  player.cards = player.cards.filter(c => !cards.some(rc => rc.suit === c.suit && rc.value === c.value));
  if (!player.isBot) io.to(player.id).emit("yourCards", player.cards);

  room.pile.push(...cards);
  room.currentClaim = claim;
  room.lastPlay = { player: player.name, cards: cards, claim: claim, playerId: player.id };

  checkPlayerVictory(roomId, player);

  room.currentTurnIndex = nextTurnIndex(room);
  io.to(roomId).emit("gameState", sanitizeState(room));
  startTurnTimer(roomId);
}

function handleChallenge(roomId, challengerId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive || !room.lastPlay) return;

  if (room.timer) clearInterval(room.timer);

  const challenger = room.players.find(p => p.id === challengerId);
  const accused = room.players.find(p => p.id === room.lastPlay.playerId);
  if (!challenger || !accused) return;

  const isBluff = room.lastPlay.cards.some(c => c.value !== room.lastPlay.claim);
  let penaltyReceiver = isBluff ? accused : challenger;
  penaltyReceiver.cards.push(...room.pile);

  if (!penaltyReceiver.isBot) io.to(penaltyReceiver.id).emit("yourCards", penaltyReceiver.cards);

  io.to(roomId).emit("gameMessage", `🔥 ${challenger.name} ने BLUFF पकड़ा! ${isBluff ? accused.name + " झूठ बोल रहा था!" : challenger.name + " का शक गलत था!"}`);

  room.pile = [];
  room.lastPlay = null;
  room.currentClaim = null;

  room.currentTurnIndex = room.players.findIndex(p => p.id === penaltyReceiver.id);
  if (room.players[room.currentTurnIndex].isSafe) {
    room.currentTurnIndex = nextTurnIndex(room);
  }

  io.to(roomId).emit("gameState", sanitizeState(room));
  startTurnTimer(roomId);
}

function endGame(roomId) {
  const room = rooms[roomId];
  if (room.timer) clearInterval(room.timer);
  room.gameActive = false;
  io.to(roomId).emit("gameOver", {
    winners: room.winners,
    loser: room.loser,
    gameType: room.gameType
  });
}

io.on("connection", (socket) => {
  socket.on("joinGame", ({ roomId, username, mode, gameType }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        gameType: gameType || "chudapatti",
        isBotGame: mode === "bot",
        players: [],
        currentTrick: [],
        pile: [],
        currentTurnIndex: 0,
        currentClaim: null,
        leadSuit: null,
        isFirstTurn: true,
        lastPlay: null,
        gameActive: false,
        isResolving: false,
        timer: null,
        timeLeft: TURN_TIMEOUT_SEC,
        winners: [],
        loser: null
      };

      rooms[roomId].players.push({ id: socket.id, name: username || "Player 1", cards: [], isBot: false });

      if (mode === "bot") {
        rooms[roomId].players.push({ id: "bot-ai", name: "🤖 Himalayan AI", cards: [], isBot: true });
      }
    } else {
      const room = rooms[roomId];
      if (!room.players.some(p => p.id === socket.id)) {
        room.players.push({ id: socket.id, name: username || "Player", cards: [], isBot: false });
      }
    }

    const room = rooms[roomId];
    io.to(roomId).emit("gameState", sanitizeState(room));

    if (mode === "bot" && !room.gameActive) {
      setTimeout(() => { dealAndStart(roomId); }, 800);
    }
  });

  socket.on("startGame", (roomId) => {
    dealAndStart(roomId);
  });

  socket.on("playCards", ({ roomId, cards, claim }) => {
    playTurn(roomId, socket.id, cards, claim);
  });

  socket.on("challenge", ({ roomId }) => {
    handleChallenge(roomId, socket.id);
  });

  socket.on("disconnect", () => {
    for (let rId in rooms) {
      const room = rooms[rId];
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0 || (room.isBotGame && room.players.every(p => p.isBot))) {
        if (room.timer) clearInterval(room.timer);
        delete rooms[rId];
      } else {
        io.to(rId).emit("gameState", sanitizeState(room));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Himalayan Card Engine running on Port ${PORT}`);
});
