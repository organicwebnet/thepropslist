const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const YOUR_UID = 'cdGLjU3n13gz72vT33KDBWCnDtf2';
const FAKE_UID = 'FAKE_USER_1234567890';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function nukeCollection(coll) {
  const snapshot = await db.collection(coll).get();
  const batch = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted all documents in ${coll}`);
}

async function nukeSubcollections(boardId) {
  // Delete lists and cards under todo_boards/{boardId}
  const listsSnap = await db.collection(`todo_boards/${boardId}/lists`).get();
  for (const listDoc of listsSnap.docs) {
    const cardsSnap = await db.collection(`todo_boards/${boardId}/lists/${listDoc.id}/cards`).get();
    for (const cardDoc of cardsSnap.docs) {
      await cardDoc.ref.delete();
    }
    await listDoc.ref.delete();
  }
}

async function seed() {
  // --- SHOWS ---
  const show1Ref = db.collection('shows').doc();
  const show2Ref = db.collection('shows').doc();
  const show3Ref = db.collection('shows').doc();
  const show1Id = show1Ref.id;
  const show2Id = show2Ref.id;
  const show3Id = show3Ref.id;

  await show1Ref.set({
    name: 'Show Alpha',
    description: 'Owned by you, full team, props, boards, tasks.',
    ownerId: YOUR_UID,
    team: { [YOUR_UID]: 'god', [FAKE_UID]: 'props_supervisor' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await show2Ref.set({
    name: 'Show Beta',
    description: 'You are a member, not owner.',
    ownerId: FAKE_UID,
    team: { [YOUR_UID]: 'member', [FAKE_UID]: 'god' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await show3Ref.set({
    name: 'Show Gamma',
    description: 'No team, no props (tests empty state).',
    ownerId: FAKE_UID,
    team: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Seeded 3 shows:', show1Id, show2Id, show3Id);

  // --- PROPS ---
  const props = [
    // Show 1
    { name: 'Prop A', showId: show1Id, userId: YOUR_UID, description: 'Normal prop', status: 'in', quantity: 1, images: [
      'https://firebasestorage.googleapis.com/v0/b/props-bible-app-1c1cb.appspot.com/o/images%2F14d37521-2cc6-48f7-83a7-7554632f1717.jpeg?alt=media'
    ] },
    { name: 'Prop B', showId: show1Id, userId: FAKE_UID, description: 'Assigned to another user', status: 'out', quantity: 2 },
    { name: 'Prop C', showId: show1Id, userId: YOUR_UID, status: 'maintenance', quantity: 1 }, // missing description
    // Show 2
    { name: 'Prop D', showId: show2Id, userId: YOUR_UID, description: 'You are member', status: 'in', quantity: 1 },
    // Show 3 (should not show for you)
    { name: 'Prop E', showId: show3Id, userId: FAKE_UID, description: 'No team', status: 'in', quantity: 1 },
  ];
  for (const p of props) {
    await db.collection('props').add({
      ...p,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('Seeded props.');

  // --- TODO BOARDS ---
  const board1Ref = db.collection('todo_boards').doc();
  const board2Ref = db.collection('todo_boards').doc();
  await board1Ref.set({
    name: 'Alpha Board',
    showId: show1Id,
    ownerId: YOUR_UID,
    sharedWith: [YOUR_UID, FAKE_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await board2Ref.set({
    name: 'Beta Board',
    showId: show2Id,
    ownerId: FAKE_UID,
    sharedWith: [YOUR_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Seeded todo boards:', board1Ref.id, board2Ref.id);

  // --- TODO BOARD SUBCOLLECTIONS ---
  // Board 1: 2 lists, each with 2 cards
  const list1Ref = db.collection(`todo_boards/${board1Ref.id}/lists`).doc();
  const list2Ref = db.collection(`todo_boards/${board1Ref.id}/lists`).doc();
  await list1Ref.set({ name: 'To Do', order: 1 });
  await list2Ref.set({ name: 'Done', order: 2 });
  await db.collection(`todo_boards/${board1Ref.id}/lists/${list1Ref.id}/cards`).add({ title: 'Card 1', assignedTo: [YOUR_UID], status: 'todo' });
  await db.collection(`todo_boards/${board1Ref.id}/lists/${list1Ref.id}/cards`).add({ title: 'Card 2', assignedTo: [FAKE_UID], status: 'todo' });
  await db.collection(`todo_boards/${board1Ref.id}/lists/${list2Ref.id}/cards`).add({ title: 'Card 3', assignedTo: [YOUR_UID, FAKE_UID], status: 'done' });
  await db.collection(`todo_boards/${board1Ref.id}/lists/${list2Ref.id}/cards`).add({ title: 'Card 4', status: 'done' });
  // Board 2: 1 list, 1 card
  const list3Ref = db.collection(`todo_boards/${board2Ref.id}/lists`).doc();
  await list3Ref.set({ name: 'Tasks', order: 1 });
  await db.collection(`todo_boards/${board2Ref.id}/lists/${list3Ref.id}/cards`).add({ title: 'Beta Card', assignedTo: [YOUR_UID], status: 'todo' });
  console.log('Seeded todo board lists and cards.');

  // --- TASKS ---
  const now = new Date();
  await db.collection('tasks').add({
    title: 'Overdue Task',
    showId: show1Id,
    assignedTo: [YOUR_UID],
    dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    createdBy: YOUR_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('tasks').add({
    title: 'Upcoming Task',
    showId: show1Id,
    assignedTo: [FAKE_UID],
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    createdBy: FAKE_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('tasks').add({
    title: 'Completed Task',
    showId: show1Id,
    assignedTo: [YOUR_UID, FAKE_UID],
    dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'done',
    createdBy: YOUR_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Seeded tasks.');

  // --- INVITATIONS ---
  await db.collection('invitations').add({
    showId: show1Id,
    email: 'pending@example.com',
    status: 'pending',
    invitedBy: YOUR_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('invitations').add({
    showId: show1Id,
    email: 'accepted@example.com',
    status: 'accepted',
    invitedBy: YOUR_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('invitations').add({
    showId: show1Id,
    email: 'rejected@example.com',
    status: 'rejected',
    invitedBy: YOUR_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Seeded invitations.');
}

async function main() {
  await nukeCollection('shows');
  await nukeCollection('props');
  await nukeCollection('todo_boards');
  await nukeCollection('tasks');
  await nukeCollection('invitations');

  // Clean up subcollections for all boards
  const boardsSnap = await db.collection('todo_boards').get();
  for (const boardDoc of boardsSnap.docs) {
    await nukeSubcollections(boardDoc.id);
  }

  await seed();
  console.log('Firestore reset and seeded with comprehensive test data!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 