const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (using env vars instead of a file)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Handle newlines
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
console.log('Token loaded:', TELEGRAM_TOKEN); // Debug
const WEBHOOK_PATH = `/webhook/${TELEGRAM_TOKEN}`;

app.use(bodyParser.json());

app.post(WEBHOOK_PATH, async (req, res) => {
  console.log('Received update:', req.body); // Debug
  try {
    const update = req.body;
    const chatId = update.message?.chat?.id;
    if (chatId) {
      console.log(`Received Telegram ID: ${chatId}`);
      const messageText = update.message?.text || '';
      const uidMatch = messageText.match(/\/start (\w+)/);
      const firebaseUid = uidMatch ? uidMatch[1] : null;
      if (firebaseUid) {
        const userRef = doc(db, 'users', firebaseUid);
        await updateDoc(userRef, { telegramId: chatId.toString() });
        console.log(`Updated Firebase user ${firebaseUid} with Telegram ID ${chatId}`);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.send('Webhook is running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));