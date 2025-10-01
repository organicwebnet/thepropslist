import type { Show } from '../types/Show';

/**
 * Determines if a show needs attention (has minimal information)
 * A show needs attention when it has basic required info but is missing key details
 * that would make the app more useful for the user.
 * 
 * @param show - The show object to check
 * @returns true if the show needs attention, false otherwise
 */
export const showNeedsAttention = (show: Show): boolean => {
  const hasBasicInfo = show.name && show.description && show.startDate && show.endDate;
  
  // Check for meaningful production info (not just empty strings)
  const hasProductionInfo = (show.productionCompany && show.productionCompany.trim() !== '') || 
                           (show.stageManager && show.stageManager.trim() !== '') || 
                           (show.propsSupervisor && show.propsSupervisor.trim() !== '');
  
  // Check for venues
  const hasVenues = show.venueIds && show.venueIds.length > 0;
  
  // Check for meaningful acts (not just empty name)
  const hasActs = show.acts && show.acts.length > 0 && show.acts.some(act => 
    typeof act === 'object' && act.name && act.name.trim() !== ''
  );
  
  // Check for meaningful team members (not just empty role)
  const hasTeam = show.team && show.team.length > 0 && show.team.some(member => 
    member.role && member.role.trim() !== ''
  );
  
  // Check for collaborators
  const hasCollaborators = show.collaborators && show.collaborators.length > 0;
  
  // Show needs attention if it only has basic required info but is missing key details
  return hasBasicInfo && !(hasProductionInfo || hasVenues || hasActs || hasTeam || hasCollaborators);
};

/**
 * Gets a human-readable description of what details a show is missing
 * 
 * @param show - The show object to analyze
 * @returns Array of missing detail descriptions
 */
export const getMissingShowDetails = (show: Show): string[] => {
  const missing: string[] = [];
  
  if (!show.productionCompany?.trim() && !show.stageManager?.trim() && !show.propsSupervisor?.trim()) {
    missing.push('production information');
  }
  
  if (!show.venueIds || show.venueIds.length === 0) {
    missing.push('venues');
  }
  
  if (!show.acts || show.acts.length === 0 || !show.acts.some(act => 
    typeof act === 'object' && act.name && act.name.trim() !== ''
  )) {
    missing.push('acts and scenes');
  }
  
  if (!show.team || show.team.length === 0 || !show.team.some(member => 
    member.role && member.role.trim() !== ''
  )) {
    missing.push('team members');
  }
  
  if (!show.collaborators || show.collaborators.length === 0) {
    missing.push('collaborators');
  }
  
  return missing;
};
