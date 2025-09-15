/*
 Run locally with Application Default Credentials:
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
   cd functions
   npm run normalize:dry
   npm run normalize:commit
*/
// Use require to avoid ESM interop issues with firebase-admin under ts-node
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

function init(): FirebaseFirestore.Firestore {
  try { admin.initializeApp(); } catch {}
  return (admin as any).firestore();
}

type AnyMap = Record<string, any>;

async function upsertPackingBox(db: FirebaseFirestore.Firestore, id: string, data: AnyMap, commit: boolean, out: AnyMap[]) {
  const docId = String(id);
  out.push({ action: 'upsertPackingBox', id: docId, name: data?.name, code: data?.code });
  if (!commit) return;
  const payload: AnyMap = {
    id: docId,
    code: data?.code || undefined,
    name: data?.name || docId,
    type: data?.type || 'box',
    status: data?.status || 'unknown',
    props: Array.isArray(data?.props) ? data.props : [],
    labels: Array.isArray(data?.labels) ? data.labels : [],
    parentId: data?.parentId || null,
    metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
  };
  await db.collection('packingBoxes').doc(docId).set(payload, { merge: true });
}

async function main() {
  const commit = process.argv.includes('--commit');
  const db = init();
  const out: AnyMap[] = [];

  const lists = await db.collection('packLists').get();
  for (const doc of lists.docs) {
    const data = doc.data() as AnyMap;
    // Inline container doc stored in packLists
    if (Array.isArray(data?.props) && typeof data?.name === 'string' && !Array.isArray(data?.containers)) {
      const boxId = String(data?.id || data?.code || data?.name || doc.id);
      await upsertPackingBox(db, boxId, {
        code: data?.code || data?.name,
        name: data?.name,
        type: data?.type,
        status: data?.status,
        props: data?.props,
        labels: data?.labels,
      }, commit, out);
      continue;
    }

    // Containers array inside packList
    const containers = Array.isArray(data?.containers) ? data.containers : [];
    for (let i = 0; i < containers.length; i++) {
      const c = containers[i] as AnyMap;
      if (!c || typeof c !== 'object') continue;
      const boxId = String(c?.id || c?.code || c?.name || `${doc.id}_${i}`);
      await upsertPackingBox(db, boxId, {
        code: c?.code || undefined,
        name: c?.name || boxId,
        type: c?.type,
        status: c?.status,
        props: c?.props,
        labels: c?.labels,
        parentId: c?.parentId || null,
      }, commit, out);
    }
  }

  console.log(JSON.stringify({ ok: true, committed: commit, results: out }, null, 2));
}

main().catch((e) => {
  console.error('normalize error', e);
  process.exit(1);
});


