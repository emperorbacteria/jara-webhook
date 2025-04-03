const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Load service account from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://jara-app-d6712.firebaseio.com'
});
const db = admin.firestore();

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8172378487:AAESITcIwNNRwLseufYpBOT8w0NgBEMGkNw'; // Set in env

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      const startMatch = text.match(/\/start (.+)/);
      if (startMatch) {
        const referrerUsername = startMatch[1]; // e.g., "@john_doe"
        const newUserId = body.message.from.id.toString();
        const newUserRef = db.collection('users').doc(newUserId);

        const newUserDoc = await newUserRef.get();
        if (!newUserDoc.exists) {
          const referrerQuery = await db.collection('users').where('username', '==', referrerUsername).get();
          if (!referrerQuery.empty) {
            const referrerRef = referrerQuery.docs[0].ref;
            await referrerRef.update({
              referrals: admin.firestore.FieldValue.increment(1),
              jraBalance: admin.firestore.FieldValue.increment(10),
            });
            await newUserRef.set({
              telegramId: newUserId,
              username: body.message.from.username || `User_${newUserId.slice(0, 6)}`,
              referrals: 0,
              jraBalance: 0,
              lastActive: new Date().toISOString(),
            });
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(`Welcome! Referred by ${referrerUsername}.`)}`);
          } else {
            await newUserRef.set({
              telegramId: newUserId,
              username: body.message.from.username || `User_${newUserId.slice(0, 6)}`,
              referrals: 0,
              jraBalance: 0,
              lastActive: new Date().toISOString(),
            });
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent('Welcome to Jara Reward!')}`);
          }
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent('You’re already registered!')}`);
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});