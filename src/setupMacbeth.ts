import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Now import Firebase-related code after environment variables are loaded
import { addMacbethShow } from './testData';

addMacbethShow()
  .then((showId) => {
    if (showId) {
      console.log('Successfully added Macbeth show with ID:', showId);
    }
  })
  .catch(error => console.error('Error adding Macbeth show:', error)); 