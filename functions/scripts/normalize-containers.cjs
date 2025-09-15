/*
  Usage:
    set GOOGLE_APPLICATION_CREDENTIALS to a service account json with Firestore access
    node scripts/normalize-containers.cjs            # dry-run
    node scripts/normalize-containers.cjs --commit   # commit changes
*/

const admin = require('firebase-admin');

function init() {
  try { admin.initializeApp(); } catch {}
  return admin.firestore();
}

async function upsertPackingBox(db, id, data, commit, out) {
  const docId = String(id);
  out.push({ action: 'upsertPackingBox', id: docId, name: data && data.name, code: data && data.code });
  if (!commit) return;
  const payload = {
    id: docId,
    ...(data && data.code ? { code: data.code } : {}),
    name: (data && data.name) || docId,
    type: (data && data.type) || 'box',
    status: (data && data.status) || 'unknown',
    props: Array.isArray(data && data.props) ? data.props : [],
    labels: Array.isArray(data && data.labels) ? data.labels : [],
    parentId: (data && data.parentId) || null,
    metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
  };
  await db.collection('packingBoxes').doc(docId).set(payload, { merge: true });
}

async function main() {
  const commit = process.argv.includes('--commit');
  const db = init();
  const out = [];

  const lists = await db.collection('packLists').get();
  for (const doc of lists.docs) {
    const data = doc.data();
    if (Array.isArray(data && data.props) && typeof (data && data.name) === 'string' && !Array.isArray(data && data.containers)) {
      const boxId = String((data && data.id) || (data && data.code) || (data && data.name) || doc.id);
      await upsertPackingBox(db, boxId, {
        code: (data && data.code) || (data && data.name),
        name: data && data.name,
        type: data && data.type,
        status: data && data.status,
        props: data && data.props,
        labels: data && data.labels,
      }, commit, out);
      continue;
    }

    const containers = Array.isArray(data && data.containers) ? data.containers : [];
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      if (!c || typeof c !== 'object') continue;
      const boxId = String(c.id || c.code || c.name || `${doc.id}_${i}`);
      await upsertPackingBox(db, boxId, {
        code: c.code || undefined,
        name: c.name || boxId,
        type: c.type,
        status: c.status,
        props: c.props,
        labels: c.labels,
        parentId: c.parentId || null,
      }, commit, out);
    }
  }

  console.log(JSON.stringify({ ok: true, committed: commit, results: out }, null, 2));
}

main().catch((e) => {
  console.error('normalize error', e);
  process.exit(1);
});


