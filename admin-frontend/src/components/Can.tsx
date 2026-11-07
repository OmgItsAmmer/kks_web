import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';

/** Shows its children only when the signed-in role has the permission. The API enforces it too. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}
