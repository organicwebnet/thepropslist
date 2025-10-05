import { UserRole, UserProfile } from '../types/auth';
import { DataViewConfig, DataViewResult, CachedDataView } from '../types/dataViews';
import { getRoleDataView, isFieldVisibleForRole, getPriorityFieldsForRole } from '../utils/roleBasedDataViews';

/**
 * Simple in-memory cache for data view configurations
 */
class DataViewCache {
  private cache = new Map<string, CachedDataView>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, config: DataViewConfig, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      config,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): DataViewConfig | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.config;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Service for managing role-based data views with caching
 */
export class DataViewService {
  private static instance: DataViewService;
  private cache = new DataViewCache();

  private constructor() {}

  static getInstance(): DataViewService {
    if (!DataViewService.instance) {
      DataViewService.instance = new DataViewService();
    }
    return DataViewService.instance;
  }

  /**
   * Get the effective data view configuration for a user
   */
  async getEffectiveDataView(user: UserProfile, showId?: string): Promise<DataViewResult> {
    try {
      const role = user.role || UserRole.VIEWER;
      const cacheKey = this.getCacheKey(user.id, showId, role);

      // Check cache first
      const cachedConfig = this.cache.get(cacheKey);
      if (cachedConfig) {
        return {
          config: cachedConfig,
          role,
          isCustom: false,
          source: 'cached',
        };
      }

      // Get role-based configuration
      const roleView = getRoleDataView(role);
      const config = roleView.config;

      // Cache the result
      this.cache.set(cacheKey, config);

      return {
        config,
        role,
        isCustom: false,
        source: 'default',
      };
    } catch (error) {
      console.error('Error getting effective data view:', error);
      // Fallback to viewer role
      const fallbackView = getRoleDataView(UserRole.VIEWER);
      return {
        config: fallbackView.config,
        role: UserRole.VIEWER,
        isCustom: false,
        source: 'computed',
      };
    }
  }

  /**
   * Check if a field should be visible for a user
   */
  isFieldVisible(fieldName: string, user: UserProfile): boolean {
    try {
      const role = user.role || UserRole.VIEWER;
      return isFieldVisibleForRole(fieldName, role);
    } catch (error) {
      console.error('Error checking field visibility:', error);
      return false;
    }
  }

  /**
   * Get priority fields for a user
   */
  getPriorityFields(user: UserProfile): string[] {
    try {
      const role = user.role || UserRole.VIEWER;
      return getPriorityFieldsForRole(role);
    } catch (error) {
      console.error('Error getting priority fields:', error);
      return [];
    }
  }

  /**
   * Filter prop data based on user's role
   */
  filterPropData<T extends Record<string, any>>(propData: T, user: UserProfile): Partial<T> {
    try {
      const filteredData: Partial<T> = {};
      
      for (const [key, value] of Object.entries(propData)) {
        if (this.isFieldVisible(key, user)) {
          filteredData[key as keyof T] = value;
        }
      }

      return filteredData;
    } catch (error) {
      console.error('Error filtering prop data:', error);
      return propData; // Return original data on error
    }
  }

  /**
   * Get quick actions for a user
   */
  getQuickActions(user: UserProfile): string[] {
    try {
      const role = user.role || UserRole.VIEWER;
      const roleView = getRoleDataView(role);
      return roleView.config.quickActions;
    } catch (error) {
      console.error('Error getting quick actions:', error);
      return [];
    }
  }

  /**
   * Clear cache (useful for testing or when user permissions change)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    };
  }

  /**
   * Generate cache key for user/show/role combination
   */
  private getCacheKey(userId: string, showId: string | undefined, role: UserRole): string {
    return `dataview:${userId}:${showId || 'global'}:${role}`;
  }
}

// Export singleton instance
export const dataViewService = DataViewService.getInstance();
