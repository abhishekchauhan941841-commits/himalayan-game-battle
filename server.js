require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

function sanitizeRoomState(room) {
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
  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(() => { executeBotMove(roomId); }, 2000);
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

  const currentPlayer = room.players[room.currentTurnIndex];
  io.to(roomId).emit("gameMessage", "⏰ " + currentPlayer.name + " timed out! Auto-playing random card...");

  if (currentPlayer.cards.length > 0) {
    const randomCardIndex = Math.floor(Math.random() * currentPlayer.cards.length);
    const playedCard = currentPlayer.cards.splice(randomCardIndex, 1)[0];
    const claim = room.currentClaim || playedCard.value;

    room.pile.push(playedCard);
    room.lastPlay = { player: currentPlayer.name, cards: [playedCard], claim: claim };
    room.currentClaim = claim;

    if (!currentPlayer.isBot) {
      io.to(currentPlayer.id).emit("yourCards", currentPlayer.cards);
    }

    if (currentPlayer.cards.length === 0) {
      endGame(roomId, currentPlayer);
      return;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    io.to(roomId).emit("gameState", sanitizeRoomState(room));
    startTurnTimer(roomId);
  }
}

function executeBotMove(roomId) {
  const room = rooms[roomId];
  if (!room || !room.gameActive) return;

  const bot = room.players[room.currentTurnIndex];
  if (!bot || !bot.isBot) return;

  if (room.lastPlay && Math.random() < 0.25) {
    io.to(roomId).emit("gameMessage", bot.name + " is calling BLUFF on " + room.lastPlay.player + "!");
    const lastPlayer = room.players.find(p => p.name === room.lastPlay.player);
    const isBluff = room.lastPlay.cards.some(c => c.value !== room.lastPlay.claim);
    let loser = isBluff ? lastPlayer : bot;
    loser.cards.push(...room.pile);

    if (!loser.isBot) io.to(loser.id).emit("yourCards", loser.cards);
    room.pile = [];
    room.lastPlay = null;
    room.currentClaim = null;
    io.to(roomId).emit("gameState", sanitizeRoomState(room));
    startTurnTimer(roomId);
    return;
  }

  const claim = room.currentClaim || bot.cards[0].value;
  const matchingCards = bot.cards.filter(c => c.value === claim);
  let cardsToPlay = [];

  if (matchingCards.length > 0) {
    cardsToPlay = [matchingCards[0]];
    bot.cards = bot.cards.filter(c => c !== matchingCards[0]);
  } else {
    cardsToPlay = [bot.cards.pop()];
  }

  room.pile.push(...cardsToPlay);
  room.lastPlay = { player: bot.name, cards: cardsToPlay, claim: claim };
  room.currentClaim = claim;

  if (bot.cards.length === 0) {
    endGame(roomId, bot);
    return;
  }

  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  io.to(roomId).emit("gameState", sanitizeRoomState(room));
  startTurnTimer(roomId);
}

function endGame(roomId, winner) {
  const room = rooms[roomId];
  if (room.timer) clearInterval(room.timer);
  room.gameActive = false;
  io.to(roomId).emit("gameOver", { winner: winner.name });
}

io.on("connection", (socket) => {
  socket.on("createOrJoin", ({ roomId, username, mode, gameType }) => {
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

      if (mode === "bot") {
        rooms[roomId].players.push({ id: "bot-1", name: "🤖 Himalayan Bot", cards: [], isBot: true });
      }
    }

    const room = rooms[roomId];
    if (!room.players.some(p => p.id === socket.id)) {
      room.players.push({ id: socket.id, name: username, cards: [], isBot: false });
    }

    io.to(roomId).emit("gameState", sanitizeRoomState(room));
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    const deck = createDeck();
    const cardsPerPlayer = Math.floor(deck.length / room.players.length);

    room.players.forEach((p, idx) => {
      p.cards = deck.slice(idx * cardsPerPlayer, (idx + 1) * cardsPerPlayer);
      if (!p.isBot) io.to(p.id).emit("yourCards", p.cards);
    });

    room.gameActive = true;
    room.currentTurnIndex = 0;
    room.pile = [];
    room.lastPlay = null;
    room.currentClaim = null;

    io.to(roomId).emit("gameState", sanitizeRoomState(room));
    startTurnTimer(roomId);
  });

  socket.on("playCards", ({ roomId, cards, claim }) => {
    const room = rooms[roomId];
    if (!room || !room.gameActive) return;
    const player = room.players[room.currentTurnIndex];
    if (player.id !== socket.id) return;

    if (room.timer) clearInterval(room.timer);

    player.cards = player.cards.filter(c => !cards.some(rc => rc.suit === c.suit && rc.value === c.value));
    room.pile.push(...cards);
    room.lastPlay = { player: player.name, cards: cards, claim: claim };
    room.currentClaim = claim;

    if (player.cards.length === 0) {
      endGame(roomId, player);
      return;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    io.to(roomId).emit("gameState", sanitizeRoomState(room));
    startTurnTimer(roomId);
  });

  socket.on("challenge", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.gameActive || !room.lastPlay) return;

    if (room.timer) clearInterval(room.timer);

    const challenger = room.players.find(p => p.id === socket.id);
    const lastPlayer = room.players.find(p => p.name === room.lastPlay.player);
    const isBluff = room.lastPlay.cards.some(c => c.value !== room.lastPlay.claim);

    let loser = isBluff ? lastPlayer : challenger;
    loser.cards.push(...room.pile);

    if (!loser.isBot) io.to(loser.id).emit("yourCards", loser.cards);

    io.to(roomId).emit("gameMessage", challenger.name + " challenged " + lastPlayer.name + "! Result: " + (isBluff ? "BLUFF CAUGHT! " + lastPlayer.name + " takes pile." : "LEGIT! " + challenger.name + " takes pile."));

    room.pile = [];
    room.lastPlay = null;
    room.currentClaim = null;
    io.to(roomId).emit("gameState", sanitizeRoomState(room));
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
        io.to(rId).emit("gameState", sanitizeRoomState(room));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(" Himalayan Game Engine running on port " + PORT);
});
