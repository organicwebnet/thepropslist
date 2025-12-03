/**
 * User Management Page
 * 
 * Global user dashboard for god users only to manage:
 * - All users in the system
 * - User roles and permissions
 * - User profiles and settings
 * - System-wide user statistics
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Crown, 
  Search, 
  Activity
} from 'lucide-react';
import { SystemRole } from '../core/permissions';
import { usePermissions } from '../hooks/usePermissions';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import DashboardLayout from '../PropsBibleHomepage';
import { 
  getJobRoleDisplayInfo,
  getJobRolesByCategory 
} from '../core/permissions/jobRoles';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: SystemRole | 'user' | 'admin' | 'viewer' | 'god' | 'editor' | 'props_supervisor' | 'art_director';
  jobRole?: string; // Job role ID from JOB_ROLES
  groups?: { [key: string]: boolean };
  createdAt: Date;
  lastLogin: Date;
  organizations?: string[];
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  onboardingCompleted?: boolean;
}

const ROLE_OPTIONS: { value: SystemRole; label: string; description: string; color: string }[] = [
  { 
    value: SystemRole.ADMIN, 
    label: 'Administrator', 
    description: 'Administrative access, can manage shows and users',
    color: 'bg-purple-500'
  },
  { 
    value: SystemRole.PROPS_SUPERVISOR, 
    label: 'Props Supervisor', 
    description: 'Can manage props and shows',
    color: 'bg-blue-500'
  },
  { 
    value: SystemRole.EDITOR, 
    label: 'Editor', 
    description: 'Can edit content within assigned shows',
    color: 'bg-green-500'
  },
  { 
    value: SystemRole.VIEWER, 
    label: 'Viewer', 
    description: 'Read-only access',
    color: 'bg-gray-500'
  },
  { 
    value: SystemRole.PROPS_CARPENTER, 
    label: 'Props Carpenter', 
    description: 'Specialized role for props creation',
    color: 'bg-yellow-500'
  }
];

const UserManagementPage: React.FC = () => {
  const { userProfile } = useWebAuth();
  const { service: firebaseService } = useFirebase();
  const { isGod } = usePermissions();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<SystemRole>(SystemRole.VIEWER);
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    godUsers: 0,
    adminUsers: 0,
    propsSupervisors: 0,
    editors: 0,
    viewers: 0
  });

  // Check if current user is god
  if (!isGod()) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-pb-gray/90">Only god users can access the user management dashboard.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await firebaseService.getDocuments('userProfiles');
      
      const usersList: UserProfile[] = usersSnapshot.map(doc => ({
        uid: doc.id,
        email: doc.data.email || '',
        displayName: doc.data.displayName || doc.data.email || 'Unknown',
        role: doc.data.role || 'user',
        groups: doc.data.groups || {},
        createdAt: doc.data.createdAt?.toDate() || new Date(),
        lastLogin: doc.data.lastLogin?.toDate() || new Date(),
        organizations: doc.data.organizations || [],
        subscriptionPlan: doc.data.subscriptionPlan || 'free',
        subscriptionStatus: doc.data.subscriptionStatus || 'unknown',
        onboardingCompleted: doc.data.onboardingCompleted || false
      }));

      setUsers(usersList);

      // Calculate stats
      const stats = {
        totalUsers: usersList.length,
        activeUsers: usersList.filter(u => u.lastLogin > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        godUsers: usersList.filter(u => u.role === SystemRole.GOD).length,
        adminUsers: usersList.filter(u => u.role === SystemRole.ADMIN).length,
        propsSupervisors: usersList.filter(u => u.role === SystemRole.PROPS_SUPERVISOR).length,
        editors: usersList.filter(u => u.role === SystemRole.EDITOR).length,
        viewers: usersList.filter(u => u.role === SystemRole.VIEWER).length
      };
      setStats(stats);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userUid: string, newRole: SystemRole) => {
    // Prevent changing God role
    const targetUser = users.find(u => u.uid === userUid);
    if (targetUser?.role === SystemRole.GOD) {
      alert('Cannot change God role - it is immutable');
      return;
    }

    // Prevent assigning God role
    if (newRole === SystemRole.GOD) {
      alert('Cannot assign God role - it can only be set manually in the database');
      return;
    }

    try {
      await firebaseService.updateDocument('userProfiles', userUid, {
        role: newRole
      });

      setUsers(prev => prev.map(user => 
        user.uid === userUid ? { ...user, role: newRole } : user
      ));

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userUid: string) => {
    // Prevent deleting God user
    const targetUser = users.find(u => u.uid === userUid);
    if (targetUser?.role === SystemRole.GOD) {
      alert('Cannot delete God user - it is protected');
      return;
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await firebaseService.deleteDocument('userProfiles', userUid);
      setUsers(prev => prev.filter(user => user.uid !== userUid));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
            <p className="text-pb-gray/90">Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">User Management</h1>
          </div>
          <p className="text-pb-gray/90">Manage all users, roles, and permissions across the system</p>
        </div>

        {/* Role Management Info */}
        <div className="bg-pb-primary/10 border border-pb-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-pb-primary" />
            <h2 className="text-lg font-semibold text-white">System Role Management</h2>
          </div>
          <p className="text-pb-gray/90 text-base mb-3">
            Click "Change Role" next to any user's role to modify their system permissions. Role changes take effect immediately. 
            <span className="text-red-400 font-medium">Note: God role is immutable and cannot be changed.</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* God Role - Special Display */}
            <div className="p-2 rounded text-sm bg-red-500/20 border border-red-500/30">
              <div className="font-medium text-red-400">
                God (Immutable)
              </div>
              <div className="text-pb-gray/85 text-sm mt-1">
                System administrator - cannot be changed
              </div>
            </div>
            {/* Other Roles */}
            {ROLE_OPTIONS.map(option => (
              <div key={option.value} className={`p-2 rounded text-sm ${option.color}/20 border ${option.color}/30`}>
                <div className={`font-medium ${option.color.replace('bg-', 'text-')}`}>
                  {option.label}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {option.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Role Management Info */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Job Role Management</h2>
          </div>
          <p className="text-pb-gray/90 text-base mb-3">
            Job roles define specific responsibilities and fine-grained permissions for each user. 
            <span className="text-green-400 font-medium">Click any role below to edit its permissions.</span>
          </p>
          <div className="mb-4">
            <button
              onClick={() => window.open('/admin/roles', '_blank')}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors border border-green-600/30 flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Open Role Management Page
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {getJobRolesByCategory('management').map(role => (
              <div 
                key={role.id} 
                className={`p-2 rounded text-sm ${role.color}/20 border ${role.color}/30 cursor-pointer hover:${role.color}/30 transition-colors group`}
                onClick={() => window.open('/admin/roles', '_blank')}
                title="Click to edit role permissions"
              >
                <div className={`font-medium ${role.color.replace('bg-', 'text-')} group-hover:underline`}>
                  {role.displayName}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {role.permissions.length} permissions
                </div>
                <div className="text-pb-gray/75 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit →
                </div>
              </div>
            ))}
            {getJobRolesByCategory('creative').map(role => (
              <div 
                key={role.id} 
                className={`p-2 rounded text-sm ${role.color}/20 border ${role.color}/30 cursor-pointer hover:${role.color}/30 transition-colors group`}
                onClick={() => window.open('/admin/roles', '_blank')}
                title="Click to edit role permissions"
              >
                <div className={`font-medium ${role.color.replace('bg-', 'text-')} group-hover:underline`}>
                  {role.displayName}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {role.permissions.length} permissions
                </div>
                <div className="text-pb-gray/75 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit →
                </div>
              </div>
            ))}
            {getJobRolesByCategory('technical').map(role => (
              <div 
                key={role.id} 
                className={`p-2 rounded text-sm ${role.color}/20 border ${role.color}/30 cursor-pointer hover:${role.color}/30 transition-colors group`}
                onClick={() => window.open('/admin/roles', '_blank')}
                title="Click to edit role permissions"
              >
                <div className={`font-medium ${role.color.replace('bg-', 'text-')} group-hover:underline`}>
                  {role.displayName}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {role.permissions.length} permissions
                </div>
                <div className="text-pb-gray/75 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit →
                </div>
              </div>
            ))}
            {getJobRolesByCategory('support').map(role => (
              <div 
                key={role.id} 
                className={`p-2 rounded text-sm ${role.color}/20 border ${role.color}/30 cursor-pointer hover:${role.color}/30 transition-colors group`}
                onClick={() => window.open('/admin/roles', '_blank')}
                title="Click to edit role permissions"
              >
                <div className={`font-medium ${role.color.replace('bg-', 'text-')} group-hover:underline`}>
                  {role.displayName}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {role.permissions.length} permissions
                </div>
                <div className="text-pb-gray/75 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit →
                </div>
              </div>
            ))}
            {getJobRolesByCategory('crew').map(role => (
              <div 
                key={role.id} 
                className={`p-2 rounded text-sm ${role.color}/20 border ${role.color}/30 cursor-pointer hover:${role.color}/30 transition-colors group`}
                onClick={() => window.open('/admin/roles', '_blank')}
                title="Click to edit role permissions"
              >
                <div className={`font-medium ${role.color.replace('bg-', 'text-')} group-hover:underline`}>
                  {role.displayName}
                </div>
                <div className="text-pb-gray/85 text-sm mt-1">
                  {role.permissions.length} permissions
                </div>
                <div className="text-pb-gray/75 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit →
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-pb-gray/90 text-base">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
                <p className="text-pb-gray/90 text-base">Active (30 days)</p>
              </div>
            </div>
          </div>
          <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.godUsers}</p>
                <p className="text-pb-gray/90 text-base">God Users</p>
              </div>
            </div>
          </div>
          <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.adminUsers}</p>
                <p className="text-pb-gray/90 text-base">Administrators</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pb-gray/75 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-pb-darker/60 border border-white/10 rounded-lg text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-pb-darker/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-pb-darker/40 rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pb-darker/60">
                <tr>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">User</th>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">System Role</th>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">Job Role</th>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">Status</th>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">Last Login</th>
                  <th className="px-6 py-4 text-left text-pb-gray/90 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-t border-white/10 hover:bg-pb-darker/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === SystemRole.GOD ? 'bg-red-500' :
                          user.role === SystemRole.ADMIN ? 'bg-purple-500' :
                          user.role === SystemRole.PROPS_SUPERVISOR ? 'bg-blue-500' :
                          user.role === SystemRole.EDITOR ? 'bg-green-500' :
                          user.role === SystemRole.PROPS_CARPENTER ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}>
                          {user.role === SystemRole.GOD ? <Crown className="w-5 h-5" /> :
                           user.role === SystemRole.ADMIN ? <Shield className="w-5 h-5" /> :
                           <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.displayName}</div>
                          <div className="text-pb-gray/90 text-base">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {editingUser === user.uid ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value as SystemRole)}
                              className="px-3 py-1 bg-pb-darker/60 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                            >
                              {ROLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRoleChange(user.uid, newRole)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                              title="Save role change"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded text-xs font-medium ${
                              user.role === SystemRole.GOD ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              user.role === SystemRole.ADMIN ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              user.role === SystemRole.PROPS_SUPERVISOR ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              user.role === SystemRole.EDITOR ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              user.role === SystemRole.PROPS_CARPENTER ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {user.role === SystemRole.GOD ? 'God (Immutable)' :
                               user.role === SystemRole.ADMIN ? 'Administrator' :
                               user.role === SystemRole.PROPS_SUPERVISOR ? 'Props Supervisor' :
                               user.role === SystemRole.EDITOR ? 'Editor' :
                               user.role === SystemRole.PROPS_CARPENTER ? 'Props Carpenter' :
                               'Viewer'}
                            </span>
                            {user.role !== SystemRole.GOD && (
                              <button
                                onClick={() => {
                                  setEditingUser(user.uid);
                                  setNewRole(user.role as SystemRole);
                                }}
                                className="px-2 py-1 bg-pb-primary/20 hover:bg-pb-primary/30 text-pb-primary text-xs rounded transition-colors border border-pb-primary/30"
                                title="Change role"
                              >
                                Change Role
                              </button>
                            )}
                            {user.role === SystemRole.GOD && (
                              <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded border border-gray-600/30">
                                Cannot Change
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.jobRole ? (
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            getJobRoleDisplayInfo(user.jobRole)?.color || 'bg-gray-500'
                          }/20 ${
                            getJobRoleDisplayInfo(user.jobRole)?.color?.replace('bg-', 'text-') || 'text-gray-400'
                          } border ${
                            getJobRoleDisplayInfo(user.jobRole)?.color || 'bg-gray-500'
                          }/30`}>
                            {getJobRoleDisplayInfo(user.jobRole)?.displayName || user.jobRole}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            No Job Role
                          </span>
                        )}
                        <button
                          onClick={() => {
                            // TODO: Implement job role assignment
                            console.log('Assign job role for user:', user.uid);
                          }}
                          className="px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded transition-colors border border-green-600/30"
                          title="Assign job role"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          user.subscriptionStatus === 'active' ? 'bg-green-500' :
                          user.subscriptionStatus === 'exempt' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-pb-gray/90 text-base">
                          {user.subscriptionStatus === 'active' ? 'Active' :
                           user.subscriptionStatus === 'exempt' ? 'Exempt' :
                           'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-pb-gray/90 text-base">
                      {user.lastLogin.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUserDetails(showUserDetails === user.uid ? null : user.uid)}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs rounded transition-colors border border-blue-600/30"
                          title="View user details"
                        >
                          {showUserDetails === user.uid ? 'Hide Details' : 'View Details'}
                        </button>
                        {user.uid !== userProfile?.uid && user.role !== SystemRole.GOD && (
                          <button
                            onClick={() => handleDeleteUser(user.uid)}
                            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded transition-colors border border-red-600/30"
                            title="Delete user"
                          >
                            Delete User
                          </button>
                        )}
                        {user.role === SystemRole.GOD && (
                          <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded border border-gray-600/30">
                            Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-pb-gray/75 mx-auto mb-4" />
            <p className="text-pb-gray/90 text-lg">No users found</p>
            <p className="text-pb-gray/75 text-base">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserManagementPage;
