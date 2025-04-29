import { User } from 'firebase/auth';
import { FirebaseService, FirebaseDocument } from './types';
import { UserRole, UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '../../types/auth';

export class AuthService {
  constructor(private firebase: FirebaseService) {}

  async getCurrentUser(): Promise<User | null> {
    return this.firebase.auth().currentUser;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await this.firebase.getDocument<UserProfile>('users', uid);
      
      if (!userDoc || !userDoc.data) {
        console.log(`User profile document not found for uid: ${uid}`);
        return null;
      }

      const data = userDoc.data;
      const convertTimestamp = (timestamp: any): Date | undefined => {
          // Simplified timestamp conversion - assumes service returns something usable
          if (!timestamp) return undefined;
          if (timestamp instanceof Date) return timestamp;
          try { return new Date(timestamp); } catch { return undefined; }
          // Add more specific checks if needed (e.g., Firebase Timestamp toDate())
      };
      
      // Assume UserProfile includes these fields, potentially optional
      return {
        uid: uid, 
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL, // Keep photoURL, assume it exists (possibly optional)
        role: data.role,
        permissions: data.permissions, 
        createdAt: convertTimestamp(data.createdAt) || new Date(), 
        updatedAt: convertTimestamp(data.updatedAt) || new Date(),
      } as UserProfile; // Cast might still be needed if types aren't perfectly aligned
    } catch (error) {
      console.error(`Error fetching user profile for uid ${uid}:`, error);
      return null;
    }
  }

  async createUserProfile(user: User, role: UserRole = UserRole.USER): Promise<void> {
    const now = new Date();
    // Use UserProfile directly, assuming uid is handled by the path/set logic
    // Ensure UserProfile allows optional fields like displayName, photoURL if needed
    const profileData: Partial<UserProfile> = {
      email: user.email!, 
      displayName: user.displayName ?? undefined, 
      photoURL: user.photoURL ?? undefined, // Keep photoURL
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      createdAt: now, 
      updatedAt: now
    };

    try {
       // This assumes addDocument uses the second arg as the document ID if path includes it
       // Or preferably, use a setDocument method if available in FirebaseService
       // await this.firebase.setDocument<Partial<UserProfile>>('users', user.uid, profileData);
       await this.firebase.addDocument<Partial<UserProfile>>(`users/${user.uid}`, profileData);
       console.log(`Created user profile for ${user.uid}`);
    } catch (error) {
       console.error(`Error creating user profile for ${user.uid}:`, error);
       throw error;
    }
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const updateData: Partial<UserProfile> = {
      role: newRole,
      permissions: DEFAULT_ROLE_PERMISSIONS[newRole],
      updatedAt: new Date() 
    };
    try {
        await this.firebase.updateDocument<UserProfile>('users', uid, updateData);
        console.log(`Updated role for user ${uid} to ${newRole}`);
    } catch (error) {
        console.error(`Error updating role for user ${uid}:`, error);
        throw error;
    }
  }

  async updateUserPermissions(uid: string, permissionsInput: Partial<UserPermissions>): Promise<void> {
    // Pass Partial<UserPermissions> directly, relying on updateDocument to handle merge
    const updateData: Partial<UserProfile> = {
        permissions: permissionsInput, 
        updatedAt: new Date() 
    };
     try {
        // Service's updateDocument should handle merging Partial<UserProfile>
        await this.firebase.updateDocument<UserProfile>('users', uid, updateData);
        console.log(`Updated permissions for user ${uid}`);
    } catch (error) {
        console.error(`Error updating permissions for user ${uid}:`, error);
        throw error;
    }
  }

  async hasPermission(uid: string, permission: keyof UserPermissions): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile?.permissions?.[permission] || false;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    const userCredential = await this.firebase.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    if (!user || !user.uid) {
      throw new Error('Failed to get user after sign in');
    }
    
    let profile = await this.getUserProfile(user.uid);
    if (!profile) {
      console.log(`Profile missing for ${user.uid}, creating default.`);
      await this.createUserProfile(user as User);
      profile = await this.getUserProfile(user.uid);
      if (!profile) throw new Error('Failed to create or retrieve profile after sign-in');
    }
    
    return profile;
  }

  async signOut(): Promise<void> {
    await this.firebase.auth().signOut();
  }

  async createUser(email: string, password: string, role: UserRole = UserRole.USER): Promise<void> {
    const userCredential = await this.firebase.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    if (!user || !user.uid) {
      throw new Error('Failed to get user after creation');
    }
    
    await this.createUserProfile(user as User, role);
  }
} 