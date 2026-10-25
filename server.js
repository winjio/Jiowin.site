const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_BOT_TOKEN_HERE'; 
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || 'YOUR_CHAT_ID_HERE'; 

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const transactionMap = {}; 
const userSockets = {}; 

io.on('connection', (socket) => {
    socket.on('register_user', (email) => { if(email) userSockets[email] = socket.id; });

    socket.on('user_message', (data) => {
        const telegramMsg = `👤 *User:* ${data.email}\n💬 *Message:* ${data.message}\n\n👉 Reply to answer back.`;
        bot.sendMessage(ADMIN_CHAT_ID, telegramMsg, { parse_mode: 'Markdown' }).then((sentMsg) => {
            bot.onReplyToMessage(ADMIN_CHAT_ID, sentMsg.message_id, (replyMsg) => { socket.emit('admin_reply', replyMsg.text); });
        }).catch(err => console.log("TG Error"));
    });

    socket.on('new_transaction', (data) => {
        const { txId, type, amount, userId, userName, method, details } = data;
        transactionMap[txId] = { userId, type, amount };
        userSockets[userId] = socket.id; 
        const text = `🚨 *NEW ${type.toUpperCase()}* 🚨\n\n🆔 *Order ID:* \`${txId}\`\n👤 *User ID:* ${userId}\n📛 *Name:* ${userName}\n💰 *Amount:* ₹${amount}\n` + (type === 'withdraw' ? `💳 *Method:* ${method}\n📝 *Details:* ${details}\n` : '') + `\n👇 Verify:`;
        const keyboard = { reply_markup: { inline_keyboard: [[ { text: '✅ Approve', callback_data: `approve_${txId}` }, { text: '❌ Reject', callback_data: `reject_${txId}` } ]] } };
        bot.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: 'Markdown', ...keyboard });
    });
});

bot.on('callback_query', (query) => {
    const [action, txId] = query.data.split('_');
    const txData = transactionMap[txId];
    if(!txData) { bot.answerCallbackQuery(query.id, { text: "Error: Not found!" }); return; }
    const socketId = userSockets[txData.userId];
    if(action === 'approve') {
        bot.editMessageText(`✅ *APPROVED*\nOrder ID: \`${txId}\``, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
        if(socketId) io.to(socketId).emit('transaction_approved', txId);
    } else {
        bot.editMessageText(`❌ *REJECTED*\nOrder ID: \`${txId}\``, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
        if(socketId) io.to(socketId).emit('transaction_rejected', txId);
    }
    bot.answerCallbackQuery(query.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
