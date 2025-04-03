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
const WEB_APP_URL = 'https://your-web-app.com'; // Replace with your web app URL

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
    const startMatch = messageText.match(/\/start (\w+)/);

    if (!startMatch) {
      console.log('No /start command found:', messageText);
      return res.sendStatus(200);
    }

    const param = startMatch[1];

    if (/^\d+$/.test(param)) {
      // Referral link: /start <referrer-telegramId>
      const referrerTelegramId = param;
      console.log(`Received referral Telegram ID: ${referrerTelegramId}`);

      // Store temporary Telegram user data
      const telegramUserRef = db.collection('telegramUsers').doc(chatId.toString());
      await telegramUserRef.set({
        telegramId: chatId.toString(),
        referrerTelegramId,
        firebaseUid: null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`Stored Telegram user ${chatId} with referrer ${referrerTelegramId}`);

      // Send signup link to user via Telegram
      const signupUrl = `${WEB_APP_URL}/signup?telegramId=${chatId}&ref=${referrerTelegramId}`;
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `Welcome! Sign up here to start earning $JRA: ${signupUrl}`,
      });
      console.log(`Sent signup link to ${chatId}: ${signupUrl}`);
    } else {
      console.log(`Unexpected /start parameter: ${param} (ignoring)`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.send('Webhook is running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));