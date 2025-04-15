import { addDoc, collection } from 'firebase/firestore';
import { db } from './lib/firebase';

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

export async function addTestData() {
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

      await addDoc(collection(db, 'props'), productData);
      console.log(`Added product: ${product.name}`);
    } catch (error) {
      console.error(`Error adding ${product.name}:`, error);
    }
  }
}