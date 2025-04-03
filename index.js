const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 10000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEB_APP_URL = 'https://jara-app-d6712.web.app'; // Your web app URL

console.log('Token loaded:', TELEGRAM_TOKEN ? 'Yes' : 'No');

app.use(bodyParser.json());

app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  console.log('Received update:', JSON.stringify(req.body, null, 2));
  try {
    const update = req.body;
    const chatId = update.message?.chat?.id;
    if (!chatId) {
      console.log('No chat ID in update');
      return res.sendStatus(200);
    }

    console.log(`Received Telegram ID: ${chatId}`);
    const messageText = update.message?.text || '';

    if (messageText === '/start' || messageText.match(/\/start (\w+)/)) {
      let referrerTelegramId = null;
      const startMatch = messageText.match(/\/start (\w+)/);
      if (startMatch && /^\d+$/.test(startMatch[1])) {
        referrerTelegramId = startMatch[1];
        console.log(`Received referral Telegram ID: ${referrerTelegramId}`);
      }

      // Launch web app with optional referrer
      const webAppUrl = referrerTelegramId
        ? `${WEB_APP_URL}?ref=${referrerTelegramId}`
        : WEB_APP_URL;
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: 'Start earning $JRA now!',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Open Jara Reward', web_app: { url: webAppUrl } }
          ]]
        }
      });
      console.log(`Sent web app link to ${chatId}: ${webAppUrl}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.send('Webhook is running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));