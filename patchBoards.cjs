const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const boards = await db.collection('todo_boards').get();
  for (const board of boards.docs) {
    const data = board.data();
    if (!data.ownerId) {
      await board.ref.update({ ownerId: 'YOUR_UID_HERE' });
      console.log('Updated board', board.id);
    }
  }
  process.exit(0);
})(); 