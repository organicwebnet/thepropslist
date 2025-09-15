/*
  Normalize shows.team to a UID->role map.
  - Dry-run by default; pass --apply to write changes.
  - Logic:
    - If team is missing or not an object, initialize to {}
    - If ownerId exists, set team[ownerId] = 'god'
    - If collaborators is an array of objects with uid/userId, copy as team[uid] = role || 'editor'
    - Do not delete legacy fields; only add/merge team map
*/

/* eslint-disable no-console */
const admin = require('firebase-admin');
const path = require('path');

function getArgFlag(name) {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  return idx !== -1;
}

const isApply = getArgFlag('apply');

function requireServiceAccount() {
  try {
    return require(path.resolve(__dirname, './serviceAccountKey.json'));
  } catch (e) {
    console.error('Missing serviceAccountKey.json in project root. Place your Firebase Admin key there.');
    process.exit(1);
  }
}

async function main() {
  const serviceAccount = requireServiceAccount();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  const db = admin.firestore();

  const showsSnap = await db.collection('shows').get();
  console.log(`Found ${showsSnap.size} shows`);

  let changed = 0;
  let skippedHasTeam = 0;
  let mutatedDocs = [];

  for (const doc of showsSnap.docs) {
    const data = doc.data() || {};
    const currentTeam = data.team;
    if (currentTeam && typeof currentTeam === 'object' && !Array.isArray(currentTeam)) {
      skippedHasTeam++;
      continue;
    }
    const nextTeam = {};
    if (typeof data.ownerId === 'string' && data.ownerId.length > 0) {
      nextTeam[data.ownerId] = 'god';
    }
    if (Array.isArray(data.collaborators)) {
      for (const c of data.collaborators) {
        if (!c || typeof c !== 'object') continue;
        const uid = c.uid || c.userId;
        if (!uid || typeof uid !== 'string') continue;
        const role = typeof c.role === 'string' && c.role.trim().length > 0 ? c.role : 'editor';
        if (!nextTeam[uid]) nextTeam[uid] = role;
      }
    }
    // Only update if we actually set something
    if (Object.keys(nextTeam).length === 0) {
      // Nothing to set; leave as-is
      continue;
    }
    mutatedDocs.push({ id: doc.id, nextTeam });
  }

  console.log(`Would update ${mutatedDocs.length} show(s).`);
  if (!isApply) {
    for (const m of mutatedDocs.slice(0, 20)) {
      console.log(`- shows/${m.id} team keys: ${Object.keys(m.nextTeam).join(', ')}`);
    }
    if (mutatedDocs.length > 20) console.log(`...and ${mutatedDocs.length - 20} more.`);
    console.log('Dry-run complete. Re-run with --apply to write changes.');
    return;
  }

  // Apply in batches
  const BATCH_LIMIT = 400;
  for (let i = 0; i < mutatedDocs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = mutatedDocs.slice(i, i + BATCH_LIMIT);
    for (const m of chunk) {
      const ref = db.collection('shows').doc(m.id);
      batch.set(ref, { team: m.nextTeam }, { merge: true });
      changed++;
    }
    await batch.commit();
    console.log(`Applied ${Math.min(i + BATCH_LIMIT, mutatedDocs.length)} / ${mutatedDocs.length}`);
  }

  console.log(`Done. Updated ${changed} document(s). Skipped (already had team): ${skippedHasTeam}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


