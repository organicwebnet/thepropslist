import { FirebaseService } from '../shared/services/firebase/types';
import { ShoppingServiceBase } from '../shared/services/shoppingServiceBase';

/**
 * Mobile ShoppingService - extends base service
 * Uses shared base implementation to reduce code duplication
 */
export class ShoppingService extends ShoppingServiceBase {
  constructor(firebaseService: FirebaseService) {
    super(firebaseService);
  }
} 