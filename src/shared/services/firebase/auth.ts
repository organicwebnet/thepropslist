import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { FirebaseService } from './types';
import { UserRole, UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '../../types/auth';

export class AuthService {
  constructor(private firebase: FirebaseService) {}

  async getCurrentUser(): Promise<User | null> {
    return this.firebase.auth().currentUser;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const db = this.firebase.firestore();
      if (!db) throw new Error("Firestore service not available in AuthService");

      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        uid: uid,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async createUserProfile(user: User, role: UserRole = UserRole.USER): Promise<void> {
    const db = this.firebase.firestore();
    if (!db) throw new Error("Firestore service not available in AuthService");
    const now = new Date();
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      createdAt: now,
      updatedAt: now
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, profile);
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const db = this.firebase.firestore();
    if (!db) throw new Error("Firestore service not available in AuthService");
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      role: newRole,
      permissions: DEFAULT_ROLE_PERMISSIONS[newRole],
      updatedAt: new Date()
    });
  }

  async updateUserPermissions(uid: string, permissions: Partial<UserPermissions>): Promise<void> {
    const db = this.firebase.firestore();
    if (!db) throw new Error("Firestore service not available in AuthService");
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      permissions: permissions,
      updatedAt: new Date()
    });
  }

  async hasPermission(uid: string, permission: keyof UserPermissions): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile?.permissions?.[permission] || false;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    await this.firebase.auth().signIn(email, password);
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after sign in');
    }
    
    const profile = await this.getUserProfile(user.uid);
    if (!profile) {
      console.log(`Profile missing for ${user.uid}, creating default.`);
      await this.createUserProfile(user);
      const newProfile = await this.getUserProfile(user.uid);
      if (!newProfile) throw new Error('Failed to create or retrieve profile after sign-in');
      throw new Error('User profile not found');
    }
    
    return profile;
  }

  async signOut(): Promise<void> {
    await this.firebase.auth().signOut();
  }

  async createUser(email: string, password: string, role: UserRole = UserRole.USER): Promise<void> {
    await this.firebase.auth().createUser(email, password);
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after creation');
    }
    
    await this.createUserProfile(user, role);
  }
} 