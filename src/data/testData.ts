import { Show, Prop, PropImage, DigitalAsset, Venue, Contact, ShowCollaborator } from '../types';
import { addDoc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';

const currentDate = new Date().toISOString();

// Sample images for props
const sampleImages: PropImage[] = [
  {
    id: 'img1',
    url: 'https://example.com/dagger.jpg',
    isMain: true,
    uploadedAt: currentDate,
    caption: 'Main view of the dagger'
  },
  {
    id: 'img2',
    url: 'https://example.com/crown.jpg',
    isMain: true,
    uploadedAt: currentDate,
    caption: 'King Duncan\'s crown'
  }
];

// Sample digital assets
const sampleDigitalAssets: DigitalAsset[] = [
  {
    id: 'da1',
    title: 'Dagger Assembly Instructions',
    url: 'https://example.com/dagger-instructions.pdf',
    createdAt: currentDate,
    status: 'active'
  },
  {
    id: 'da2',
    title: 'Cauldron Setup Video',
    url: 'https://example.com/cauldron-setup.mp4',
    createdAt: currentDate,
    status: 'active'
  }
];

// Sample venues
const venues: Venue[] = [
  {
    name: 'Royal Shakespeare Theatre',
    address: '123 Shakespeare St, Stratford-upon-Avon',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    notes: 'Main venue for the summer season'
  },
  {
    name: 'Globe Theatre',
    address: '21 New Globe Walk, London',
    startDate: '2024-09-15',
    endDate: '2024-11-30',
    notes: 'Touring venue - special care needed for prop transport'
  }
];

// Sample contacts
const contacts: Contact[] = [
  {
    name: 'John Smith',
    role: 'Technical Director',
    email: 'john@theatre.com',
    phone: '+44 123 456 7890'
  },
  {
    name: 'Sarah Johnson',
    role: 'Props Master',
    email: 'sarah@theatre.com',
    phone: '+44 123 456 7891'
  }
];

// Sample collaborators
const collaborators: ShowCollaborator[] = [
  {
    email: 'assistant@theatre.com',
    role: 'editor',
    addedAt: currentDate,
    addedBy: 'admin@theatre.com'
  },
  {
    email: 'organicwebnet@gmail.com',
    role: 'editor',
    addedAt: currentDate,
    addedBy: 'admin@theatre.com'
  }
];

// Test show data
export const testShow: Show = {
  id: 'show1',
  name: 'Macbeth',
  description: 'Shakespeare\'s tragic tale of ambition and destiny',
  acts: [
    {
      id: 1,
      name: 'Act I',
      description: 'The prophecy and its immediate aftermath',
      scenes: [
        { id: 1, name: 'The Witches', description: 'Three witches meet on a heath' },
        { id: 2, name: 'Victory News', description: 'News of Macbeth\'s victory' },
        { id: 3, name: 'The Prophecy', description: 'Witches deliver their prophecy' }
      ]
    },
    {
      id: 2,
      name: 'Act II',
      description: 'The murder of King Duncan',
      scenes: [
        { id: 1, name: 'The Dagger', description: 'Macbeth\'s famous dagger soliloquy' },
        { id: 2, name: 'The Murder', description: 'The murder of King Duncan' }
      ]
    },
    {
      id: 3,
      name: 'Act III',
      description: 'Banquo\'s murder and the banquet',
      scenes: [
        { id: 1, name: 'Banquo\'s Murder', description: 'The murder of Banquo' },
        { id: 2, name: 'The Banquet', description: 'Banquet scene with ghost' }
      ]
    }
  ],
  userId: 'placeholder_uid',
  createdAt: currentDate,
  collaborators,
  stageManager: 'Michael Brown',
  stageManagerEmail: 'michael@theatre.com',
  stageManagerPhone: '+44 123 456 7892',
  propsSupervisor: 'Emma Wilson',
  propsSupervisorEmail: 'emma@theatre.com',
  propsSupervisorPhone: '+44 123 456 7893',
  productionCompany: 'Royal Shakespeare Company',
  productionContactName: 'David Thompson',
  productionContactEmail: 'david@rsc.com',
  productionContactPhone: '+44 123 456 7894',
  venues,
  isTouringShow: true,
  contacts,
  imageUrl: 'https://example.com/macbeth-poster.jpg',
  logoImage: {
    id: 'logo1',
    url: 'https://example.com/rsc-logo.png',
    isMain: true,
    uploadedAt: currentDate,
    caption: 'RSC Logo'
  }
};

// Test props data
export const testProps: Prop[] = [
  {
    id: 'prop1',
    userId: 'user1',
    showId: 'show1',
    name: 'Bloody Dagger',
    price: 299.99,
    description: 'Hero prop dagger with blood effect mechanism',
    category: 'Weapon',
    length: 35,
    width: 8,
    height: 2,
    weight: 0.5,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'made',
    sourceDetails: 'Custom made by theater props department',
    act: 2,
    scene: 1,
    isMultiScene: true,
    isConsumable: false,
    quantity: 3,
    imageUrl: 'https://example.com/dagger.jpg',
    images: sampleImages,
    hasUsageInstructions: true,
    usageInstructions: 'Press hidden button for blood effect. Clean after each use.',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Clean blood mechanism daily with provided solution',
    hasSafetyNotes: true,
    safetyNotes: 'Blade is dull but handle with care',
    handlingInstructions: 'Handle with care - delicate blood mechanism',
    requiresPreShowSetup: true,
    preShowSetupNotes: 'Fill blood reservoir before show',
    preShowSetupDuration: 15,
    hasOwnShippingCrate: true,
    shippingCrateDetails: 'Custom foam-lined case',
    requiresSpecialTransport: false,
    hasBeenModified: true,
    modificationDetails: 'Added improved blood pump mechanism',
    lastModifiedAt: currentDate,
    isRented: false,
    digitalAssets: [sampleDigitalAssets[0]],
    createdAt: currentDate,
    travelsUnboxed: false
  },
  {
    id: 'prop2',
    userId: 'user1',
    showId: 'show1',
    name: 'Witch\'s Cauldron',
    price: 1500,
    description: 'Large cauldron with smoke effect',
    category: 'Special Effects',
    length: 80,
    width: 80,
    height: 90,
    weight: 15,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'rented',
    sourceDetails: 'Rented from Special Effects Co.',
    rentalSource: 'Special Effects Co.',
    rentalDueDate: '2024-12-31',
    rentalReferenceNumber: 'SFX123',
    act: 1,
    scene: 1,
    isMultiScene: true,
    isConsumable: false,
    quantity: 1,
    imageUrl: 'https://example.com/cauldron.jpg',
    images: [],
    hasUsageInstructions: true,
    usageInstructions: 'Use only approved smoke fluid',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Clean after each use, check smoke machine monthly',
    hasSafetyNotes: true,
    safetyNotes: 'Keep actors at safe distance when smoke active',
    handlingInstructions: 'Heavy item - requires 2 person lift',
    requiresPreShowSetup: true,
    preShowSetupNotes: 'Fill smoke fluid, test effect',
    preShowSetupVideo: 'https://example.com/cauldron-setup.mp4',
    preShowSetupDuration: 30,
    hasOwnShippingCrate: true,
    shippingCrateDetails: 'Comes with wheeled road case',
    requiresSpecialTransport: true,
    transportNotes: 'Must be transported upright',
    travelWeight: 45,
    hasBeenModified: false,
    modificationDetails: '',
    isRented: true,
    digitalAssets: [sampleDigitalAssets[1]],
    createdAt: currentDate,
    travelsUnboxed: true
  },
  {
    id: 'prop3',
    userId: 'user1',
    showId: 'show1',
    name: 'Crown',
    price: 850,
    description: 'King Duncan\'s crown',
    category: 'Costume',
    length: 20,
    width: 20,
    height: 15,
    weight: 0.4,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'bought',
    sourceDetails: 'Purchased from Royal Props Ltd',
    purchaseUrl: 'https://royalprops.com/crown',
    act: 2,
    scene: 2,
    isMultiScene: false,
    isConsumable: false,
    quantity: 2,
    imageUrl: 'https://example.com/crown.jpg',
    images: [sampleImages[1]],
    hasUsageInstructions: true,
    usageInstructions: 'Handle by rim only',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Polish weekly with provided cloth',
    hasSafetyNotes: false,
    handlingInstructions: 'Fragile - handle with care',
    requiresPreShowSetup: false,
    hasOwnShippingCrate: true,
    shippingCrateDetails: 'Velvet-lined box',
    requiresSpecialTransport: false,
    hasBeenModified: false,
    isRented: false,
    modificationDetails: '',
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: false
  },
  {
    id: 'prop4',
    userId: 'user1',
    showId: 'show1',
    name: 'Banquet Goblets',
    price: 45,
    description: 'Medieval-style drinking goblets',
    category: 'Hand Prop',
    length: 15,
    width: 8,
    height: 12,
    weight: 0.3,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'bought',
    sourceDetails: 'Bulk purchase from Props Warehouse',
    act: 3,
    scene: 2,
    isMultiScene: false,
    isConsumable: false,
    quantity: 10,
    imageUrl: 'https://example.com/goblet.jpg',
    images: [],
    hasUsageInstructions: false,
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Hand wash only',
    hasSafetyNotes: false,
    handlingInstructions: 'Fragile',
    requiresPreShowSetup: false,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: false,
    hasBeenModified: false,
    isRented: false,
    modificationDetails: '',
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: false
  },
  {
    id: 'prop5',
    userId: 'user1',
    showId: 'show1',
    name: 'Letter Scroll',
    price: 15,
    description: 'Aged parchment scroll with seal',
    category: 'Book/Paper',
    length: 30,
    width: 20,
    height: 0.1,
    weight: 0.1,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'made',
    sourceDetails: 'Created by props department',
    act: 1,
    scene: 2,
    isMultiScene: false,
    isConsumable: true,
    quantity: 5,
    imageUrl: 'https://example.com/scroll.jpg',
    images: [],
    hasUsageInstructions: false,
    hasMaintenanceNotes: false,
    hasSafetyNotes: false,
    requiresPreShowSetup: false,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: false,
    hasBeenModified: false,
    isRented: false,
    modificationDetails: '',
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: false
  },
  {
    id: 'prop6',
    userId: 'user1',
    showId: 'show1',
    name: 'Banquo\'s Ghost Makeup Kit',
    price: 250,
    description: 'Professional SFX makeup kit',
    category: 'Special Effects',
    length: 25,
    width: 20,
    height: 10,
    weight: 1.2,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'borrowed',
    sourceDetails: 'Borrowed from makeup artist Sarah',
    act: 3,
    scene: 2,
    isMultiScene: false,
    isConsumable: true,
    quantity: 3,
    imageUrl: 'https://example.com/makeup-kit.jpg',
    images: [],
    hasUsageInstructions: true,
    usageInstructions: 'Apply in order shown in reference photos',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Clean brushes after each use',
    hasSafetyNotes: true,
    safetyNotes: 'Test on small skin area first',
    handlingInstructions: 'Keep at room temperature',
    requiresPreShowSetup: true,
    preShowSetupNotes: 'Makeup application takes 45 minutes',
    preShowSetupDuration: 45,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: false,
    hasBeenModified: false,
    isRented: false,
    modificationDetails: '',
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: false
  },
  {
    id: 'prop7',
    userId: 'user1',
    showId: 'show1',
    name: 'Banquet Table',
    price: 1200,
    description: 'Large medieval-style banquet table for the feast scene',
    category: 'Furniture',
    length: 240,
    width: 120,
    height: 80,
    weight: 85,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'bought',
    sourceDetails: 'Custom made by theatrical furniture maker',
    act: 3,
    scene: 2,
    isMultiScene: false,
    isConsumable: false,
    quantity: 1,
    imageUrl: 'https://example.com/banquet-table.jpg',
    images: [],
    hasUsageInstructions: true,
    usageInstructions: 'Requires 4 people to move safely',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Check leg stability before each performance',
    hasSafetyNotes: true,
    safetyNotes: 'Must be properly secured to prevent tipping',
    handlingInstructions: 'Heavy item - requires 4 person lift',
    requiresPreShowSetup: true,
    preShowSetupNotes: 'Allow 30 minutes for assembly',
    preShowSetupDuration: 30,
    hasOwnShippingCrate: false,
    shippingCrateDetails: '',
    requiresSpecialTransport: true,
    transportNotes: 'Requires furniture blankets and straps',
    travelWeight: 85,
    hasBeenModified: false,
    modificationDetails: '',
    isRented: false,
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: true
  },
  {
    id: 'prop8',
    userId: 'user1',
    showId: 'show1',
    name: 'Throne',
    price: 2500,
    description: 'Ornate medieval throne for King Duncan',
    category: 'Furniture',
    length: 100,
    width: 90,
    height: 180,
    weight: 45,
    weightUnit: 'kg',
    unit: 'cm',
    source: 'rented',
    sourceDetails: 'Rented from Royal Props Ltd',
    rentalSource: 'Royal Props Ltd',
    rentalDueDate: '2024-12-31',
    rentalReferenceNumber: 'RPL789',
    act: 1,
    scene: 2,
    isMultiScene: true,
    isConsumable: false,
    quantity: 1,
    imageUrl: 'https://example.com/throne.jpg',
    images: [],
    hasUsageInstructions: true,
    usageInstructions: 'Ensure throne is stable before use',
    hasMaintenanceNotes: true,
    maintenanceNotes: 'Polish woodwork weekly',
    hasSafetyNotes: true,
    safetyNotes: 'Check stability before each performance',
    handlingInstructions: 'Requires 2 person lift',
    requiresPreShowSetup: false,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: true,
    transportNotes: 'Must be transported upright and secured',
    travelWeight: 45,
    hasBeenModified: false,
    modificationDetails: '',
    isRented: true,
    digitalAssets: [],
    createdAt: currentDate,
    travelsUnboxed: true
  }
];

export async function addMacbethShow() {
  // Get the current user's ID from Firebase Auth
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('No user is signed in. Please sign in before adding the show.');
    return;
  }

  try {
    // Add the show to Firestore
    const showData = {
      ...testShow,
      userId: currentUser.uid, // Use uid instead of email
      createdAt: new Date().toISOString()
    };

    const showRef = await addDoc(collection(db, 'shows'), showData);
    console.log('Added Macbeth show with ID:', showRef.id);

    // Add all the props with the show ID
    for (const prop of testProps) {
      const propData = {
        ...prop,
        showId: showRef.id,
        userId: currentUser.uid, // Use uid instead of email
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'props'), propData);
      console.log(`Added prop: ${prop.name}`);
    }

    console.log('Successfully added Macbeth show and all its props!');
    return showRef.id;
  } catch (error) {
    console.error('Error adding Macbeth show:', error);
    throw error;
  }
} 