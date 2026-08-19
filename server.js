const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_MAP = { 
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 
};

// MULTI-ROOM STATE MANAGEMENT
const rooms = {};

function createShuffledDeck() {
  let deck = [];
  for (let s of SUITS) {
    for (let v of VALUES) {
      deck.push({ suit: s, value: v, rank: RANK_MAP[v], id: `${v}_${s}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getOrCreateRoom(roomCode) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = {
      code: roomCode,
      players: [],
      selectedGameType: 'chudapatti',
      isBotGame: false,
      isResolvingRound: false,
      currentBotDifficulty: 'hard',
      finishedRankings: [],
      turnTimer: null,
      turnTimeRemaining: 15,
      historyLogs: [],
      aiMemory: { discardedRanks: {}, playerVoids: {} },
      gameState: {
        started: false,
        currentTurnIndex: 0,
        isGameOver: false,
        alertKey: null,
        alertMeta: {},
        leadSuit: null,
        currentTrick: [],
        currentClaimRank: null,
        consecutivePasses: 0,
        lastPlayedCards: [],
        lastPlayedPlayerId: null,
        lastPlayedPlayerName: null,
        lastClaimCount: 0,
        penaltyPile: [],
        trashPile: []
      }
    };
  }
  return rooms[roomCode];
}

function addLog(room, text) {
  room.historyLogs.unshift({ text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
  if (room.historyLogs.length > 25) room.historyLogs.pop();
}

function broadcastRoom(room) {
  room.players.forEach(p => {
    if (!p.isBot) {
      io.to(p.id).emit('sync_state', {
        roomCode: room.code,
        gameType: room.selectedGameType,
        myHand: p.hand,
        leadSuit: room.gameState.leadSuit,
        currentTrick: room.gameState.currentTrick,
        currentClaimRank: room.gameState.currentClaimRank,
        lastClaimCount: room.gameState.lastClaimCount,
        lastPlayedPlayerName: room.gameState.lastPlayedPlayerName,
        canChallenge: (room.selectedGameType === 'bluff' && room.gameState.lastPlayedCards.length > 0),
        penaltyPileCount: room.gameState.penaltyPile.length,
        trashPileCount: room.gameState.trashPile.length,
        currentTurnId: room.players[room.gameState.currentTurnIndex]?.id,
        alertKey: room.gameState.alertKey,
        alertMeta: room.gameState.alertMeta,
        started: room.gameState.started,
        isResolving: room.gameState.isResolvingRound,
        isGameOver: room.gameState.isGameOver,
        rankings: room.finishedRankings,
        difficulty: room.currentBotDifficulty,
        turnTimeRemaining: room.turnTimeRemaining,
        historyLogs: room.historyLogs,
        playersInfo: room.players.map(pl => ({
          id: pl.id,
          name: pl.name,
          cardCount: pl.hand.length,
          isOut: pl.isOut,
          isBot: pl.isBot,
          rank: pl.rank
        }))
      });
    }
  });
}

function getNextActivePlayer(room, fromIdx) {
  let next = (fromIdx + 1) % room.players.length;
  let loops = 0;
  while (room.players[next].isOut && loops < room.players.length) {
    next = (next + 1) % room.players.length;
    loops++;
  }
  return next;
}

function startTurnTimer(room) {
  clearInterval(room.turnTimer);
  room.turnTimeRemaining = 15;

  room.turnTimer = setInterval(() => {
    if (!room.gameState.started || room.gameState.isGameOver || room.gameState.isResolvingRound) {
      clearInterval(room.turnTimer);
      return;
    }

    room.turnTimeRemaining--;
    io.to(room.code).emit('timer_tick', { remaining: room.turnTimeRemaining });

    if (room.turnTimeRemaining <= 0) {
      clearInterval(room.turnTimer);
      handleTurnTimeout(room);
    }
  }, 1000);
}

function handleTurnTimeout(room) {
  const currentP = room.players[room.gameState.currentTurnIndex];
  if (!currentP || currentP.isOut) return;

  addLog(room, `⏱️ Time Out: Auto-Move for ${currentP.name}`);

  if (room.selectedGameType === 'chudapatti') {
    const valid = currentP.hand.filter(c => !room.gameState.leadSuit || c.suit === room.gameState.leadSuit);
    const card = valid.length > 0 ? valid[0] : currentP.hand[0];
    if (card) handleChudapattiPlay(room, currentP.id, card.id);
  } else {
    handleBluffPass(room, currentP.id);
  }
}

function startGame(room, gameType, mode, botCount, difficulty) {
  room.selectedGameType = gameType;
  room.isBotGame = (mode === 'bot');
  room.currentBotDifficulty = difficulty;
  room.isResolvingRound = false;
  room.finishedRankings = [];
  room.historyLogs = [];
  room.gameState.isGameOver = false;

  if (room.isBotGame) {
    const human = room.players.find(p => !p.isBot) || { id: 'human_1', name: 'Player' };
    room.players = [{ id: human.id, name: human.name, hand: [], isOut: false, isBot: false, rank: null }];
    for (let i = 1; i <= botCount; i++) {
      room.players.push({ id: `bot_${i}`, name: `Bot ${i} 🤖`, hand: [], isOut: false, isBot: true, rank: null });
    }
  } else {
    room.players.forEach(p => { p.hand = []; p.isOut = false; p.rank = null; });
  }

  if (room.players.length < 2) return;
  const deck = createShuffledDeck();

  deck.forEach((card, index) => {
    room.players[index % room.players.length].hand.push(card);
  });

  room.aiMemory.discardedRanks = {};
  VALUES.forEach(v => { room.aiMemory.discardedRanks[v] = 0; });

  room.gameState.currentTurnIndex = 0;
  room.players.forEach((p, idx) => {
    if (p.hand.some(c => c.suit === '♠' && c.value === 'A')) {
      room.gameState.currentTurnIndex = idx;
    }
  });

  room.gameState.started = true;
  room.gameState.leadSuit = null;
  room.gameState.currentTrick = [];
  room.gameState.currentClaimRank = (gameType === 'bluff') ? 'A' : null;
  room.gameState.consecutivePasses = 0;
  room.gameState.lastPlayedCards = [];
  room.gameState.lastPlayedPlayerId = null;
  room.gameState.lastPlayedPlayerName = null;
  room.gameState.lastClaimCount = 0;
  room.gameState.penaltyPile = [];
  room.gameState.trashPile = [];

  room.gameState.alertKey = 'GAME_STARTED_ACE';
  room.gameState.alertMeta = {};
  addLog(room, `⚔️ Match Started! Opener: A♠`);

  broadcastRoom(room);
  startTurnTimer(room);
  triggerBotIfTurn(room);
}

// ---------------- CHUDAPATTI LOGIC ----------------
function handleChudapattiPlay(room, playerId, cardId) {
  if (room.isResolvingRound || room.gameState.isGameOver) return;
  const pIdx = room.players.findIndex(p => p.id === playerId);
  if (pIdx === -1 || pIdx !== room.gameState.currentTurnIndex) return;

  const player = room.players[pIdx];
  const cIdx = player.hand.findIndex(c => c.id === cardId);
  if (cIdx === -1) return;

  const playedCard = player.hand[cIdx];
  const isFirstMove = !room.gameState.leadSuit && room.gameState.trashPile.length === 0 && room.gameState.penaltyPile.length === 0;
  if (isFirstMove && (playedCard.suit !== '♠' || playedCard.value !== 'A')) {
    room.gameState.alertKey = 'ACE_OF_SPADES_ONLY';
    broadcastRoom(room);
    return;
  }

  player.hand.splice(cIdx, 1);
  if (!room.gameState.leadSuit) room.gameState.leadSuit = playedCard.suit;

  const hasLeadSuit = player.hand.some(c => c.suit === room.gameState.leadSuit);
  room.gameState.penaltyPile.push(playedCard);
  room.gameState.currentTrick.push({ playerId: player.id, playerName: player.name, card: playedCard });
  addLog(room, `${player.name} played ${playedCard.value}${playedCard.suit}`);

  if (playedCard.suit !== room.gameState.leadSuit) {
    room.isResolvingRound = true;
    broadcastRoom(room);

    if (hasLeadSuit) {
      player.hand.push(...room.gameState.penaltyPile);
      room.gameState.alertKey = 'ILLEGAL_CUT_PENALTY';
      room.gameState.alertMeta = { player: player.name };
      room.gameState.currentTurnIndex = pIdx;
      addLog(room, `🚨 Illegal Cut! ${player.name} penalized.`);
    } else {
      const highestLead = room.gameState.currentTrick
        .filter(m => m.card.suit === room.gameState.leadSuit)
        .reduce((prev, curr) => (curr.card.rank > prev.card.rank ? curr : prev));

      const victimIdx = room.players.findIndex(p => p.id === highestLead.playerId);
      const victim = room.players[victimIdx];
      victim.hand.push(...room.gameState.penaltyPile);
      room.gameState.alertKey = 'LEGAL_CUT_PENALTY';
      room.gameState.alertMeta = { cutter: player.name, victim: victim.name, count: room.gameState.penaltyPile.length };
      room.gameState.currentTurnIndex = victimIdx;
      addLog(room, `💥 CUT by ${player.name}! ${victim.name} took ${room.gameState.penaltyPile.length} cards.`);
    }

    setTimeout(() => {
      room.gameState.penaltyPile = [];
      room.gameState.currentTrick = [];
      room.gameState.leadSuit = null;
      room.isResolvingRound = false;

      checkWinCondition(room, player);
      broadcastRoom(room);
      startTurnTimer(room);
      triggerBotIfTurn(room);
    }, 1200);
  } else {
    const active = room.players.filter(p => !p.isOut);
    if (room.gameState.currentTrick.length === active.length) {
      room.isResolvingRound = true;
      broadcastRoom(room);

      const winnerMove = room.gameState.currentTrick.reduce((prev, curr) => (curr.card.rank > prev.card.rank ? curr : prev));
      const winnerIdx = room.players.findIndex(p => p.id === winnerMove.playerId);

      setTimeout(() => {
        io.to(room.code).emit('trigger_discard_animation');
        setTimeout(() => {
          room.gameState.trashPile.push(...room.gameState.penaltyPile);
          room.gameState.penaltyPile = [];
          room.gameState.currentTrick = [];
          room.gameState.leadSuit = null;
          room.gameState.alertKey = 'TRICK_CLEARED';
          room.gameState.alertMeta = { winner: room.players[winnerIdx].name };
          room.gameState.currentTurnIndex = winnerIdx;
          room.isResolvingRound = false;

          addLog(room, `✨ Trick won by ${room.players[winnerIdx].name}`);
          checkWinCondition(room, player);
          broadcastRoom(room);
          startTurnTimer(room);
          triggerBotIfTurn(room);
        }, 550);
      }, 1000);
    } else {
      room.gameState.currentTurnIndex = getNextActivePlayer(room, pIdx);
      checkWinCondition(room, player);
      broadcastRoom(room);
      startTurnTimer(room);
      triggerBotIfTurn(room);
    }
  }
}

// ---------------- BLUFF LOGIC ----------------
function handleBluffPlay(room, playerId, cardIds, claimedRank) {
  if (room.isResolvingRound || room.gameState.isGameOver) return;
  const pIdx = room.players.findIndex(p => p.id === playerId);
  if (pIdx === -1 || pIdx !== room.gameState.currentTurnIndex) return;

  const player = room.players[pIdx];
  if (!cardIds || cardIds.length === 0 || cardIds.length > 4) return;

  const isFirstMove = !room.gameState.currentClaimRank && room.gameState.trashPile.length === 0 && room.gameState.penaltyPile.length === 0;
  if (isFirstMove && (!cardIds.some(id => id === 'A_♠') || claimedRank !== 'A')) {
    room.gameState.alertKey = 'ACE_OF_SPADES_ONLY';
    broadcastRoom(room);
    return;
  }

  if (!room.gameState.currentClaimRank) room.gameState.currentClaimRank = claimedRank;

  const played = [];
  cardIds.forEach(id => {
    const idx = player.hand.findIndex(c => c.id === id);
    if (idx !== -1) played.push(player.hand.splice(idx, 1)[0]);
  });

  room.gameState.penaltyPile.push(...played);
  room.gameState.lastPlayedCards = played;
  room.gameState.lastPlayedPlayerId = player.id;
  room.gameState.lastPlayedPlayerName = player.name;
  room.gameState.lastClaimCount = played.length;
  room.gameState.consecutivePasses = 0;

  room.gameState.alertKey = 'BLUFF_PLAYED';
  room.gameState.alertMeta = { player: player.name, count: played.length, rank: room.gameState.currentClaimRank };
  addLog(room, `🎭 ${player.name} placed ${played.length}x [${room.gameState.currentClaimRank}]`);

  room.gameState.currentTurnIndex = getNextActivePlayer(room, pIdx);
  broadcastRoom(room);
  startTurnTimer(room);
  triggerBotIfTurn(room);
}

function handleBluffPass(room, playerId) {
  if (room.isResolvingRound || room.gameState.isGameOver) return;
  const pIdx = room.players.findIndex(p => p.id === playerId);
  if (pIdx === -1 || pIdx !== room.gameState.currentTurnIndex) return;

  const player = room.players[pIdx];
  const activePlayers = room.players.filter(p => !p.isOut);
  room.gameState.consecutivePasses++;

  room.gameState.alertKey = 'BLUFF_PASSED';
  room.gameState.alertMeta = { player: player.name };
  addLog(room, `✋ ${player.name} passed.`);

  if (room.gameState.consecutivePasses >= activePlayers.length) {
    room.isResolvingRound = true;
    broadcastRoom(room);

    setTimeout(() => {
      io.to(room.code).emit('trigger_discard_animation');
      setTimeout(() => {
        room.gameState.trashPile.push(...room.gameState.penaltyPile);
        room.gameState.penaltyPile = [];
        room.gameState.currentClaimRank = null;
        room.gameState.lastPlayedCards = [];
        room.gameState.lastPlayedPlayerId = null;
        room.gameState.lastPlayedPlayerName = null;
        room.gameState.lastClaimCount = 0;
        room.gameState.consecutivePasses = 0;
        room.gameState.alertKey = 'ALL_PASSED_DISCARD';
        room.gameState.alertMeta = {};
        room.isResolvingRound = false;

        addLog(room, `🧹 All passed. Discard cleared.`);
        const lastThrower = room.players.find(p => p.id === room.gameState.lastPlayedPlayerId);
        if (lastThrower) checkWinCondition(room, lastThrower);

        room.gameState.currentTurnIndex = getNextActivePlayer(room, pIdx);
        broadcastRoom(room);
        startTurnTimer(room);
        triggerBotIfTurn(room);
      }, 550);
    }, 800);
  } else {
    room.gameState.currentTurnIndex = getNextActivePlayer(room, pIdx);
    broadcastRoom(room);
    startTurnTimer(room);
    triggerBotIfTurn(room);
  }
}

function handleBluffShow(room, challengerId) {
  if (room.isResolvingRound || room.gameState.isGameOver) return;
  const cIdx = room.players.findIndex(p => p.id === challengerId);
  if (cIdx === -1 || cIdx !== room.gameState.currentTurnIndex) return;
  if (room.gameState.lastPlayedCards.length === 0 || !room.gameState.lastPlayedPlayerId) return;

  const challenger = room.players[cIdx];
  const targetPlayer = room.players.find(p => p.id === room.gameState.lastPlayedPlayerId);
  const targetCards = room.gameState.lastPlayedCards;
  const claimRank = room.gameState.currentClaimRank;

  const isBluff = targetCards.some(c => c.value !== claimRank);
  room.isResolvingRound = true;

  io.to(room.code).emit('reveal_bluff_cards', {
    cards: targetCards,
    claimRank,
    isBluff,
    targetName: targetPlayer.name,
    challengerName: challenger.name
  });

  setTimeout(() => {
    if (isBluff) {
      targetPlayer.hand.push(...room.gameState.penaltyPile);
      room.gameState.alertKey = 'BLUFF_CAUGHT';
      room.gameState.alertMeta = { bluffer: targetPlayer.name, challenger: challenger.name, count: room.gameState.penaltyPile.length };
      room.gameState.currentTurnIndex = cIdx;
      addLog(room, `💥 Bluff Caught! ${targetPlayer.name} took ${room.gameState.penaltyPile.length} cards.`);
    } else {
      challenger.hand.push(...room.gameState.penaltyPile);
      room.gameState.alertKey = 'BLUFF_FAILED';
      room.gameState.alertMeta = { bluffer: targetPlayer.name, challenger: challenger.name, count: room.gameState.penaltyPile.length };
      room.gameState.currentTurnIndex = room.players.findIndex(p => p.id === targetPlayer.id);
      addLog(room, `🛡️ Honest Play! Challenger ${challenger.name} took penalty.`);
    }

    room.gameState.penaltyPile = [];
    room.gameState.currentClaimRank = null;
    room.gameState.lastPlayedCards = [];
    room.gameState.lastPlayedPlayerId = null;
    room.gameState.lastPlayedPlayerName = null;
    room.gameState.lastClaimCount = 0;
    room.gameState.consecutivePasses = 0;
    room.isResolvingRound = false;

    checkWinCondition(room, targetPlayer);
    checkWinCondition(room, challenger);
    broadcastRoom(room);
    startTurnTimer(room);
    triggerBotIfTurn(room);
  }, 2200);
}

function checkWinCondition(room, player) {
  if (player.hand.length === 0 && !player.isOut) {
    player.isOut = true;
    player.rank = room.finishedRankings.length + 1;
    room.finishedRankings.push({ id: player.id, name: player.name, rank: player.rank });
    addLog(room, `🏆 ${player.name} finished Rank #${player.rank}!`);

    const remaining = room.players.filter(p => !p.isOut);
    if (remaining.length === 1) {
      const loser = remaining[0];
      loser.isOut = true;
      loser.rank = room.finishedRankings.length + 1;
      room.finishedRankings.push({ id: loser.id, name: loser.name, rank: loser.rank, isLoser: true });

      room.gameState.isGameOver = true;
      room.gameState.started = false;
      room.gameState.alertKey = 'GAME_OVER_LOSER';
      room.gameState.alertMeta = { loser: loser.name };
      clearInterval(room.turnTimer);
      addLog(room, `🤡 Game Over! ${loser.name} is the Outcast.`);
    }
  }
}

// ---------------- BOT BRAIN ----------------
function triggerBotIfTurn(room) {
  if (!room.gameState.started || room.isResolvingRound || room.gameState.isGameOver) return;
  const currentP = room.players[room.gameState.currentTurnIndex];
  if (!currentP || !currentP.isBot || currentP.isOut) return;

  const thinkingTime = room.currentBotDifficulty === 'hard' ? 1200 : 1000;

  setTimeout(() => {
    if (!room.gameState.started || room.isResolvingRound || room.gameState.isGameOver) return;

    if (room.selectedGameType === 'chudapatti') {
      const isFirst = !room.gameState.leadSuit && room.gameState.trashPile.length === 0 && room.gameState.penaltyPile.length === 0;
      let card = null;

      if (isFirst) {
        card = currentP.hand.find(c => c.suit === '♠' && c.value === 'A');
      } else if (!room.gameState.leadSuit) {
        card = [...currentP.hand].sort((a, b) => a.rank - b.rank)[0];
      } else {
        const same = currentP.hand.filter(c => c.suit === room.gameState.leadSuit);
        card = same.length > 0 ? same.sort((a, b) => a.rank - b.rank)[0] : [...currentP.hand].sort((a, b) => b.rank - a.rank)[0];
      }

      if (card) handleChudapattiPlay(room, currentP.id, card.id);
    } else {
      const isFirst = !room.gameState.currentClaimRank && room.gameState.trashPile.length === 0 && room.gameState.penaltyPile.length === 0;
      if (isFirst) {
        const ace = currentP.hand.find(c => c.suit === '♠' && c.value === 'A');
        if (ace) handleBluffPlay(room, currentP.id, [ace.id], 'A');
        return;
      }

      const canChallenge = (room.gameState.lastPlayedCards.length > 0 && room.gameState.lastPlayedPlayerId !== currentP.id);
      const claimRank = room.gameState.currentClaimRank;

      if (canChallenge) {
        const myRankCount = currentP.hand.filter(c => c.value === claimRank).length;
        const discarded = room.aiMemory.discardedRanks[claimRank] || 0;
        if (myRankCount + discarded + room.gameState.lastClaimCount > 4 || Math.random() < 0.3) {
          handleBluffShow(room, currentP.id);
          return;
        }
      }

      const targetRank = claimRank || currentP.hand[0]?.value || 'A';
      const real = currentP.hand.filter(c => c.value === targetRank);

      if (real.length > 0) {
        handleBluffPlay(room, currentP.id, real.slice(0, 2).map(c => c.id), targetRank);
      } else if (Math.random() < 0.5) {
        const fakes = currentP.hand.slice(0, Math.min(2, currentP.hand.length)).map(c => c.id);
        handleBluffPlay(room, currentP.id, fakes, targetRank);
      } else {
        handleBluffPass(room, currentP.id);
      }
    }
  }, thinkingTime);
}

io.on('connection', (socket) => {
  let userRoomCode = 'PUBLIC_1';

  socket.on('join_room', (data) => {
    userRoomCode = (data.roomCode || 'PUBLIC_1').toUpperCase().trim();
    socket.join(userRoomCode);
    const room = getOrCreateRoom(userRoomCode);

    if (room.players.length >= 6 || room.gameState.started) {
      socket.emit('error_alert', 'Room is full or game in progress!');
      return;
    }

    room.players.push({
      id: socket.id,
      name: data.name || `Player ${room.players.length + 1}`,
      hand: [],
      isOut: false,
      isBot: false,
      rank: null
    });

    broadcastRoom(room);
  });

  socket.on('start_game_req', (data) => {
    const room = getOrCreateRoom(userRoomCode);
    startGame(room, data.gameType || 'chudapatti', data.mode || 'bot', data.botCount || 3, data.difficulty || 'hard');
  });

  socket.on('play_chudapatti_card', (cardId) => {
    const room = getOrCreateRoom(userRoomCode);
    handleChudapattiPlay(room, socket.id, cardId);
  });

  socket.on('play_bluff_move', (data) => {
    const room = getOrCreateRoom(userRoomCode);
    handleBluffPlay(room, socket.id, data.cardIds, data.claimedRank);
  });

  socket.on('bluff_pass', () => {
    const room = getOrCreateRoom(userRoomCode);
    handleBluffPass(room, socket.id);
  });

  socket.on('bluff_show', () => {
    const room = getOrCreateRoom(userRoomCode);
    handleBluffShow(room, socket.id);
  });

  socket.on('disconnect', () => {
    const room = rooms[userRoomCode];
    if (!room) return;
    const pIdx = room.players.findIndex(p => p.id === socket.id);
    if (pIdx !== -1) {
      const p = room.players[pIdx];
      if (room.gameState.started && !p.isOut) {
        p.isBot = true;
        p.name = `${p.name} (AI Bot 🤖)`;
        broadcastRoom(room);
        triggerBotIfTurn(room);
      } else {
        room.players.splice(pIdx, 1);
        if (room.players.filter(pl => !pl.isBot).length === 0) {
          clearInterval(room.turnTimer);
          delete rooms[userRoomCode];
        } else {
          broadcastRoom(room);
        }
      }
    }
  });
});

server.listen(3000, () => console.log('Himalayan Game Battle Enterprise Engine running on 3000'));