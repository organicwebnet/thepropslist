const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const tasks = await db.collection('tasks').get();
  for (const task of tasks.docs) {
    const data = task.data();
    let updated = false;
    const updateObj = {};
    if (!data.ownerId) {
      updateObj.ownerId = 'YOUR_UID_HERE';
      updated = true;
    }
    if (!data.assignedTo) {
      updateObj.assignedTo = 'YOUR_UID_HERE';
      updated = true;
    }
    if (updated) {
      await task.ref.update(updateObj);
      console.log('Updated task', task.id);
    }
  }
  process.exit(0);
})(); 