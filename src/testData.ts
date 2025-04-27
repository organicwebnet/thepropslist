import { addDoc, collection } from 'firebase/firestore';
// import { db } from './lib/firebase'; // Remove direct import
import type { CustomFirestore } from '@/shared/services/firebase/types'; // Import correct type

const testProducts = [
  {
    name: "Vintage Pocket Watch",
    price: 45.99,
    description: "A beautifully detailed brass pocket watch with intricate engravings",
    category: "Accessories",
    source: "bought",
    sourceDetails: "Antique Store on Main St",
    purchaseUrl: "https://example.com/vintage-watch",
    act: 1,
    scene: 2,
    isMultiScene: false,
    isConsumable: false,
    quantity: 1,
    imageUrl: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=800&q=80",
    userId: null // This will be set when adding the document
  },
  {
    name: "Red Rose Bouquet",
    price: 12.99,
    description: "Fresh red roses for the romantic scene",
    category: "Flowers",
    source: "bought",
    sourceDetails: "Local Florist",
    act: 2,
    scene: 3,
    isMultiScene: false,
    isConsumable: true,
    quantity: 12,
    imageUrl: "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=800&q=80",
    userId: null
  },
  {
    name: "Wooden Writing Desk",
    price: 299.99,
    description: "Victorian-style writing desk, mahogany finish",
    category: "Furniture",
    source: "bought",
    sourceDetails: "Theater Props Warehouse",
    act: 1,
    scene: 1,
    isMultiScene: true,
    isConsumable: false,
    quantity: 1,
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
    userId: null
  },
  {
    name: "Crystal Wine Glasses",
    price: 24.99,
    description: "Set of elegant crystal wine glasses",
    category: "Tableware",
    source: "bought",
    sourceDetails: "HomeGoods",
    purchaseUrl: "https://example.com/wine-glasses",
    act: 2,
    scene: 4,
    isMultiScene: false,
    isConsumable: true,
    quantity: 6,
    imageUrl: "https://images.unsplash.com/photo-1570476922354-81227cdbb76c?auto=format&fit=crop&w=800&q=80",
    userId: null
  },
  {
    name: "Handcrafted Letter",
    price: 0,
    description: "Aged parchment with handwritten text",
    category: "Paper Props",
    source: "made",
    sourceDetails: "Props Department",
    act: 1,
    scene: 3,
    isMultiScene: false,
    isConsumable: false,
    quantity: 2,
    imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
    userId: null
  }
];

// Define the testShow object based on the Show interface from src/types.ts
const testShow = {
  // id: '', // ID will be assigned by Firestore
  name: 'Macbeth Test Show',
  description: 'A test production of Macbeth.',
  acts: [
    { id: 1, name: 'Act I', scenes: [{ id: 1, name: 'Scene 1' }, { id: 2, name: 'Scene 2' }, { id: 3, name: 'Scene 3' }] },
    { id: 2, name: 'Act II', scenes: [{ id: 1, name: 'Scene 1' }, { id: 2, name: 'Scene 2' }, { id: 3, name: 'Scene 3' }, { id: 4, name: 'Scene 4' }] },
    // Add more acts/scenes as needed
  ],
  // userId: '', // Will be set later
  // createdAt: '', // Will be set later
  collaborators: [],
  stageManager: 'Jane Doe',
  stageManagerEmail: 'jane.doe@example.com',
  propsSupervisor: 'John Smith',
  propsSupervisorEmail: 'john.smith@example.com',
  productionCompany: 'Test Theatre Co.',
  productionContactName: 'Test Contact',
  productionContactEmail: 'contact@testtheatre.com',
  venues: [],
  isTouringShow: false,
  contacts: [],
};

export async function addTestData(dbInstance: CustomFirestore) {
  if (!dbInstance) throw new Error('Firestore instance is required for addTestData.');
  // Get the current user's ID from Firebase Auth
  const auth = (await import('firebase/auth')).getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('No user is signed in. Please sign in before adding test data.');
    return;
  }

  for (const product of testProducts) {
    try {
      // Add the current user's ID to each product
      const productData = {
        ...product,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(dbInstance as any, 'props'), productData);
      console.log(`Added product: ${product.name}`);
    } catch (error) {
      console.error(`Error adding ${product.name}:`, error);
    }
  }
}

export async function addMacbethShow(dbInstance: CustomFirestore) {
  if (!dbInstance) throw new Error('Firestore instance is required for addMacbethShow.');
  // Get the current user's ID from Firebase Auth
  const auth = (await import('firebase/auth')).getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('No user is signed in. Please sign in before adding the show.');
    return;
  }

  try {
    // Add the show to Firestore
    const showData = {
      ...testShow, // Use the defined testShow object
      userId: currentUser.uid,
      createdAt: new Date().toISOString()
    };

    const showRef = await addDoc(collection(dbInstance as any, 'shows'), showData);
    console.log('Added Macbeth show with ID:', showRef.id);

    // Add all the props with the show ID
    for (const prop of testProducts) {
      const propData = {
        ...prop,
        showId: showRef.id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(dbInstance as any, 'props'), propData);
      console.log(`Added prop: ${prop.name}`);
    }

    console.log('Successfully added Macbeth show and all its props!');
    return showRef.id;
  } catch (error) {
    console.error('Error adding Macbeth show:', error);
    throw error;
  }
}