import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Users, 
  Settings,
  Eye,
  EyeOff,
  Play,
  RefreshCw
} from 'lucide-react';
import { 
  JOB_ROLES, 
  PERMISSION_CATEGORIES, 
  SystemAction, 
  getJobRole,
  getJobRolesByCategory,
  getJobRolesByHierarchy,
  hasJobRolePermission,
  getJobRolePermissions,
  getJobRoleDisplayInfo,
  createCustomJobRole,
  updateJobRolePermissions,
  getPermissionMatrix,
  getPermissionsByCategory,
  validateRolePermissions,
  compareRoles
} from '../core/permissions/jobRoles';
import DashboardLayout from '../PropsBibleHomepage';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const PermissionSystemTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
    // Test 1: Basic Job Role Structure
    try {
      const expectedRoles = [
        'props-supervisor', 'art-director', 'stage-manager',
        'designer', 'assistant-designer',
        'senior-propmaker', 'propmaker', 'props-carpenter', 'show-carpenter', 'painter',
        'buyer', 'set-dresser', 'assistant-stage-manager',
        'crew'
      ];

      let allRolesExist = true;
      const missingRoles: string[] = [];
      
      expectedRoles.forEach(roleId => {
        const role = getJobRole(roleId);
        if (!role) {
          allRolesExist = false;
          missingRoles.push(roleId);
        }
      });

      results.push({
        testName: 'Basic Job Role Structure',
        passed: allRolesExist,
        message: allRolesExist 
          ? `All ${expectedRoles.length} expected roles exist` 
          : `Missing roles: ${missingRoles.join(', ')}`,
        details: { expectedRoles, missingRoles }
      });
    } catch (error) {
      results.push({
        testName: 'Basic Job Role Structure',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 2: Role Properties Validation
    try {
      let allValid = true;
      const invalidRoles: string[] = [];
      
      JOB_ROLES.forEach(role => {
        const isValid = role.id && role.name && role.displayName && 
                       role.description && role.color && role.category &&
                       typeof role.hierarchy === 'number' && 
                       Array.isArray(role.permissions) &&
                       typeof role.isCustomizable === 'boolean' &&
                       typeof role.isSystemRole === 'boolean' &&
                       typeof role.version === 'number';
        
        if (!isValid) {
          allValid = false;
          invalidRoles.push(role.id);
        }
      });

      results.push({
        testName: 'Role Properties Validation',
        passed: allValid,
        message: allValid 
          ? `All ${JOB_ROLES.length} roles have valid properties` 
          : `Invalid roles: ${invalidRoles.join(', ')}`,
        details: { totalRoles: JOB_ROLES.length, invalidRoles }
      });
    } catch (error) {
      results.push({
        testName: 'Role Properties Validation',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 3: Permission Categories
    try {
      const expectedCategories = [
        'user-management', 'show-management', 'props-management',
        'shopping-procurement', 'task-management', 'system-admin'
      ];

      let allCategoriesExist = true;
      const missingCategories: string[] = [];
      
      expectedCategories.forEach(categoryId => {
        const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId);
        if (!category) {
          allCategoriesExist = false;
          missingCategories.push(categoryId);
        }
      });

      results.push({
        testName: 'Permission Categories',
        passed: allCategoriesExist,
        message: allCategoriesExist 
          ? `All ${expectedCategories.length} permission categories exist` 
          : `Missing categories: ${missingCategories.join(', ')}`,
        details: { expectedCategories, missingCategories }
      });
    } catch (error) {
      results.push({
        testName: 'Permission Categories',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 4: Role Hierarchy
    try {
      const rolesByHierarchy = getJobRolesByHierarchy();
      let hierarchyValid = true;
      
      for (let i = 0; i < rolesByHierarchy.length - 1; i++) {
        if (rolesByHierarchy[i].hierarchy < rolesByHierarchy[i + 1].hierarchy) {
          hierarchyValid = false;
          break;
        }
      }

      results.push({
        testName: 'Role Hierarchy',
        passed: hierarchyValid,
        message: hierarchyValid 
          ? `Role hierarchy is properly ordered (${rolesByHierarchy.length} roles)` 
          : 'Role hierarchy is not properly ordered',
        details: { rolesByHierarchy: rolesByHierarchy.map(r => ({ id: r.id, hierarchy: r.hierarchy })) }
      });
    } catch (error) {
      results.push({
        testName: 'Role Hierarchy',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 5: Permission Matrix
    try {
      const matrix = getPermissionMatrix();
      let matrixValid = true;
      const issues: string[] = [];
      
      JOB_ROLES.forEach(role => {
        if (!matrix[role.id]) {
          matrixValid = false;
          issues.push(`Missing matrix entry for role: ${role.id}`);
        }
      });

      Object.values(SystemAction).forEach(action => {
        JOB_ROLES.forEach(role => {
          if (typeof matrix[role.id]?.[action] !== 'boolean') {
            matrixValid = false;
            issues.push(`Invalid matrix value for ${role.id}.${action}`);
          }
        });
      });

      results.push({
        testName: 'Permission Matrix',
        passed: matrixValid,
        message: matrixValid 
          ? `Permission matrix is valid (${Object.keys(matrix).length} roles, ${Object.values(SystemAction).length} permissions)` 
          : `Matrix issues: ${issues.join(', ')}`,
        details: { matrixSize: Object.keys(matrix).length, issues }
      });
    } catch (error) {
      results.push({
        testName: 'Permission Matrix',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 6: Permission Validation
    try {
      const validPermissions = [SystemAction.VIEW_SHOWS, SystemAction.CREATE_PROPS];
      const validation = validateRolePermissions(validPermissions);
      
      results.push({
        testName: 'Permission Validation',
        passed: validation.isValid,
        message: validation.isValid 
          ? 'Permission validation works correctly' 
          : `Validation failed: ${validation.errors.join(', ')}`,
        details: { validation, testPermissions: validPermissions }
      });
    } catch (error) {
      results.push({
        testName: 'Permission Validation',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 7: Role Comparison
    try {
      const comparison = compareRoles('props-supervisor', 'crew');
      const comparisonValid = comparison.role1 && comparison.role2 && 
                             Array.isArray(comparison.commonPermissions) &&
                             Array.isArray(comparison.role1Only) &&
                             Array.isArray(comparison.role2Only);
      
      results.push({
        testName: 'Role Comparison',
        passed: comparisonValid,
        message: comparisonValid 
          ? `Role comparison works (${comparison.commonPermissions.length} common, ${comparison.role1Only.length} role1-only, ${comparison.role2Only.length} role2-only)` 
          : 'Role comparison failed',
        details: { comparison }
      });
    } catch (error) {
      results.push({
        testName: 'Role Comparison',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 8: Custom Role Creation
    try {
      const customRole = createCustomJobRole(
        'test-role',
        'Test Role',
        'A test role for validation',
        'technical',
        [SystemAction.VIEW_SHOWS, SystemAction.CREATE_PROPS],
        'test-user-id'
      );
      
      const customRoleValid = customRole.id === 'custom-test-role' &&
                             customRole.name === 'test-role' &&
                             customRole.displayName === 'Test Role' &&
                             customRole.category === 'technical' &&
                             customRole.isCustomizable === true &&
                             customRole.isSystemRole === false &&
                             customRole.version === 1;
      
      results.push({
        testName: 'Custom Role Creation',
        passed: customRoleValid,
        message: customRoleValid 
          ? 'Custom role creation works correctly' 
          : 'Custom role creation failed',
        details: { customRole }
      });
    } catch (error) {
      results.push({
        testName: 'Custom Role Creation',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 9: Edge Cases
    try {
      const edgeCaseResults = {
        undefinedRole: getJobRole('undefined-role') === undefined,
        emptyPermissions: getJobRolePermissions('non-existent-role').length === 0,
        invalidPermissionCheck: hasJobRolePermission('non-existent-role', SystemAction.VIEW_SHOWS) === false,
        nullDisplayInfo: getJobRoleDisplayInfo('non-existent-role') === null
      };
      
      const allEdgeCasesPass = Object.values(edgeCaseResults).every(result => result === true);
      
      results.push({
        testName: 'Edge Cases',
        passed: allEdgeCasesPass,
        message: allEdgeCasesPass 
          ? 'All edge cases handled correctly' 
          : 'Some edge cases failed',
        details: { edgeCaseResults }
      });
    } catch (error) {
      results.push({
        testName: 'Edge Cases',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    // Test 10: Integration Test
    try {
      const integrationResults = {
        roleCount: JOB_ROLES.length,
        categoryCount: PERMISSION_CATEGORIES.length,
        permissionCount: Object.values(SystemAction).length,
        totalRolePermissions: JOB_ROLES.reduce((sum, role) => sum + role.permissions.length, 0),
        averagePermissionsPerRole: JOB_ROLES.reduce((sum, role) => sum + role.permissions.length, 0) / JOB_ROLES.length
      };
      
      const integrationValid = integrationResults.roleCount > 0 &&
                              integrationResults.categoryCount > 0 &&
                              integrationResults.permissionCount > 0 &&
                              integrationResults.totalRolePermissions > 0;
      
      results.push({
        testName: 'Integration Test',
        passed: integrationValid,
        message: integrationValid 
          ? `Integration test passed (${integrationResults.roleCount} roles, ${integrationResults.categoryCount} categories, ${integrationResults.permissionCount} permissions)` 
          : 'Integration test failed',
        details: { integrationResults }
      });
    } catch (error) {
      results.push({
        testName: 'Integration Test',
        passed: false,
        message: `Error: ${error}`,
        details: error
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const runSingleTest = (testName: string) => {
    setSelectedTest(testName);
    setShowDetails(true);
  };

  const getTestSummary = () => {
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { passed, total, percentage };
  };

  const summary = getTestSummary();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-pb-dark text-white">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-pb-primary" />
            <h1 className="text-3xl font-bold">Permission System Test Suite</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Comprehensive tests for the fine-grained permission system. Run tests to validate functionality and catch edge cases.
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-pb-darker/40 border border-pb-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="px-6 py-3 bg-pb-primary hover:bg-pb-primary/80 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isRunning ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </button>
              
              {testResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Results:</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    summary.percentage === 100 
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : summary.percentage >= 80
                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                      : 'bg-red-600/20 text-red-400 border border-red-600/30'
                  }`}>
                    {summary.passed}/{summary.total} ({summary.percentage}%)
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded-lg transition-colors flex items-center gap-2"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="bg-pb-darker/40 border border-pb-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <h3 className="text-lg font-semibold">{result.testName}</h3>
                  </div>
                  
                  <button
                    onClick={() => runSingleTest(result.testName)}
                    className="px-3 py-1 bg-pb-primary/20 hover:bg-pb-primary/30 text-pb-primary text-sm rounded transition-colors"
                  >
                    View Details
                  </button>
                </div>
                
                <p className={`text-sm ${
                  result.passed ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.message}
                </p>

                {showDetails && selectedTest === result.testName && result.details && (
                  <div className="mt-4 p-4 bg-pb-darker border border-pb-border rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Test Details:</h4>
                    <pre className="text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* System Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-pb-darker/40 border border-pb-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold">Job Roles</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Roles:</span>
                <span className="text-white font-medium">{JOB_ROLES.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Categories:</span>
                <span className="text-white font-medium">
                  {new Set(JOB_ROLES.map(r => r.category)).size}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Customizable:</span>
                <span className="text-white font-medium">
                  {JOB_ROLES.filter(r => r.isCustomizable).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-pb-darker/40 border border-pb-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold">Permissions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Permissions:</span>
                <span className="text-white font-medium">{Object.values(SystemAction).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Categories:</span>
                <span className="text-white font-medium">{PERMISSION_CATEGORIES.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg per Role:</span>
                <span className="text-white font-medium">
                  {Math.round(JOB_ROLES.reduce((sum, role) => sum + role.permissions.length, 0) / JOB_ROLES.length)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-pb-darker/40 border border-pb-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold">System Health</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Test Status:</span>
                <span className={`font-medium ${
                  summary.percentage === 100 ? 'text-green-400' : 
                  summary.percentage >= 80 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {summary.percentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tests Passed:</span>
                <span className="text-white font-medium">{summary.passed}/{summary.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Run:</span>
                <span className="text-white font-medium">
                  {testResults.length > 0 ? 'Just now' : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-pb-darker/40 border border-pb-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.open('/admin/roles', '_blank')}
              className="p-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors border border-blue-600/30"
            >
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Role Management</div>
              <div className="text-xs text-gray-400">Edit role permissions</div>
            </button>
            
            <button
              onClick={() => window.open('/admin/users', '_blank')}
              className="p-4 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors border border-green-600/30"
            >
              <Users className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">User Management</div>
              <div className="text-xs text-gray-400">Assign job roles</div>
            </button>
            
            <button
              onClick={() => {
                const matrix = getPermissionMatrix();
                console.log('Permission Matrix:', matrix);
                alert('Permission matrix logged to console');
              }}
              className="p-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors border border-purple-600/30"
            >
              <Settings className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Export Matrix</div>
              <div className="text-xs text-gray-400">Log to console</div>
            </button>
            
            <button
              onClick={() => {
                const customRole = createCustomJobRole(
                  'test-role-' + Date.now(),
                  'Test Role ' + Date.now(),
                  'Auto-generated test role',
                  'technical',
                  [SystemAction.VIEW_SHOWS],
                  'test-user'
                );
                console.log('Created custom role:', customRole);
                alert('Custom role created and logged to console');
              }}
              className="p-4 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors border border-yellow-600/30"
            >
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Create Test Role</div>
              <div className="text-xs text-gray-400">Generate custom role</div>
            </button>
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PermissionSystemTestPage;
