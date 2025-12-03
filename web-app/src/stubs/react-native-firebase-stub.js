// Stub for React Native Firebase packages (not available on web)
// These are only used in mobile apps, web uses the Firebase JS SDK

export default {};
export const getFirestore = () => ({});
export const getAuth = () => ({});
export const getStorage = () => ({});
export const initializeApp = () => ({});
export const getApp = () => ({});
export const getApps = () => [];
export const FirebaseFirestoreTypes = {};
export const FirebaseAuthTypes = {};
export const FirebaseStorageTypes = {};
export const ReactNativeFirebase = {};

// Common Firestore methods
export const collection = () => ({});
export const doc = () => ({});
export const query = () => ({});
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const getDocs = () => Promise.resolve({ docs: [] });
export const getDoc = () => Promise.resolve({ exists: () => false });
export const setDoc = () => Promise.resolve();
export const updateDoc = () => Promise.resolve();
export const addDoc = () => Promise.resolve({ id: '' });
export const deleteDoc = () => Promise.resolve();
export const serverTimestamp = () => ({});
export const Timestamp = class {};
export const onSnapshot = () => () => {};
export const runTransaction = () => Promise.resolve();
export const writeBatch = () => ({});
export const QueryConstraint = class {};

// Common Auth methods
export const signInWithEmailAndPassword = () => Promise.resolve({});
export const createUserWithEmailAndPassword = () => Promise.resolve({});
export const sendPasswordResetEmail = () => Promise.resolve();
export const signOut = () => Promise.resolve();

// Common Storage methods
export const ref = () => ({});
export const getDownloadURL = () => Promise.resolve('');
export const TaskState = {};


