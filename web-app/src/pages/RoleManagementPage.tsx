import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Shield, 
  Eye, 
  EyeOff, 
  Plus, 
  X,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { 
  JOB_ROLES, 
  PERMISSION_CATEGORIES, 
  SystemAction, 
  JobRole, 
  PermissionCategory,
  getJobRolesByHierarchy,
  validateRolePermissions,
  createCustomJobRole,
  PERMISSION_DESCRIPTIONS
} from '../core/permissions/jobRoles';
import { usePermissions } from '../hooks/usePermissions';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';

const RoleManagementPage: React.FC = () => {
  const { isGod } = usePermissions();
  const { service: firebaseService } = useFirebase();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState(JOB_ROLES);
  const [isLoading, setIsLoading] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [hoveredPermission, setHoveredPermission] = useState<SystemAction | null>(null);

  // New role creation state
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    category: 'technical' as JobRole['category'],
    permissions: [] as SystemAction[]
  });

  // Load roles from database
  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const rolesData = await firebaseService.getCollection('jobRoles');
      if (rolesData && rolesData.length > 0) {
        setRoles(rolesData as unknown as JobRole[]);
      } else {
        // If no roles in database, initialize with default roles
        await initializeDefaultRoles();
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      // Fallback to default roles
      setRoles(JOB_ROLES);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize default roles in database
  const initializeDefaultRoles = async () => {
    try {
      for (const role of JOB_ROLES) {
        await firebaseService.setDocument('jobRoles', role.id, role);
      }
      setRoles(JOB_ROLES);
    } catch (error) {
      console.error('Error initializing default roles:', error);
    }
  };

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  // Redirect if not God
  if (!isGod) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-pb-dark flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">Only God users can access role management.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredRoles = roles.filter(role => {
    const matchesCategory = filterCategory === 'all' || role.category === filterCategory;
    const matchesSearch = role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTogglePermission = async (roleId: string, action: SystemAction) => {
    const role = roles.find(r => r.id === roleId);
    if (!role || !role.isCustomizable) return;

    // Toggle the permission
    const currentPermissions = role.permissions || [];
    const newPermissions = currentPermissions.includes(action)
      ? currentPermissions.filter(p => p !== action)
      : [...currentPermissions, action];

    // Validate the new permissions
    const validation = validateRolePermissions(newPermissions);
    if (!validation.isValid) {
      alert(`Cannot toggle permission: ${validation.errors.join(', ')}`);
      return;
    }

    // Show warnings but allow to proceed
    if (validation.warnings.length > 0) {
      console.warn('Permission warnings:', validation.warnings);
    }

    try {
      setSavingRole(roleId);
      
      // Update the role with new permissions
      const updatedRole = {
        ...role,
        permissions: newPermissions,
        lastModified: new Date(),
        version: (role.version || 1) + 1
      };

      // Save to database
      await firebaseService.updateDocument('jobRoles', roleId, updatedRole);
      
      // Update local state
      setRoles(prev => prev.map(r => 
        r.id === roleId ? updatedRole : r
      ));
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save permission change');
    } finally {
      setSavingRole(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.displayName) {
      alert('Please fill in role name and display name');
      return;
    }

    const validation = validateRolePermissions(newRole.permissions);
    if (!validation.isValid) {
      alert(`Cannot create role: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setIsLoading(true);
      
      // Create the new role
      const customRole = createCustomJobRole(
        newRole.name,
        newRole.displayName,
        newRole.description,
        newRole.category,
        newRole.permissions,
        'current-user-id' // TODO: Get actual user ID
      );

      // Save to database
      await firebaseService.setDocument('jobRoles', customRole.id, customRole);
      
      // Update local state
      setRoles(prev => [...prev, customRole]);

      setShowCreateRole(false);
      setNewRole({
        name: '',
        displayName: '',
        description: '',
        category: 'technical',
        permissions: []
      });
      
      alert('Custom role created successfully!');
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create custom role');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (action: SystemAction, isNewRole: boolean = false) => {
    if (isNewRole) {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.includes(action)
          ? prev.permissions.filter(p => p !== action)
          : [...prev.permissions, action]
      }));
    }
  };

  const toggleCategoryPermissions = (category: PermissionCategory, isNewRole: boolean = false) => {
    if (isNewRole) {
      const currentPermissions = newRole.permissions;
      const hasAllCategoryPermissions = category.actions.every(action => 
        currentPermissions.includes(action)
      );

      if (hasAllCategoryPermissions) {
        // Remove all category permissions
        setNewRole(prev => ({
          ...prev,
          permissions: prev.permissions.filter(p => !category.actions.includes(p))
        }));
      } else {
        // Add all category permissions
        setNewRole(prev => ({
          ...prev,
          permissions: [...new Set([...prev.permissions, ...category.actions])]
        }));
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-pb-dark text-white">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-pb-primary" />
            <h1 className="text-3xl font-bold">Role Management</h1>
            {isLoading && <RefreshCw className="w-6 h-6 text-pb-primary animate-spin" />}
          </div>
          <p className="text-gray-400 text-lg">
            Manage job roles and their fine-grained permissions. Each role is designed to focus on specific job responsibilities.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-pb-card rounded-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-pb-input border border-pb-border rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                />
                <Users className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
              </div>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-pb-input border border-pb-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
              >
                <option value="all">All Categories</option>
                <option value="management">Management</option>
                <option value="creative">Creative</option>
                <option value="technical">Technical</option>
                <option value="support">Support</option>
                <option value="crew">Crew</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
                className="px-4 py-2 bg-pb-primary/20 hover:bg-pb-primary/30 text-pb-primary rounded-lg transition-colors border border-pb-primary/30 flex items-center gap-2"
              >
                {showPermissionMatrix ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPermissionMatrix ? 'Hide Matrix' : 'Show Matrix'}
              </button>
              
              <button
                onClick={() => setShowCreateRole(true)}
                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors border border-green-600/30 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        {showPermissionMatrix && (
          <div className="bg-pb-card rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Permission Matrix
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pb-border">
                    <th className="text-left py-2">Role</th>
                    {PERMISSION_CATEGORIES.map(category => (
                      <th key={category.id} className="text-center py-2 px-2">
                        <div className="flex flex-col items-center">
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-xs">{category.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getJobRolesByHierarchy().map(role => (
                    <tr key={role.id} className="border-b border-pb-border/50">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${role.color}`}></span>
                          <span className="font-medium">{role.displayName}</span>
                        </div>
                      </td>
                      {PERMISSION_CATEGORIES.map(category => {
                        const hasCategoryPermissions = category.actions.some(action => 
                          role.permissions.includes(action)
                        );
                        const hasAllCategoryPermissions = category.actions.every(action => 
                          role.permissions.includes(action)
                        );
                        
                        return (
                          <td key={category.id} className="text-center py-2">
                            {hasAllCategoryPermissions ? (
                              <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                            ) : hasCategoryPermissions ? (
                              <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto"></div>
                            ) : (
                              <div className="w-4 h-4 bg-gray-600 rounded-full mx-auto"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map(role => (
            <div key={role.id} className="bg-pb-darker/40 rounded-lg p-6 border border-pb-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full ${role.color}`}></span>
                  <div>
                    <h3 className="text-lg font-bold">{role.displayName}</h3>
                    <p className="text-sm text-gray-400">{role.category}</p>
                  </div>
                </div>
                
              </div>

              <p className="text-gray-300 text-sm mb-4">{role.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Permissions:</span>
                  <span className="text-pb-primary font-medium">{role.permissions?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Hierarchy:</span>
                  <span className="text-pb-primary font-medium">{role.hierarchy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Version:</span>
                  <span className="text-pb-primary font-medium">{role.version}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                className="w-full mt-4 px-4 py-2 bg-pb-primary/20 hover:bg-pb-primary/30 text-pb-primary rounded-lg transition-colors border border-pb-primary/30"
              >
                {selectedRole === role.id ? 'Hide Details' : 'View Details'}
              </button>
            </div>
          ))}
        </div>

        {/* Role Details/Edit Modal */}
        {selectedRole && (() => {
          const role = roles.find(r => r.id === selectedRole);
          if (!role) return null;
          const rolePermissions = role.permissions || [];
          const isCustomizable = role.isCustomizable;

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-pb-darker border border-pb-border rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative">
                {/* Sticky Close Button */}
                <button
                  onClick={() => setSelectedRole(null)}
                  className="absolute top-4 right-4 z-10 p-2 hover:bg-pb-primary/20 rounded-lg transition-colors bg-pb-darker/80 backdrop-blur-sm border border-pb-border"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-between mb-6 pr-10">
                  <h2 className="text-2xl font-bold">
                    {role.displayName} {isCustomizable ? 'Permissions' : 'Details'}
                  </h2>
                  {savingRole === selectedRole && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {PERMISSION_CATEGORIES.map(category => {
                    const categoryPermissions = category.actions.filter(action => 
                      rolePermissions.includes(action)
                    );
                    const hasAllCategoryPermissions = category.actions.every(action => 
                      rolePermissions.includes(action)
                    );
                    const hasSomeCategoryPermissions = category.actions.some(action => 
                      rolePermissions.includes(action)
                    );

                    return (
                      <div key={category.id} className="bg-pb-darker/30 border border-pb-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <h3 className="text-lg font-bold">{category.name}</h3>
                            <span className="text-sm text-gray-400">
                              ({categoryPermissions.length}/{category.actions.length})
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{category.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.actions.map(action => {
                            const isEnabled = rolePermissions.includes(action);
                            const description = PERMISSION_DESCRIPTIONS[action] || 'No description available.';

                            return (
                              <div
                                key={action}
                                className={`relative group flex items-center gap-2 p-2 rounded transition-colors ${
                                  isCustomizable
                                    ? 'cursor-pointer hover:bg-pb-primary/10'
                                    : ''
                                } ${
                                  isEnabled
                                    ? 'bg-green-600/20 text-green-400'
                                    : 'bg-gray-600/20 text-gray-400'
                                }`}
                                onClick={() => isCustomizable && handleTogglePermission(selectedRole, action)}
                                onMouseEnter={() => setHoveredPermission(action)}
                                onMouseLeave={() => setHoveredPermission(null)}
                              >
                                {isEnabled ? (
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-sm flex-1">
                                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                
                                {/* Tooltip */}
                                {hoveredPermission === action && (
                                  <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 text-sm bg-pb-darker border border-pb-border rounded-lg shadow-xl pointer-events-none">
                                    <div className="font-semibold mb-1 text-pb-primary">
                                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </div>
                                    <div className="text-gray-300 text-xs leading-relaxed">
                                      {description}
                                    </div>
                                    {isCustomizable && (
                                      <div className="mt-2 pt-2 border-t border-pb-border text-xs text-gray-400">
                                        Click to {isEnabled ? 'disable' : 'enable'} this permission
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create Role Modal */}
        {showCreateRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-pb-darker border border-pb-border rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative">
              {/* Sticky Close Button */}
              <button
                onClick={() => setShowCreateRole(false)}
                className="absolute top-4 right-4 z-10 p-2 hover:bg-pb-primary/20 rounded-lg transition-colors bg-pb-darker/80 backdrop-blur-sm border border-pb-border"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between mb-6 pr-10">
                <h2 className="text-2xl font-bold">Create New Role</h2>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role Name</label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-pb-input border border-pb-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                      placeholder="e.g., Senior Props Maker"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Name</label>
                    <input
                      type="text"
                      value={newRole.displayName}
                      onChange={(e) => setNewRole(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full bg-pb-input border border-pb-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                      placeholder="e.g., Senior Props Maker"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-pb-input border border-pb-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                    rows={3}
                    placeholder="Describe the role's responsibilities..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newRole.category}
                    onChange={(e) => setNewRole(prev => ({ ...prev, category: e.target.value as JobRole['category'] }))}
                    className="w-full bg-pb-input border border-pb-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                  >
                    <option value="management">Management</option>
                    <option value="creative">Creative</option>
                    <option value="technical">Technical</option>
                    <option value="support">Support</option>
                    <option value="crew">Crew</option>
                  </select>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-lg font-bold mb-4">Permissions</h3>
                  <div className="space-y-4">
                    {PERMISSION_CATEGORIES.map(category => {
                      const hasAllCategoryPermissions = category.actions.every(action => 
                        newRole.permissions.includes(action)
                      );
                      const hasSomeCategoryPermissions = category.actions.some(action => 
                        newRole.permissions.includes(action)
                      );

                      return (
                        <div key={category.id} className="bg-pb-darker/30 border border-pb-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <h4 className="text-lg font-bold">{category.name}</h4>
                            </div>
                            <button
                              onClick={() => toggleCategoryPermissions(category, true)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                hasAllCategoryPermissions
                                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                  : hasSomeCategoryPermissions
                                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                                  : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                              }`}
                            >
                              {hasAllCategoryPermissions ? 'All' : hasSomeCategoryPermissions ? 'Some' : 'None'}
                            </button>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{category.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.actions.map(action => {
                              const isEnabled = newRole.permissions.includes(action);
                              const description = PERMISSION_DESCRIPTIONS[action] || 'No description available.';

                              return (
                                <label
                                  key={action}
                                  className="relative group flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-pb-primary/10 transition-colors"
                                  onMouseEnter={() => setHoveredPermission(action)}
                                  onMouseLeave={() => setHoveredPermission(null)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => togglePermission(action, true)}
                                    className="w-4 h-4 text-pb-primary bg-pb-input border-pb-border rounded focus:ring-pb-primary"
                                  />
                                  <span className="text-sm flex-1">
                                    {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                  
                                  {/* Tooltip */}
                                  {hoveredPermission === action && (
                                    <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 text-sm bg-pb-darker border border-pb-border rounded-lg shadow-xl pointer-events-none">
                                      <div className="font-semibold mb-1 text-pb-primary">
                                        {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </div>
                                      <div className="text-gray-300 text-xs leading-relaxed">
                                        {description}
                                      </div>
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateRole}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isLoading ? 'Creating...' : 'Create Role'}
                </button>
                <button
                  onClick={() => setShowCreateRole(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoleManagementPage;
