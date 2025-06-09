const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const TEST_UID = 'cdGLjU3n13gz72vT33KDBWCnDtf2';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id, // Explicitly set projectId
});

const db = admin.firestore();

async function patchShows() {
  const showsRef = db.collection('shows');
  const snapshot = await showsRef.get();
  let patched = 0;
  const batch = db.batch();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.ownerId !== TEST_UID) {
      batch.update(doc.ref, { ownerId: TEST_UID });
      patched++;
    }
  });
  if (patched > 0) await batch.commit();
  console.log(`Shows patched: ${patched}`);
}

async function patchBoards() {
  const boardsRef = db.collection('todo_boards');
  const snapshot = await boardsRef.get();
  let patched = 0;
  const batch = db.batch();
  snapshot.forEach(doc => {
    const data = doc.data();
    let update = {};
    if (data.ownerId !== TEST_UID) {
      update.ownerId = TEST_UID;
    }
    if (!Array.isArray(data.sharedWith) || data.sharedWith.length !== 1 || data.sharedWith[0] !== TEST_UID) {
      update.sharedWith = [TEST_UID];
    }
    if (Object.keys(update).length > 0) {
      batch.update(doc.ref, update);
      patched++;
    }
  });
  if (patched > 0) await batch.commit();
  console.log(`Boards patched: ${patched}`);
}

async function patchTasks() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.get();
  let patched = 0;
  const batch = db.batch();
  snapshot.forEach(doc => {
    const data = doc.data();
    let update = {};
    if (data.ownerId !== TEST_UID) {
      update.ownerId = TEST_UID;
    }
    if (data.assignedTo !== TEST_UID) {
      update.assignedTo = TEST_UID;
    }
    if (Object.keys(update).length > 0) {
      batch.update(doc.ref, update);
      patched++;
    }
  });
  if (patched > 0) await batch.commit();
  console.log(`Tasks patched: ${patched}`);
}

async function main() {
  await patchShows();
  await patchBoards();
  await patchTasks();
  console.log('Firestore patching complete.');
  process.exit();
}

main(); 