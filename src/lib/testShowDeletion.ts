/**
 * Test utility for show deletion debugging
 */

export class ShowDeletionTester {
  static async testShowDeletion(
    showId: string,
    firebaseService: any,
    authService: any
  ): Promise<{
    success: boolean;
    error?: string;
    debugInfo?: any;
  }> {
    try {
      console.log('🧪 Testing show deletion...');
      
      // Check authentication
      const user = authService.currentUser;
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }
      
      console.log('✅ User authenticated:', user.uid);
      
      // Test reading the show document
      try {
        const showDoc = await firebaseService.getDocument('shows', showId);
        const showData = showDoc.data();
        console.log('✅ Show document read successfully:', showData);
        
        // Check ownership fields
        const ownershipFields = {
          userId: showData?.userId,
          ownerId: showData?.ownerId,
          createdBy: showData?.createdBy,
          team: showData?.team,
        };
        console.log('📋 Ownership fields:', ownershipFields);
        
        // Check if user has ownership
        const hasOwnership = 
          showData?.userId === user.uid ||
          showData?.ownerId === user.uid ||
          showData?.createdBy === user.uid ||
          (showData?.team && showData.team[user.uid]);
        
        console.log('🔐 User has ownership:', hasOwnership);
        
        return {
          success: true,
          debugInfo: {
            userId: user.uid,
            showId,
            ownershipFields,
            hasOwnership,
            showData,
          }
        };
      } catch (readError) {
        console.error('❌ Error reading show document:', readError);
        return { success: false, error: `Failed to read show: ${readError.message}` };
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async testDirectDeletion(
    showId: string,
    firebaseService: any
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🧪 Testing direct show deletion...');
      
      // Try to delete the show document directly
      await firebaseService.deleteDocument('shows', showId);
      
      console.log('✅ Show deleted successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Direct deletion failed:', error);
      return { success: false, error: error.message };
    }
  }
}
