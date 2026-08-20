const socket = io();
let currentRoom = null, myName = null, myCards = [], selectedCards = [];
const btnJoin = document.getElementById("btn-join"), btnStart = document.getElementById("btn-start"), btnPlay = document.getElementById("btn-play"), btnChallenge = document.getElementById("btn-challenge"), usernameInput = document.getElementById("username"), roomIdInput = document.getElementById("room-id");

btnJoin.addEventListener("click", () => {
  const username = usernameInput.value.trim(), roomId = roomIdInput.value.trim();
  if (!username || !roomId) return alert("Enter Name and Room ID");
  myName = username; currentRoom = roomId;
  socket.emit("joinRoom", { roomId, username });
  document.getElementById("auth-panel").style.display = "none";
  document.getElementById("table-area").style.display = "block";
  document.getElementById("player-hand-container").style.display = "block";
  document.getElementById("players-list-panel").style.display = "block";
  btnStart.style.display = "inline-block";
  document.getElementById("auth-panel").parentElement.appendChild(btnStart);
});

btnStart.addEventListener("click", () => { socket.emit("startGame", currentRoom); btnStart.style.display = "none"; });
socket.on("yourCards", (cards) => { myCards = cards; selectedCards = []; renderHand(); });
socket.on("gameState", (state) => {
  document.getElementById("pile-count").innerText = state.pileCount;
  document.getElementById("current-claim").innerText = state.currentClaim || "None";
  const currentP = state.players[state.currentTurnIndex];
  document.getElementById("current-turn").innerText = currentP ? currentP.name : "-";
  const pList = document.getElementById("players-list");
  pList.innerHTML = "";
  state.players.forEach(p => { const li = document.createElement("li"); li.innerText = p.name + " — " + p.cardCount + " cards"; pList.appendChild(li); });
  if (state.lastPlay) { document.getElementById("last-action-box").innerText = "Last action: " + state.lastPlay.player + " played " + state.lastPlay.cards.length + " card(s) claiming " + state.lastPlay.claim; }
});

socket.on("timerUpdate", ({ timeLeft, total }) => {
  const container = document.getElementById("timer-container"), bar = document.getElementById("timer-bar"), text = document.getElementById("timer-text");
  container.style.display = "block"; text.innerText = timeLeft + "s";
  const percent = (timeLeft / total) * 100; bar.style.width = percent + "%";
  if (timeLeft <= 10) bar.style.backgroundColor = "#ef4444";
  else if (timeLeft <= 20) bar.style.backgroundColor = "#eab308";
  else bar.style.backgroundColor = "#22c55e";
});

socket.on("gameMessage", (msg) => { alert(msg); });
socket.on("gameOver", ({ winner }) => { alert("🏆 Game Over! Winner is " + winner + "! XP points updated."); document.getElementById("timer-container").style.display = "none"; });

btnPlay.addEventListener("click", () => {
  if (selectedCards.length === 0) return alert("Select at least 1 card");
  const claim = document.getElementById("claim-select").value;
  socket.emit("playCards", { roomId: currentRoom, cards: selectedCards, claim });
  selectedCards = []; renderHand();
});

btnChallenge.addEventListener("click", () => { socket.emit("challenge", { roomId: currentRoom }); });

function renderHand() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";
  document.getElementById("hand-count").innerText = myCards.length;
  myCards.forEach(card => {
    const cardEl = document.createElement("div");
    const isRed = card.suit === "♥" || card.suit === "♦";
    cardEl.className = "card " + (isRed ? "red" : "");
    cardEl.innerText = card.value + card.suit;
    cardEl.addEventListener("click", () => {
      const idx = selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
      if (idx > -1) { selectedCards.splice(idx, 1); cardEl.classList.remove("selected"); }
      else { selectedCards.push(card); cardEl.classList.add("selected"); }
    });
    handDiv.appendChild(cardEl);
  });
}
