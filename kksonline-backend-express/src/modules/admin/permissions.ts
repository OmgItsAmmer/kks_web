/**
 * Who may do what (plan 5.2). The admin frontend keeps an identical copy in
 * `admin-frontend/src/lib/permissions.ts`; a test (tests/unit/admin/permissions-sync.test.ts)
 * fails if the two drift apart.
 */
export const ROLES = ['owner', 'manager', 'staff'] as const;
export type AdminRole = (typeof ROLES)[number];

const ALL: AdminRole[] = ['owner', 'manager', 'staff'];
const OM: AdminRole[] = ['owner', 'manager'];
const OWNER: AdminRole[] = ['owner'];

export const PERMISSIONS = {
  'dashboard.view': ALL,
  'dashboard.revenue': OM,
  'cost.view': OM,
  'orders.view': ALL,
  'orders.status': ALL,
  'orders.cancel': OM,
  'orders.payment': OM,
  'catalog.view': ALL,
  'catalog.write': OM,
  'inventory.view': ALL,
  'inventory.receive': ALL,
  'inventory.adjust': OM,
  'customers.view': ALL,
  'reviews.view': ALL,
  'reviews.moderate': OM,
  'reports.view': OM,
  'ai.use': OM,
  'settings.manage': OWNER,
  'usage.view': OWNER,
  'audit.view': OWNER,
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const roleCan = (role: AdminRole, permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
