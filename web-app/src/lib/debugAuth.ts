/**
 * Authentication debugging utility for show deletion issues
 */

export class AuthDebugger {
  static async debugAuthentication(): Promise<{
    isAuthenticated: boolean;
    user: any;
    authState: string;
    firebaseAuth: any;
    error?: string;
  }> {
    try {
      console.log('🔍 Debugging authentication state...');
      
      // Get Firebase auth instance
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      console.log('✅ Firebase auth instance:', auth);
      
      // Check current user
      const currentUser = auth.currentUser;
      console.log('👤 Current user:', currentUser);
      
      // Check auth state
      const authState = auth.currentUser ? 'authenticated' : 'not authenticated';
      console.log('🔐 Auth state:', authState);
      
      if (currentUser) {
        console.log('📋 User details:', {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          emailVerified: currentUser.emailVerified,
          isAnonymous: currentUser.isAnonymous,
          metadata: {
            creationTime: currentUser.metadata.creationTime,
            lastSignInTime: currentUser.metadata.lastSignInTime,
          }
        });
        
        // Get ID token to verify it's valid
        try {
          const idToken = await currentUser.getIdToken();
          console.log('🎫 ID token obtained successfully (length:', idToken.length, ')');
        } catch (tokenError) {
          console.error('❌ Failed to get ID token:', tokenError);
        }
      }
      
      return {
        isAuthenticated: !!currentUser,
        user: currentUser,
        authState,
        firebaseAuth: auth,
      };
    } catch (error) {
      console.error('❌ Auth debugging failed:', error);
      return {
        isAuthenticated: false,
        user: null,
        authState: 'error',
        firebaseAuth: null,
        error: error.message,
      };
    }
  }
  
  static async debugShowOwnership(showId: string): Promise<{
    showExists: boolean;
    showData: any;
    ownershipFields: any;
    error?: string;
  }> {
    try {
      console.log('🔍 Debugging show ownership for:', showId);
      
      // Get Firebase services
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const db = getFirestore();
      
      // Get show document
      const showRef = doc(db, 'shows', showId);
      const showSnap = await getDoc(showRef);
      
      if (!showSnap.exists()) {
        return {
          showExists: false,
          showData: null,
          ownershipFields: null,
          error: 'Show document does not exist',
        };
      }
      
      const showData = showSnap.data();
      console.log('📄 Show data:', showData);
      
      const ownershipFields = {
        userId: showData?.userId,
        ownerId: showData?.ownerId,
        createdBy: showData?.createdBy,
        team: showData?.team,
      };
      
      console.log('🔐 Ownership fields:', ownershipFields);
      
      return {
        showExists: true,
        showData,
        ownershipFields,
      };
    } catch (error) {
      console.error('❌ Show ownership debugging failed:', error);
      return {
        showExists: false,
        showData: null,
        ownershipFields: null,
        error: error.message,
      };
    }
  }
  
  static async testShowDeletionPermission(showId: string): Promise<{
    canDelete: boolean;
    reason: string;
    debugInfo: any;
  }> {
    try {
      console.log('🧪 Testing show deletion permission for:', showId);
      
      // Check authentication
      const authDebug = await this.debugAuthentication();
      if (!authDebug.isAuthenticated) {
        return {
          canDelete: false,
          reason: 'User not authenticated',
          debugInfo: authDebug,
        };
      }
      
      // Check show ownership
      const ownershipDebug = await this.debugShowOwnership(showId);
      if (!ownershipDebug.showExists) {
        return {
          canDelete: false,
          reason: 'Show does not exist',
          debugInfo: ownershipDebug,
        };
      }
      
      const userId = authDebug.user.uid;
      const showData = ownershipDebug.showData;
      
      // Check if user has ownership
      const hasOwnership = 
        showData?.userId === userId ||
        showData?.ownerId === userId ||
        showData?.createdBy === userId ||
        (showData?.team && showData.team[userId]);
      
      console.log('🔐 User has ownership:', hasOwnership);
      console.log('👤 User ID:', userId);
      console.log('📋 Show ownership fields:', ownershipDebug.ownershipFields);
      
      return {
        canDelete: hasOwnership,
        reason: hasOwnership ? 'User has ownership' : 'User does not have ownership',
        debugInfo: {
          auth: authDebug,
          ownership: ownershipDebug,
          userId,
          hasOwnership,
        },
      };
    } catch (error) {
      console.error('❌ Permission test failed:', error);
      return {
        canDelete: false,
        reason: `Test failed: ${error.message}`,
        debugInfo: { error: error.message },
      };
    }
  }
  
  static async runFullDiagnostic(showId: string): Promise<void> {
    console.group('🔍 Full Authentication & Permission Diagnostic');
    
    try {
      // Test authentication
      console.log('1️⃣ Testing authentication...');
      const authResult = await this.debugAuthentication();
      console.log('Auth result:', authResult);
      
      // Test show ownership
      console.log('2️⃣ Testing show ownership...');
      const ownershipResult = await this.debugShowOwnership(showId);
      console.log('Ownership result:', ownershipResult);
      
      // Test deletion permission
      console.log('3️⃣ Testing deletion permission...');
      const permissionResult = await this.testShowDeletionPermission(showId);
      console.log('Permission result:', permissionResult);
      
      // Summary
      console.log('📊 DIAGNOSTIC SUMMARY:');
      console.log('- Authenticated:', authResult.isAuthenticated);
      console.log('- Show exists:', ownershipResult.showExists);
      console.log('- Can delete:', permissionResult.canDelete);
      console.log('- Reason:', permissionResult.reason);
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    } finally {
      console.groupEnd();
    }
  }
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).AuthDebugger = AuthDebugger;
}
