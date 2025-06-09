const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const shows = await db.collection('shows').get();
  for (const show of shows.docs) {
    const data = show.data();
    if (!data.userId) {
      await show.ref.update({ userId: 'YOUR_UID_HERE' });
      console.log('Updated show', show.id);
    }
  }
  process.exit(0);
})(); 