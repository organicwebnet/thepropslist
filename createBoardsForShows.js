const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const shows = await db.collection('shows').get();
  for (const show of shows.docs) {
    const showData = show.data();
    const boards = await db.collection('todo_boards').where('showId', '==', show.id).get();
    if (boards.empty) {
      await db.collection('todo_boards').add({
        name: showData.name || 'Untitled Board',
        ownerId: showData.userId,
        showId: show.id,
        createdAt: new Date().toISOString(),
      });
      console.log('Created board for show', show.id);
    } else {
      console.log('Board already exists for show', show.id);
    }
  }
  process.exit(0);
})(); 