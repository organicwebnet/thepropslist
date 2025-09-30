/**
 * Debug utility for show deletion issues
 */

export interface ShowDeletionDebugInfo {
  showId: string;
  userId: string;
  showData: any;
  hasUserId: boolean;
  hasOwnerId: boolean;
  hasCreatedBy: boolean;
  hasTeam: boolean;
  userInTeam: boolean;
  teamRole?: string;
  ownershipFields: string[];
  timestamp: Date;
}

export class ShowDeletionDebugger {
  static async debugShowDeletion(
    showId: string, 
    userId: string, 
    firebaseService: any
  ): Promise<ShowDeletionDebugInfo> {
    try {
      // Get the show document
      const showDoc = await firebaseService.getDocument('shows', showId);
      const showData = showDoc.data();

      const debugInfo: ShowDeletionDebugInfo = {
        showId,
        userId,
        showData,
        hasUserId: !!showData?.userId,
        hasOwnerId: !!showData?.ownerId,
        hasCreatedBy: !!showData?.createdBy,
        hasTeam: !!showData?.team,
        userInTeam: !!(showData?.team && showData.team[userId]),
        teamRole: showData?.team?.[userId],
        ownershipFields: [],
        timestamp: new Date(),
      };

      // Check ownership fields
      if (showData?.userId === userId) debugInfo.ownershipFields.push('userId');
      if (showData?.ownerId === userId) debugInfo.ownershipFields.push('ownerId');
      if (showData?.createdBy === userId) debugInfo.ownershipFields.push('createdBy');
      if (showData?.team?.[userId]) debugInfo.ownershipFields.push(`team.${userId}`);

      return debugInfo;
    } catch (error) {
      console.error('Error debugging show deletion:', error);
      throw error;
    }
  }

  static logDebugInfo(debugInfo: ShowDeletionDebugInfo): void {
    console.group('🔍 Show Deletion Debug Info');
    console.log('Show ID:', debugInfo.showId);
    console.log('User ID:', debugInfo.userId);
    console.log('Has userId field:', debugInfo.hasUserId);
    console.log('Has ownerId field:', debugInfo.hasOwnerId);
    console.log('Has createdBy field:', debugInfo.hasCreatedBy);
    console.log('Has team field:', debugInfo.hasTeam);
    console.log('User in team:', debugInfo.userInTeam);
    console.log('Team role:', debugInfo.teamRole);
    console.log('Ownership fields:', debugInfo.ownershipFields);
    console.log('Show data:', debugInfo.showData);
    console.groupEnd();
  }

  static async testShowDeletionPermission(
    showId: string,
    userId: string,
    firebaseService: any
  ): Promise<boolean> {
    try {
      const debugInfo = await this.debugShowDeletion(showId, userId, firebaseService);
      this.logDebugInfo(debugInfo);
      
      // Check if user has any ownership
      const hasOwnership = debugInfo.ownershipFields.length > 0;
      
      console.log('User has ownership:', hasOwnership);
      console.log('Ownership fields:', debugInfo.ownershipFields);
      
      return hasOwnership;
    } catch (error) {
      console.error('Error testing show deletion permission:', error);
      return false;
    }
  }
}
