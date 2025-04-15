import { addTestData } from './testData';

addTestData()
  .then(() => console.log('Test data added successfully'))
  .catch(error => console.error('Error adding test data:', error));