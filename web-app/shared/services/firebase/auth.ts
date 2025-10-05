import { User } from 'firebase/auth';
import { FirebaseService } from './types.ts';
import { UserRole, UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '../../types/auth.ts';

export class AuthService {
  constructor(private firebase: FirebaseService) {}

  async getCurrentUser(): Promise<User | null> {
    return this.firebase.auth.currentUser as User | null;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await this.firebase.getDocument<UserProfile>('userProfiles', uid);
    
    if (!userDoc || !userDoc.data) {
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
      id: uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL, // Keep photoURL, assume it exists (possibly optional)
      role: data.role,
      permissions: data.permissions, 
      createdAt: convertTimestamp(data.createdAt) || new Date(), 
      updatedAt: convertTimestamp(data.updatedAt) || new Date(),
    } as UserProfile; // Cast might still be needed if types aren't perfectly aligned
  }

  async createUserProfile(user: User, role: UserRole = UserRole.VIEWER): Promise<void> {
    const now = new Date();
    // Use UserProfile directly, assuming uid is handled by the path/set logic
    // Ensure UserProfile allows optional fields like displayName, photoURL if needed

    if (!user.email) {
      throw new Error('User email is null, cannot create profile.');
    }

    const profileData: Partial<UserProfile> = {
      email: user.email, 
      displayName: user.displayName ?? undefined, 
      photoURL: user.photoURL ?? undefined, // Keep photoURL
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      createdAt: now, 
      updatedAt: now
    };

    await this.firebase.addDocument<Partial<UserProfile>>(`userProfiles/${user.uid}`, profileData);
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const updateData: Partial<UserProfile> = {
      role: newRole,
      permissions: DEFAULT_ROLE_PERMISSIONS[newRole],
      updatedAt: new Date() 
    };
    await this.firebase.updateDocument<UserProfile>('userProfiles', uid, updateData);
  }

  async updateUserPermissions(uid: string, permissionsInput: Partial<UserPermissions>): Promise<void> {
    // Pass Partial<UserPermissions> directly, relying on updateDocument to handle merge
    const updateData: Partial<UserProfile> = {
        permissions: permissionsInput, 
        updatedAt: new Date() 
    };
    await this.firebase.updateDocument<UserProfile>('userProfiles', uid, updateData);
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
      await this.createUserProfile(user as User);
      profile = await this.getUserProfile(user.uid);
      if (!profile) throw new Error('Failed to create or retrieve profile after sign-in');
    }
    
    return profile;
  }

  async signOut(): Promise<void> {
    await this.firebase.signOut();
  }

  async createUser(email: string, password: string, role: UserRole = UserRole.VIEWER): Promise<void> {
    const userCredential = await this.firebase.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    if (!user || !user.uid) {
      throw new Error('Failed to get user after creation');
    }
    
    await this.createUserProfile(user as User, role);
  }
} 
