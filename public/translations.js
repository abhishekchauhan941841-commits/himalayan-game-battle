const I18N = {
  currentLang: localStorage.getItem("hbh_lang") || "en",
  dict: {
    en: {
      hubSubtitle: "Traditional Strategic Arena with Circular Seating & Live Audio FX",
      playerNameLabel: "Your Name:",
      selectGameTitle: "Select Card Game",
      chudaTag: "AUTHENTIC PAHADI",
      chudaTitle: "Chudapatti",
      chudaDesc: "Start with ♠A, follow suit, cut penalty rules. Empty hand first to win, last player becomes चुड़ा!",
      btnPlayChuda: "Play Chudapatti",
      bluffTag: "DECEPTION",
      bluffTitle: "Bluff",
      bluffDesc: "Declare false claims, challenge opponents, and catch liars before your hand empties.",
      btnPlayBluff: "Play Bluff",
      btnChangeGame: "← Change Game",
      gameModesTitle: "Game Modes",
      vsAiTitle: "Play vs Smart AI",
      vsAiDesc: "Instant circular table match with customizable bot count.",
      botsLabel: "Bots (1 - 5):",
      btnStartMatch: "Start Match",
      onlineMultiTitle: "Online Multiplayer",
      onlineMultiDesc: "Host a private room with 6-letter room code or join friends online.",
      btnMultiLobby: "Multiplayer Lobby",
      btnBackModes: "← Back to Modes",
      multiRoomsTitle: "Multiplayer Rooms",
      hostTableTitle: "Host Private Table",
      hostTableDesc: "Generate a unique room code to invite players.",
      btnHostTable: "➕ Host New Table",
      joinTableTitle: "Join Table",
      joinTableDesc: "Enter 6-character room code from your friend.",
      btnJoin: "Join",
      turnTimerLabel: "⏱️ Turn Timer",
      suitLabel: "Suit:",
      noneText: "None",
      turnLabel: "Turn:",
      waitingMatch: "Waiting for match to begin...",
      claimValueLabel: "Claim Value:",
      btnPlayCard: "🎴 Play Selected Card",
      btnChallenge: "🔥 CHALLENGE / BLUFF!",
      yourCardsTitle: "Your Cards",
      tipChuda: "💡 Tip: Click on a card during your turn to play it!",
      tipBluff: "💡 Tip: Select 1 to 4 cards and play with a declared claim value!",
      notYourTurn: "Not your turn yet! Please wait for your round.",
      selectCardFirst: "Please select a card first!",
      maxBluffCards: "You can play a maximum of 4 cards at once in Bluff!",
      firstTurnAceRule: "❌ First turn must play ♠A (हुकुम का इक्का)!",
      suitFollowRule: "❌ You have {suit} in hand, you must follow the lead suit!",
      turnProcessingWait: "Previous play is resolving, please wait a second!",
      timeoutAutoPlay: "⏰ {name}'s time ran out! Auto-card played.",
      matchStartChuda: "🃏 Match started! {name} holds ♠A (हुकुम का इक्का), first turn is theirs.",
      matchStartBluff: "🎭 Bluff Match Started! First player make your move.",
      safeAnnouncement: "🎉 {name} has discarded all cards and is safe as {rank}!",
      cutAnnouncement: "💥 {name} executed a CUT ({card})!",
      penaltyAnnouncement: "🚨 {name} held the highest {suit}, they must pick up all cards!",
      trickCleanAnnouncement: "✨ Round cleared! Table cards discarded.",
      trickWinnerNext: "👑 {name} won the trick! Next turn is theirs.",
      bluffCaughtLiar: "🔥 {challenger} called BLUFF! {accused} was lying! All cards given to {receiver}!",
      bluffCaughtWrong: "🔥 {challenger} called BLUFF! {accused} was telling the truth! All cards given to {receiver}!",
      matchOver: "🏆 MATCH OVER!",
      winner1st: "🥇 1st Winner:",
      chudaTitleLabel: "❌ चुड़ा:"
    },
    hi: {
      hubSubtitle: "सर्कुलर टेबल, ऑथेंटिक नियम और लाइव ऑडियो साउंड इफेक्ट्स",
      playerNameLabel: "आपका नाम:",
      selectGameTitle: "गेम चुनें",
      chudaTag: "प्रामाणिक पहाड़ी",
      chudaTitle: "Chudapatti",
      chudaDesc: "♠A से शुरुआत, सेम सूट फॉलो, कट/डांड नियम। पहला खाली विजेता, अंतिम 'चुड़ा'!",
      btnPlayChuda: "Chudapatti खेलें",
      bluffTag: "धोखाधड़ी और दांव",
      bluffTitle: "Bluff",
      bluffDesc: "झूठे दावे करें, विरोधियों को चुनौती दें, और हाथ खाली होने से पहले झूठ पकड़ें।",
      btnPlayBluff: "Bluff खेलें",
      btnChangeGame: "← गेम बदलें",
      gameModesTitle: "गेम मोड्स",
      vsAiTitle: "स्मार्ट AI बॉट्स के साथ खेलें",
      vsAiDesc: "कस्टमाइजेबल बॉट संख्या के साथ तुरंत सर्कुलर मैच शुरू करें।",
      botsLabel: "बॉट्स (1 - 5):",
      btnStartMatch: "मैच शुरू करें",
      onlineMultiTitle: "ऑनलाइन मल्टीप्लेयर",
      onlineMultiDesc: "6-अक्षरों के रूम कोड के साथ प्राइवेट रूम बनाएं या दोस्तों के साथ जुड़ें।",
      btnMultiLobby: "मल्टीप्लेयर लॉबी",
      btnBackModes: "← मोड्स पर वापस",
      multiRoomsTitle: "मल्टीप्लेयर रूम्स",
      hostTableTitle: "प्राइवेट टेबल बनाएं",
      hostTableDesc: "खिलाड़ियों को आमंत्रित करने के लिए एक यूनिक रूम कोड बनाएं।",
      btnHostTable: "➕ नई टेबल बनाएं",
      joinTableTitle: "टेबल से जुड़ें",
      joinTableDesc: "अपने दोस्त से मिला 6-अक्षरों का कोड दर्ज करें।",
      btnJoin: "जुड़ें",
      turnTimerLabel: "⏱️ टर्न टाइमर",
      suitLabel: "सूट:",
      noneText: "कोई नहीं",
      turnLabel: "चाल:",
      waitingMatch: "मैच शुरू होने का इंतज़ार है...",
      claimValueLabel: "दावा (Claim):",
      btnPlayCard: "🎴 चुना हुआ पत्ता चलें",
      btnChallenge: "🔥 CHALLENGE / BLUFF!",
      yourCardsTitle: "आपके पत्ते",
      tipChuda: "💡 टिप: अपनी बारी आने पर पत्ते पर क्लिक करते ही पत्ता चल दिया जाएगा!",
      tipBluff: "💡 टिप: 1 से 4 पत्ते सेलेक्ट करके क्लेम के साथ फेंकें!",
      notYourTurn: "अभी आपकी चाल नहीं है! अपनी बारी का इंतज़ार करें।",
      selectCardFirst: "पहले एक पत्ता चुनें!",
      maxBluffCards: "एक बारी में अधिकतम 4 पत्ते ही फेंक सकते हैं!",
      firstTurnAceRule: "❌ पहली चाल में ♠A (हुकुम का इक्का) चलना अनिवार्य है!",
      suitFollowRule: "❌ आपके पास {suit} मौजूद है, आपको वही चलना होगा!",
      turnProcessingWait: "पिछली चाल प्रोसेस हो रही है, 1 सेकंड रुकें!",
      timeoutAutoPlay: "⏰ {name} का टाइम खत्म! ऑटो पत्ता चला गया।",
      matchStartChuda: "🃏 मैच शुरू! {name} के पास ♠A (हुकुम का इक्का) है, पहली चाल उनकी है।",
      matchStartBluff: "🎭 Bluff मैच शुरू! पहली चाल चलें।",
      safeAnnouncement: "🎉 {name} के सारे पत्ते खत्म! वो safe होकर {rank} बने!",
      cutAnnouncement: "💥 {name} ने कट मारा ({card})!",
      penaltyAnnouncement: "🚨 {name} का {suit} सबसे बड़ा था, सारे पत्ते उनको उठाने पड़े!",
      trickCleanAnnouncement: "✨ चाल पूरी हुई! पत्ते साफ़ हो रहे हैं...",
      trickWinnerNext: "👑 {name} का पत्ता सबसे बड़ा था! अगली चाल उनकी है।",
      bluffCaughtLiar: "🔥 {challenger} ने BLUFF पकड़ा! {accused} झूठ बोल रहा था! सारे पत्ते {receiver} को मिले!",
      bluffCaughtWrong: "🔥 {challenger} ने BLUFF पकड़ा! {accused} का दावा सच था! सारे पत्ते {receiver} को मिले!",
      matchOver: "🏆 मैच समाप्त!",
      winner1st: "🥇 प्रथम विजेता:",
      chudaTitleLabel: "❌ चुड़ा:"
    }
  },
  t: function(key, params) {
    let str = (this.dict[this.currentLang] && this.dict[this.currentLang][key]) || this.dict.en[key] || key;
    if (params) {
      for (const k in params) {
        str = str.replace(new RegExp(`{${k}}`, "g"), params[k]);
      }
    }
    return str;
  },
  setLang: function(lang) {
    this.currentLang = lang;
    localStorage.setItem("hbh_lang", lang);
    this.apply();
  },
  apply: function() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.innerText = this.t(key);
    });
    const tipEl = document.getElementById("hand-tip-text");
    if (tipEl) {
      tipEl.innerText = (typeof selectedGame !== "undefined" && selectedGame === "bluff") ? this.t("tipBluff") : this.t("tipChuda");
    }
  }
};
