'use client';

import { createContext, useContext } from 'react';
import type { Role, Permission } from './permissions';

interface PermissionsContextValue {
  userRole: Role;
  permissions: readonly string[];
  can: (permission: Permission) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  children,
  userRole,
  permissions,
}: {
  children: React.ReactNode;
  userRole: Role;
  permissions: readonly string[];
}) {
  const can = (permission: Permission) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  return (
    <PermissionsContext.Provider value={{ userRole, permissions, can }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}

/**
 * Convenience component for conditional rendering based on permissions
 * @example
 * <Can permission={P.CREATE_QR_POOL}>
 *   <Button>Tạo mã QR mới</Button>
 * </Can>
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
