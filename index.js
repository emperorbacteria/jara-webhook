const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

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
    const uidMatch = messageText.match(/\/start (\w+)/);
    const firebaseUid = uidMatch ? uidMatch[1] : null;

    if (!firebaseUid) {
      console.log('No valid Firebase UID found in message:', messageText);
      return res.sendStatus(200);
    }

    console.log(`Processing UID: ${firebaseUid}`);
    const userRef = db.collection('users').doc(firebaseUid); // Fixed syntax
    await userRef.set({ telegramId: chatId.toString() }, { merge: true });
    console.log(`Updated Firebase user ${firebaseUid} with Telegram ID ${chatId}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.send('Webhook is running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));