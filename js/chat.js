socket.on('admin_reply', (msg) => { 
    appendMessage(`👨‍💼 <b>Support:</b> ${msg}`, 'bot'); 
    beep(); 
});

let isTicketRaised = false;
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function sendMessage(customText = null) {
  const input = document.getElementById('chatInput');
  const msgText = customText || input.value.trim();
  if (!msgText) return;
  
  appendMessage(msgText, 'user');
  if(!customText) input.value = '';
  const lower = msgText.toLowerCase().trim();

  // AGENT TRANSFER
  if (lower === 'agent' || lower === 'human' || lower.includes('talk to agent')) {
    if(currentUser) socket.emit('user_message', { email: currentUser.email, message: msgText });
    appendMessage("⏳ <i>Connecting to Live Support Agent...</i>", 'bot'); 
    return;
  }

  showTyping();
  setTimeout(() => {
    hideTyping();
    let reply = "", showTicketBtn = false;

    // SMART BOT LOGIC
    if (lower.includes('withdraw') || lower.includes('payout')) {
      reply = getRandom([
          `<b>Withdrawal Pending? ⏳</b><br>1️⃣ Takes <b>1-24 hours</b>.<br>2️⃣ Sundays may take 48h.<br>3️⃣ If it takes longer, raise a ticket.`, 
          `<b>Withdraw nahi aaya?</b><br>UPI transfers take <b>1 to 24 hours</b>. If status is 'Pending', Admin is verifying it.`
      ]);
      showTicketBtn = true;
    } else if (lower.includes('deposit') || lower.includes('add money') || lower.includes('paisa')) {
      reply = getRandom([
          `<b>Deposit Not Added? 💸</b><br>1️⃣ UPI takes 5-10 mins.<br>2️⃣ If failed, auto-refund in 3-5 days.<br>3️⃣ Check History.`, 
          `<b>Money add nahi hua?</b><br>Agar bank se paisa cut gaya hai aur wallet me nahi aaya, toh <b>3-5 days</b> me refund aa jayega.`
      ]);
      showTicketBtn = true;
    } else if (lower.includes('balance') || lower.includes('wallet')) {
      reply = `Your current balance is <b>₹${currentUser ? currentUser.balance : 0}</b>. 💰`;
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      reply = getRandom([`Hello <b>${currentUser ? currentUser.name : 'User'}</b>! 👋 How can I help?`, `Hi <b>${currentUser ? currentUser.name : 'User'}</b>! Kaise hain aap?`]);
    } else if (lower.includes('bonus') || lower.includes('offer')) {
      reply = `🎁 We have a <b>100% Welcome Bonus</b> up to ₹10,000! Check Home.`;
    } else if (lower.includes('game') || lower.includes('khel')) {
      reply = `🎮 We have 10+ games (Aviator, 7 Up Down, etc). Go to Home!`;
    } else if (lower.includes('thank') || lower.includes('ok')) {
      reply = getRandom([`You're welcome! 😊`, `Anytime! 🎰`]);
    } else {
      reply = getRandom([
          `Mujhe ye samajh nahi aaya 🤔. Ask about <b>Deposit</b>, <b>Withdraw</b>, or <b>Games</b>.`, 
          `Sorry, I didn't understand. Click <b>"Live Agent"</b>.`
      ]);
    }

    if (showTicketBtn && !isTicketRaised) {
        reply += `<br><br><button class="bot-card-btn" style="background:#e53935;" onclick="raiseTicket()">🎫 Raise Support Ticket</button>`;
    }
    appendMessage(reply, 'bot');
  }, 1000);
}

function raiseTicket() {
  if(isTicketRaised) return;
  isTicketRaised = true; 
  const ticketId = 'TKT' + Math.floor(100000 + Math.random() * 900000);
  
  if(currentUser) socket.emit('user_message', { email: currentUser.email, message: `🚨 TICKET RAISED (${ticketId}).` });
  
  appendMessage(`⏳ <i>Generating Ticket...</i>`, 'user');
  setTimeout(() => {
    appendMessage(`<b>✅ Ticket Created!</b><br>🎫 ID: <b>${ticketId}</b><br>⏱ Reply in 15-30 mins.`, 'bot');
    showTyping(); 
    setTimeout(() => { 
        hideTyping(); 
        appendMessage(`👨‍💼 <b>Agent Rahul:</b> Hi ${currentUser ? currentUser.name : 'User'}, I'm checking your issue.`, 'bot'); 
    }, 8000);
  }, 1500);
}

function attachFile() { 
    appendMessage("📎 <i>[Screenshot uploaded]</i>", 'user'); 
    if(currentUser) socket.emit('user_message', { email: currentUser.email, message: "[Screenshot uploaded]" }); 
}

function appendMessage(text, sender) {
  const chatBox = document.getElementById('chatMessages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div'); 
  div.className = `message ${sender}`;
  div.innerHTML = `${text} <span class="time">${time}</span>`; 
  chatBox.appendChild(div); 
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() { 
    const chatBox = document.getElementById('chatMessages'); 
    let ind = document.getElementById('typingIndicator'); 
    if (!ind) { 
        ind = document.createElement('div'); 
        ind.id = 'typingIndicator'; 
        ind.className = 'typing-indicator'; 
        ind.innerHTML = '<span></span><span></span><span></span>'; 
        chatBox.appendChild(ind); 
    } 
    ind.classList.add('show'); 
    chatBox.scrollTop = chatBox.scrollHeight; 
}

function hideTyping() { 
    const ind = document.getElementById('typingIndicator'); 
    if(ind) ind.classList.remove('show'); 
}

function beep() { 
    try { 
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        osc.frequency.value = 800; 
        osc.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.1); 
    } catch(e){} 
}

document.addEventListener('DOMContentLoaded', () => { 
    const chatInput = document.getElementById('chatInput');
    if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); }); 
});
