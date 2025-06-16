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
  const show4Ref = db.collection('shows').doc();
  const show1Id = show1Ref.id;
  const show2Id = show2Ref.id;
  const show3Id = show3Ref.id;
  const show4Id = show4Ref.id;

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
  await show4Ref.set({
    name: 'The Great Gatsby',
    description: 'A lavish production of the classic novel.',
    ownerId: YOUR_UID,
    userId: YOUR_UID,
    team: { [YOUR_UID]: 'god', [FAKE_UID]: 'props_supervisor' },
    acts: [
      { id: 'act1', name: 'Act 1', scenes: [{ id: 'scene1', name: 'Scene 1' }, { id: 'scene2', name: 'Scene 2' }] },
      { id: 'act2', name: 'Act 2', scenes: [{ id: 'scene3', name: 'Scene 1' }] }
    ],
    venues: [
      {
        id: 'venue1',
        name: 'Grand Theatre',
        address: {
          id: 'addr1',
          street1: '123 Main St',
          city: 'London',
          region: 'Greater London',
          postalCode: 'W1A 1AA',
          country: 'United Kingdom',
          name: '',
          companyName: '',
          street2: '',
          nickname: ''
        },
        startDate: '2025-03-01',
        endDate: '2025-03-10',
        notes: 'Main stage, use loading dock B'
      }
    ],
    contacts: [
      { id: 'contact1', name: 'Alex Props', role: 'Props Supervisor', email: 'props.alex@example.com' },
      { id: 'contact2', name: 'Jordan Designer', role: 'Designer', email: 'designer.jordan@example.com' }
    ],
    isTouringShow: false,
    startDate: '2025-03-01',
    endDate: '2025-03-10',
    imageUrl: 'https://example.com/poster.jpg',
    logoImage: { url: 'https://example.com/logo.png' },
    techWeekStart: '2025-02-24',
    firstPreview: '2025-02-28',
    pressNight: '2025-03-02',
    additionalDates: [
      { label: 'Final Dress', date: '2025-02-27' }
    ],
    propmakerName: 'Sam Maker',
    designerAssistantName: 'Taylor Assistant',
    propsSupervisor: 'Alex Props',
    propsSupervisorEmail: 'props.alex@example.com',
    stageManager: 'Morgan Stage',
    stageManagerEmail: 'morgan.stage@example.com',
    assistantStageManager: 'Taylor Assistant',
    productionContactName: 'Jordan Designer',
    productionContactEmail: 'designer.jordan@example.com',
    propmakerEmail: 'sam.maker@example.com',
    collaborators: [
      {
        name: 'Chris Collaborator',
        jobRole: 'Lighting Designer',
        email: 'chris@example.com',
        role: 'editor',
        addedAt: '2025-01-01T12:00:00Z',
        addedBy: YOUR_UID
      }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Seeded 4 shows:', show1Id, show2Id, show3Id, show4Id);

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
  await db.collection('props').add({
    id: 'prop-test-1',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Green Light',
    description: 'A small green lantern for the dock scene.',
    category: 'Lighting',
    price: 25.00,
    quantity: 1,
    source: 'made',
    status: 'in_use',
    act: 1,
    scene: 2,
    location: 'Props Table',
    images: [
      { id: 'img1', url: 'https://example.com/greenlight.jpg' }
    ],
    weight: 0.5,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Additional props for various statuses
  await db.collection('props').add({
    id: 'prop-test-2',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Broken Mirror',
    description: 'A cracked mirror for the haunted scene.',
    category: 'Set Dressing',
    price: 10.00,
    quantity: 1,
    source: 'bought',
    status: 'maintenance',
    act: 2,
    scene: 1,
    location: 'Workshop',
    images: [
      { id: 'img2', url: 'https://example.com/brokenmirror.jpg' }
    ],
    weight: 2.0,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    maintenanceNotes: 'Needs glass replacement',
    assignedTo: [YOUR_UID],
  });
  await db.collection('props').add({
    id: 'prop-test-3',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Retired Cane',
    description: 'A cane no longer needed after script change.',
    category: 'Hand Prop',
    price: 15.00,
    quantity: 1,
    source: 'bought',
    status: 'retired',
    act: 1,
    scene: 1,
    location: 'Storage',
    images: [
      { id: 'img3', url: 'https://example.com/retiredcane.jpg' }
    ],
    weight: 0.7,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    retirementNotes: 'Cut from show after preview',
  });
  await db.collection('props').add({
    id: 'prop-test-4',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Delivery Parcel',
    description: 'A package prop currently being delivered.',
    category: 'Set Dressing',
    price: 8.00,
    quantity: 1,
    source: 'made',
    status: 'on_delivery',
    act: 2,
    scene: 2,
    location: 'Courier',
    images: [
      { id: 'img4', url: 'https://example.com/deliveryparcel.jpg' }
    ],
    weight: 1.2,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deliveryInfo: 'Expected at venue by 2025-03-01',
  });
  await db.collection('props').add({
    id: 'prop-test-5',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Custom Mask',
    description: 'A mask being made by the propmaker.',
    category: 'Costume',
    price: 40.00,
    quantity: 1,
    source: 'made',
    status: 'with_maker',
    act: 1,
    scene: 2,
    location: 'Propmaker Studio',
    images: [
      { id: 'img5', url: 'https://example.com/custommask.jpg' }
    ],
    weight: 0.3,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    makerName: 'Sam Maker',
    dueDate: '2025-02-20',
  });
  await db.collection('props').add({
    id: 'prop-test-6',
    userId: YOUR_UID,
    showId: show4Id,
    name: 'Cut Banner',
    description: 'A banner that was cut from the show.',
    category: 'Set Dressing',
    price: 12.00,
    quantity: 1,
    source: 'bought',
    status: 'cut_from_show',
    act: 2,
    scene: 1,
    location: 'Storage',
    images: [
      { id: 'img6', url: 'https://example.com/cutbanner.jpg' }
    ],
    weight: 0.9,
    weightUnit: 'kg',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    cutNotes: 'Removed after tech week',
  });
  console.log('Seeded props, including new test prop for show4:', show4Id);

  // --- TODO BOARDS ---
  // Board for Show 1
  const board1Ref = db.collection('todo_boards').doc();
  await board1Ref.set({
    name: 'Alpha Board',
    showId: show1Id,
    ownerId: YOUR_UID,
    sharedWith: [YOUR_UID, FAKE_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Board for Show 2
  const board2Ref = db.collection('todo_boards').doc();
  await board2Ref.set({
    name: 'Beta Board',
    showId: show2Id,
    ownerId: FAKE_UID,
    sharedWith: [YOUR_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Board for Show 3
  const board3Ref = db.collection('todo_boards').doc();
  await board3Ref.set({
    name: 'Gamma Board',
    showId: show3Id,
    ownerId: FAKE_UID,
    sharedWith: [YOUR_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Board for Show 4
  const board4Ref = db.collection('todo_boards').doc();
  await board4Ref.set({
    name: 'Gatsby Board',
    showId: show4Id,
    ownerId: YOUR_UID,
    sharedWith: [YOUR_UID, FAKE_UID],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Add lists and cards for each board
  async function addListsAndCards(boardRef, showId) {
    const list1Ref = db.collection(`todo_boards/${boardRef.id}/lists`).doc();
    const list2Ref = db.collection(`todo_boards/${boardRef.id}/lists`).doc();
    await list1Ref.set({ name: 'To Do', order: 1 });
    await list2Ref.set({ name: 'Done', order: 2 });
    await db.collection(`todo_boards/${boardRef.id}/lists/${list1Ref.id}/cards`).add({
      title: 'Initial Task',
      assignedTo: [YOUR_UID],
      status: 'todo',
      showId,
      dueDate: '2025-03-01',
    });
    await db.collection(`todo_boards/${boardRef.id}/lists/${list1Ref.id}/cards`).add({
      title: 'Secondary Task',
      assignedTo: [FAKE_UID],
      status: 'todo',
      showId,
      dueDate: '2025-03-02',
    });
    await db.collection(`todo_boards/${boardRef.id}/lists/${list2Ref.id}/cards`).add({
      title: 'Completed Task',
      assignedTo: [YOUR_UID, FAKE_UID],
      status: 'done',
      showId,
      dueDate: '2025-02-28',
    });
    await db.collection(`todo_boards/${boardRef.id}/lists/${list2Ref.id}/cards`).add({
      title: 'Archived Task',
      status: 'archived',
      showId,
    });
  }
  await addListsAndCards(board1Ref, show1Id);
  await addListsAndCards(board2Ref, show2Id);
  await addListsAndCards(board3Ref, show3Id);
  await addListsAndCards(board4Ref, show4Id);
  console.log('Seeded todo boards, lists, and cards for all shows.');

  // --- INVITATIONS ---
  async function addInvitations(showId) {
    await db.collection('invitations').add({
      showId,
      email: `pending+${showId}@example.com`,
      status: 'pending',
      invitedBy: YOUR_UID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('invitations').add({
      showId,
      email: `accepted+${showId}@example.com`,
      status: 'accepted',
      invitedBy: YOUR_UID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('invitations').add({
      showId,
      email: `rejected+${showId}@example.com`,
      status: 'rejected',
      invitedBy: YOUR_UID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await addInvitations(show1Id);
  await addInvitations(show2Id);
  await addInvitations(show3Id);
  await addInvitations(show4Id);
  console.log('Seeded invitations for all shows.');
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