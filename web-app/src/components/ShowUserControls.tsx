/**
 * Show User Controls Component
 * 
 * Allows god/admin users to manage team members within a specific show:
 * - View all team members and their roles
 * - Add/remove team members
 * - Change team member roles
 * - Set permissions for team members
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Edit, 
  Save, 
  X,
  Crown,
  UserCheck
} from 'lucide-react';
import { SystemRole } from '../core/permissions';
import { usePermissions } from '../hooks/usePermissions';
import { useFirebase } from '../contexts/FirebaseContext';

interface ShowUserControlsProps {
  showId: string;
  showOwnerId: string;
  showTeam: any; // Accept any type to handle both formats
  onTeamUpdate: (updatedTeam: Record<string, SystemRole>) => void;
}

interface TeamMember {
  uid: string;
  email: string;
  displayName: string;
  role: SystemRole;
  isOwner: boolean;
}

const ROLE_OPTIONS: { value: SystemRole; label: string; description: string; color: string }[] = [
  { 
    value: SystemRole.EDITOR, 
    label: 'Editor', 
    description: 'Can edit props, boards, and show content',
    color: 'bg-blue-500'
  },
  { 
    value: SystemRole.PROPS_SUPERVISOR, 
    label: 'Props Supervisor', 
    description: 'Can manage props and team members',
    color: 'bg-purple-500'
  },
  { 
    value: SystemRole.VIEWER, 
    label: 'Viewer', 
    description: 'Read-only access to show content',
    color: 'bg-gray-500'
  },
  { 
    value: SystemRole.PROPS_CARPENTER, 
    label: 'Props Carpenter', 
    description: 'Can create and edit props',
    color: 'bg-green-500'
  }
];

export const ShowUserControls: React.FC<ShowUserControlsProps> = ({
  showId,
  showOwnerId,
  showTeam,
  onTeamUpdate
}) => {
  const { service: firebaseService } = useFirebase();
  const { 
    isGod, 
    canManageShowTeam
  } = usePermissions();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<SystemRole>(SystemRole.VIEWER);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<SystemRole>(SystemRole.VIEWER);

  // Convert team format to Record<string, SystemRole>
  const normalizeTeam = (team: Record<string, SystemRole> | { uid: string; role: 'editor' | 'viewer' }[]): Record<string, SystemRole> => {
    if (Array.isArray(team)) {
      return team.reduce((acc, member) => {
        acc[member.uid] = member.role as SystemRole;
        return acc;
      }, {} as Record<string, SystemRole>);
    }
    return team;
  };

  const normalizedTeam = normalizeTeam(showTeam);

  // Check if current user can manage this show's team
  const canManage = isGod() || canManageShowTeam(showOwnerId, normalizedTeam);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    const loadTeamMembers = async () => {
      try {
        const memberPromises = Object.entries(normalizedTeam).map(async ([uid, role]) => {
          try {
            const userDoc = await firebaseService.getDocument('userProfiles', uid);
            if (userDoc?.data) {
              return {
                uid,
                email: userDoc.data.email || '',
                displayName: userDoc.data.displayName || userDoc.data.email || 'Unknown',
                role,
                isOwner: uid === showOwnerId
              };
            }
          } catch (error) {
            console.error(`Error loading user ${uid}:`, error);
          }
          return null;
        });

        const members = (await Promise.all(memberPromises)).filter(Boolean) as TeamMember[];
        setTeamMembers(members);
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, [showId, normalizedTeam, showOwnerId, canManage, firebaseService]);

  const handleRoleChange = async (memberUid: string, newRole: SystemRole) => {
    try {
      const updatedTeam = { ...normalizedTeam, [memberUid]: newRole };
      
      // Update in Firestore
      await firebaseService.updateDocument('shows', showId, {
        team: updatedTeam
      });

      // Update local state
      setTeamMembers(prev => prev.map(member => 
        member.uid === memberUid ? { ...member, role: newRole } : member
      ));

      // Notify parent component
      onTeamUpdate(updatedTeam);
      setEditingMember(null);
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const updatedTeam = { ...normalizedTeam };
      delete updatedTeam[memberUid];
      
      // Update in Firestore
      await firebaseService.updateDocument('shows', showId, {
        team: updatedTeam
      });

      // Update local state
      setTeamMembers(prev => prev.filter(member => member.uid !== memberUid));

      // Notify parent component
      onTeamUpdate(updatedTeam);
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      // Find user by email
      const usersSnapshot = await firebaseService.getDocuments('userProfiles', {
        where: [['email', '==', newMemberEmail.trim()]]
      });

      if (usersSnapshot.length === 0) {
        alert('User not found with that email address');
        return;
      }

      const user = usersSnapshot[0];
      const updatedTeam = { ...normalizedTeam, [user.id]: newMemberRole };
      
      // Update in Firestore
      await firebaseService.updateDocument('shows', showId, {
        team: updatedTeam
      });

      // Add to local state
      const newMember: TeamMember = {
        uid: user.id,
        email: user.data.email,
        displayName: user.data.displayName || user.data.email,
        role: newMemberRole,
        isOwner: false
      };

      setTeamMembers(prev => [...prev, newMember]);

      // Notify parent component
      onTeamUpdate(updatedTeam);

      // Reset form
      setNewMemberEmail('');
      setNewMemberRole(SystemRole.VIEWER);
      setShowAddMember(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member');
    }
  };

  if (!canManage) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 bg-pb-darker/20 rounded-lg border border-pb-primary/20">
        <div className="flex items-center gap-2 text-pb-gray/70">
          <Users className="w-5 h-5" />
          <span>Loading team members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pb-primary" />
          <h3 className="text-lg font-semibold text-pb-primary">Team Management</h3>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-3 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-primary/80 transition-colors text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddMember && (
        <div className="p-4 bg-pb-darker/20 rounded-lg border border-pb-primary/20">
          <h4 className="text-white font-medium mb-3">Add Team Member</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-pb-gray/70 mb-1">Email Address</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-pb-darker/40 border border-white/10 rounded-lg text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-pb-gray/70 mb-1">Role</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as SystemRole)}
                className="w-full px-3 py-2 bg-pb-darker/40 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              >
                {ROLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMember}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                Add Member
              </button>
              <button
                onClick={() => setShowAddMember(false)}
                className="flex items-center gap-2 px-4 py-2 bg-pb-gray/20 text-pb-gray hover:bg-pb-gray/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div
            key={member.uid}
            className="flex items-center justify-between p-3 bg-pb-darker/40 rounded-lg border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                member.isOwner ? 'bg-yellow-500' : 
                member.role === SystemRole.PROPS_SUPERVISOR ? 'bg-purple-500' :
                member.role === SystemRole.EDITOR ? 'bg-blue-500' :
                member.role === SystemRole.PROPS_CARPENTER ? 'bg-green-500' :
                'bg-gray-500'
              }`}>
                {member.isOwner ? <Crown className="w-4 h-4" /> : 
                 member.role === SystemRole.PROPS_SUPERVISOR ? <Shield className="w-4 h-4" /> :
                 <Users className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-white font-medium">{member.displayName}</div>
                <div className="text-pb-gray/70 text-sm">{member.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingMember === member.uid ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as SystemRole)}
                    className="px-2 py-1 bg-pb-darker/40 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-pb-primary/50"
                  >
                    {ROLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRoleChange(member.uid, newRole)}
                    className="p-1 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="p-1 text-pb-gray/70 hover:text-pb-gray transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    member.isOwner ? 'bg-yellow-500/20 text-yellow-400' :
                    member.role === SystemRole.PROPS_SUPERVISOR ? 'bg-purple-500/20 text-purple-400' :
                    member.role === SystemRole.EDITOR ? 'bg-blue-500/20 text-blue-400' :
                    member.role === SystemRole.PROPS_CARPENTER ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {member.isOwner ? 'Owner' : 
                     member.role === SystemRole.PROPS_SUPERVISOR ? 'Props Supervisor' :
                     member.role === SystemRole.EDITOR ? 'Editor' :
                     member.role === SystemRole.PROPS_CARPENTER ? 'Props Carpenter' :
                     'Viewer'}
                  </span>
                  {!member.isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMember(member.uid);
                          setNewRole(member.role);
                        }}
                        className="p-1 text-pb-primary hover:text-pb-primary/80 transition-colors"
                        title="Edit role"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.uid)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {teamMembers.length === 0 && (
          <div className="text-center py-8 text-pb-gray/70">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No team members yet</p>
            <p className="text-sm">Add team members to collaborate on this show</p>
          </div>
        )}
      </div>
    </div>
  );
};
