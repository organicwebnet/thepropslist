import { User } from 'firebase/auth';
import { FirebaseService } from './types';
import { UserRole, UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '../../types/auth';

export class AuthService {
  constructor(private firebase: FirebaseService) {}

  async getCurrentUser(): Promise<User | null> {
    return this.firebase.auth().currentUser;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const doc = await this.firebase.firestore()
        .collection('users')
        .doc(uid)
        .get();

      if (!doc.exists()) {
        return null;
      }

      const data = await doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async createUserProfile(user: User, role: UserRole = UserRole.USER): Promise<void> {
    const now = new Date();
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      createdAt: now,
      updatedAt: now
    };

    await this.firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .set(profile);
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    await this.firebase.firestore()
      .collection('users')
      .doc(uid)
      .update({
        role: newRole,
        permissions: DEFAULT_ROLE_PERMISSIONS[newRole],
        updatedAt: new Date()
      });
  }

  async updateUserPermissions(uid: string, permissions: Partial<UserPermissions>): Promise<void> {
    await this.firebase.firestore()
      .collection('users')
      .doc(uid)
      .update({
        'permissions': permissions,
        updatedAt: new Date()
      });
  }

  async hasPermission(uid: string, permission: keyof UserPermissions): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile?.permissions[permission] || false;
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    await this.firebase.auth().signIn(email, password);
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after sign in');
    }
    
    const profile = await this.getUserProfile(user.uid);
    if (!profile) {
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