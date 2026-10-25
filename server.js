const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 🔒 RENDER ENV VARIABLES SE KEYS UTHANA
let serviceAccount;
if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} else {
    serviceAccount = require('./serviceAccount.json'); // Local testing
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_BOT_TOKEN_HERE'; 
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || 'YOUR_CHAT_ID_HERE'; 
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const userSockets = {}; 

io.on('connection', (socket) => {
    // Register User
    socket.on('register_user', (email) => { 
        if(email) userSockets[email] = socket.id; 
    });

    // Live Chat (User to Telegram)
    socket.on('user_message', (data) => {
        const telegramMsg = `👤 *User:* ${data.email}\n💬 *Message:* ${data.message}\n\n👉 Reply to answer back.`;
        bot.sendMessage(ADMIN_CHAT_ID, telegramMsg, { parse_mode: 'Markdown' }).then((sentMsg) => {
            bot.onReplyToMessage(ADMIN_CHAT_ID, sentMsg.message_id, (replyMsg) => { 
                socket.emit('admin_reply', replyMsg.text); 
            });
        }).catch(err => console.log("TG Error:", err.message));
    });

    // New Deposit/Withdraw Request
    socket.on('new_transaction', async (data) => {
        const { txId, type, amount, userId, userName, method, details } = data;
        
        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            if(userDoc.exists) {
                let userData = userDoc.data();
                let txs = userData.transactions || [];
                txs.unshift({ id: txId, type, amount, method, details, status: 'Pending', date: new Date().toLocaleString() });
                await userRef.update({ transactions: txs });
            }
        } catch(e) { console.log("Firestore Error:", e); }

        const text = `🚨 *NEW ${type.toUpperCase()}* 🚨\n\n🆔 *Order ID:* \`${txId}\`\n👤 *User:* ${userId}\n💰 *Amount:* ₹${amount}\n` + (type === 'withdraw' ? `💳 *Method:* ${method}\n📝 *Details:* ${details}\n` : '') + `\n👇 Verify:`;
        
        const keyboard = { 
            reply_markup: { 
                inline_keyboard: [[ 
                    { text: '✅ Approve', callback_data: `approve_${txId}_${userId}` }, 
                    { text: '❌ Reject', callback_data: `reject_${txId}_${userId}` } 
                ]] 
            } 
        };
        bot.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: 'Markdown', ...keyboard });
    });
});

// Telegram Admin Button Click
bot.on('callback_query', async (query) => {
    const data = query.data.split('_');
    const action = data[0]; const txId = data[1]; const userId = data[2];

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;
    
    let userData = userDoc.data();
    let txs = userData.transactions || [];
    const txIndex = txs.findIndex(t => t.id === txId);
    if (txIndex === -1) return;

    if(action === 'approve') {
        txs[txIndex].status = 'Approved';
        if (txs[txIndex].type === 'deposit') userData.balance += txs[txIndex].amount;
        await userRef.update({ balance: userData.balance, transactions: txs });
        
        bot.editMessageText(`✅ *APPROVED*\nOrder ID: \`${txId}\`\nUser: ${userId}`, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
    } else {
        txs[txIndex].status = 'Rejected';
        if(txs[txIndex].type === 'withdraw') userData.balance += txs[txIndex].amount; // Refund
        await userRef.update({ balance: userData.balance, transactions: txs });

        bot.editMessageText(`❌ *REJECTED*\nOrder ID: \`${txId}\`\nUser: ${userId}`, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
    }
    
    // Send Real-time update to user
    const socketId = userSockets[userId];
    if(socketId) io.to(socketId).emit(`transaction_${action}d`, txId);
    bot.answerCallbackQuery(query.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Jiowin Server running on port ${PORT}`));
