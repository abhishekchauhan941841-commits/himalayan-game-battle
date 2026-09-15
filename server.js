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
    players: room.players.map(p => ({ id: p.id, name: p.name, cardCount: p.cards.length, isBot: p.isBot })),
    currentTurnIndex: room.currentTurnIndex,
    currentClaim: room.currentClaim,
    pileCount: room.pile.length,
    lastPlay: room.lastPlay,
    gameActive: room.gameActive
  };
}

function startTurnTimer(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive) return;

  if (room.timer) clearInterval(room.timer);
  room.timeLeft = TURN_TIMEOUT_SEC;
  io.to(roomId).emit("timerUpdate", { timeLeft: room.timeLeft, total: TURN_TIMEOUT_SEC });

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer) return;

  if (currentPlayer.isBot) {
    setTimeout(() => { executeBotMove(roomId); }, 1500);
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
  if (!room || !room.gameActive) return;

  const cp = room.players[room.currentTurnIndex];
  if (!cp || cp.cards.length === 0) return;

  io.to(roomId).emit("gameMessage", "⏰ " + cp.name + " timed out! Auto-discarding card...");
  const randomCard = cp.cards.splice(Math.floor(Math.random() * cp.cards.length), 1)[0];
  const claim = room.currentClaim || randomCard.value;

  room.pile.push(randomCard);
  room.lastPlay = { player: cp.name, cards: [randomCard], claim: claim };
  room.currentClaim = claim;

  if (!cp.isBot) io.to(cp.id).emit("yourCards", cp.cards);

  if (cp.cards.length === 0) {
    endGame(roomId, cp);
    return;
  }

  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  io.to(roomId).emit("gameState", sanitizeState(room));
  startTurnTimer(roomId);
}

function executeBotMove(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive) return;

  const bot = room.players[room.currentTurnIndex];
  if (!bot || !bot.isBot || bot.cards.length === 0) return;

  // In Bluff mode, Bot sometimes challenges
  if (room.gameType === "bluff" && room.lastPlay && Math.random() < 0.3) {
    io.to(roomId).emit("gameMessage", "🤖 " + bot.name + " called BLUFF on " + room.lastPlay.player + "!");
    const lastPlayer = room.players.find(p => p.name === room.lastPlay.player);
    const isBluff = room.lastPlay.cards.some(c => c.value !== room.lastPlay.claim);
    let penaltyPlayer = isBluff ? lastPlayer : bot;
    penaltyPlayer.cards.push(...room.pile);

    if (!penaltyPlayer.isBot) io.to(penaltyPlayer.id).emit("yourCards", penaltyPlayer.cards);
    room.pile = [];
    room.lastPlay = null;
    room.currentClaim = null;
    io.to(roomId).emit("gameState", sanitizeState(room));
    startTurnTimer(roomId);
    return;
  }

  let cardsToPlay = [];
  let claim = "";

  if (room.gameType === "chudapatti") {
    // Discard any matching pair or single card
    cardsToPlay = [bot.cards.pop()];
    claim = cardsToPlay[0].value;
  } else {
    // Bluff logic
    claim = room.currentClaim || bot.cards[0].value;
    const match = bot.cards.find(c => c.value === claim);
    if (match) {
      cardsToPlay = [match];
      bot.cards = bot.cards.filter(c => c !== match);
    } else {
      cardsToPlay = [bot.cards.pop()];
    }
  }

  room.pile.push(...cardsToPlay);
  room.lastPlay = { player: bot.name, cards: cardsToPlay, claim: claim };
  room.currentClaim = claim;

  if (bot.cards.length === 0) {
    endGame(roomId, bot);
    return;
  }

  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  io.to(roomId).emit("gameState", sanitizeState(room));
  startTurnTimer(roomId);
}

function dealCardsAndStart(roomId) {
  const room = rooms[roomId];
  if (!room || room.players.length < 2) return;

  const deck = createDeck();
  const perPlayer = Math.floor(deck.length / room.players.length);

  room.players.forEach((p, idx) => {
    p.cards = deck.slice(idx * perPlayer, (idx + 1) * perPlayer);
    if (!p.isBot) io.to(p.id).emit("yourCards", p.cards);
  });

  room.gameActive = true;
  room.currentTurnIndex = 0; // Human player starts
  room.pile = [];
  room.lastPlay = null;
  room.currentClaim = null;

  io.to(roomId).emit("gameState", sanitizeState(room));
  io.to(roomId).emit("gameMessage", "Game started! Match cards or lead turn.");
  startTurnTimer(roomId);
}

function endGame(roomId, winner) {
  const room = rooms[roomId];
  if (room.timer) clearInterval(room.timer);
  room.gameActive = false;
  io.to(roomId).emit("gameOver", { winner: winner.name });
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
        pile: [],
        currentTurnIndex: 0,
        currentClaim: null,
        lastPlay: null,
        gameActive: false,
        timer: null,
        timeLeft: TURN_TIMEOUT_SEC
      };

      // Add human player first
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

    // If bot game, start immediately!
    if (mode === "bot" && !room.gameActive) {
      setTimeout(() => { dealCardsAndStart(roomId); }, 600);
    }
  });

  socket.on("startGame", (roomId) => {
    dealCardsAndStart(roomId);
  });

  socket.on("playCards", ({ roomId, cards, claim }) => {
    const room = rooms[roomId];
    if (!room || !room.gameActive) return;

    const player = room.players[room.currentTurnIndex];
    if (!player || player.id !== socket.id) return;

    if (room.timer) clearInterval(room.timer);

    player.cards = player.cards.filter(c => !cards.some(rc => rc.suit === c.suit && rc.value === c.value));
    room.pile.push(...cards);
    
    const declaredClaim = (room.gameType === "chudapatti") ? cards[0].value : (claim || cards[0].value);
    room.lastPlay = { player: player.name, cards: cards, claim: declaredClaim };
    room.currentClaim = declaredClaim;

    io.to(player.id).emit("yourCards", player.cards);

    if (player.cards.length === 0) {
      endGame(roomId, player);
      return;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    io.to(roomId).emit("gameState", sanitizeState(room));
    startTurnTimer(roomId);
  });

  socket.on("challenge", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.gameActive || !room.lastPlay) return;

    if (room.timer) clearInterval(room.timer);

    const challenger = room.players.find(p => p.id === socket.id);
    const lastPlayer = room.players.find(p => p.name === room.lastPlay.player);
    const isBluff = room.lastPlay.cards.some(c => c.value !== room.lastPlay.claim);

    let penaltyReceiver = isBluff ? lastPlayer : challenger;
    penaltyReceiver.cards.push(...room.pile);

    if (!penaltyReceiver.isBot) io.to(penaltyReceiver.id).emit("yourCards", penaltyReceiver.cards);

    io.to(roomId).emit("gameMessage", challenger.name + " called BLUFF! " + (isBluff ? lastPlayer.name + " was caught lying!" : challenger.name + " was wrong!"));

    room.pile = [];
    room.lastPlay = null;
    room.currentClaim = null;
    io.to(roomId).emit("gameState", sanitizeState(room));
    startTurnTimer(roomId);
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
  console.log(" Himalayan Game Engine running on port " + PORT);
});
