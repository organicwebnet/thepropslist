/**
 * Comprehensive diagnostic tool for show deletion issues
 */

export interface DiagnosticResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

export class ShowDeletionDiagnostic {
  static async runFullDiagnostic(
    showId: string,
    firebaseService: any,
    authService: any
  ): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    console.log('🔍 Starting comprehensive show deletion diagnostic...');
    
    // Step 1: Check authentication
    try {
      const user = authService.currentUser;
      if (!user) {
        results.push({
          step: 'Authentication Check',
          success: false,
          error: 'No authenticated user found'
        });
        return results;
      }
      
      results.push({
        step: 'Authentication Check',
        success: true,
        data: { userId: user.uid, email: user.email }
      });
      console.log('✅ Authentication OK:', user.uid);
    } catch (error) {
      results.push({
        step: 'Authentication Check',
        success: false,
        error: error.message
      });
      return results;
    }
    
    // Step 2: Check Firebase service initialization
    try {
      if (!firebaseService) {
        results.push({
          step: 'Firebase Service Check',
          success: false,
          error: 'Firebase service is null/undefined'
        });
        return results;
      }
      
      if (!firebaseService.deleteDocument) {
        results.push({
          step: 'Firebase Service Check',
          success: false,
          error: 'deleteDocument method not available'
        });
        return results;
      }
      
      results.push({
        step: 'Firebase Service Check',
        success: true,
        data: { 
          serviceAvailable: true,
          methods: Object.keys(firebaseService)
        }
      });
      console.log('✅ Firebase Service OK');
    } catch (error) {
      results.push({
        step: 'Firebase Service Check',
        success: false,
        error: error.message
      });
      return results;
    }
    
    // Step 3: Test Firestore connection
    try {
      // Try to read a simple document to test connection
      const testDoc = await firebaseService.getDocument('shows', showId);
      results.push({
        step: 'Firestore Connection Test',
        success: true,
        data: { documentExists: !!testDoc }
      });
      console.log('✅ Firestore Connection OK');
    } catch (error) {
      results.push({
        step: 'Firestore Connection Test',
        success: false,
        error: error.message
      });
      return results;
    }
    
    // Step 4: Check show document structure
    try {
      const showDoc = await firebaseService.getDocument('shows', showId);
      const showData = showDoc.data();
      
      results.push({
        step: 'Show Document Structure',
        success: true,
        data: {
          hasUserId: !!showData?.userId,
          hasOwnerId: !!showData?.ownerId,
          hasCreatedBy: !!showData?.createdBy,
          hasTeam: !!showData?.team,
          ownershipFields: {
            userId: showData?.userId,
            ownerId: showData?.ownerId,
            createdBy: showData?.createdBy,
            team: showData?.team
          }
        }
      });
      console.log('✅ Show Document Structure OK');
    } catch (error) {
      results.push({
        step: 'Show Document Structure',
        success: false,
        error: error.message
      });
      return results;
    }
    
    // Step 5: Test direct document deletion
    try {
      console.log('🧪 Testing direct document deletion...');
      await firebaseService.deleteDocument('shows', showId);
      
      results.push({
        step: 'Direct Document Deletion',
        success: true,
        data: { deleted: true }
      });
      console.log('✅ Direct Document Deletion OK');
    } catch (error) {
      results.push({
        step: 'Direct Document Deletion',
        success: false,
        error: error.message
      });
      console.log('❌ Direct Document Deletion Failed:', error);
    }
    
    return results;
  }
  
  static logResults(results: DiagnosticResult[]): void {
    console.group('🔍 Show Deletion Diagnostic Results');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} Step ${index + 1}: ${result.step}`);
      if (result.success && result.data) {
        console.log('   Data:', result.data);
      }
      if (!result.success && result.error) {
        console.log('   Error:', result.error);
      }
    });
    console.groupEnd();
  }
}
