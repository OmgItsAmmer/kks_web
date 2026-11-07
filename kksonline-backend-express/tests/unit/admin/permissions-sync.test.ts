import { describe, expect, it } from 'vitest';
import { PERMISSIONS as backend, ROLES as backendRoles, roleCan } from '../../../src/modules/admin/permissions';
import { PERMISSIONS as frontend, ROLES as frontendRoles } from '../../../../admin-frontend/src/lib/permissions';

describe('admin permissions', () => {
  it('are identical in the backend and the admin frontend', () => {
    expect(frontend).toEqual(backend);
    expect(frontendRoles).toEqual(backendRoles);
  });

  it('keep money and admin powers away from staff', () => {
    expect(roleCan('staff', 'cost.view')).toBe(false);
    expect(roleCan('staff', 'dashboard.revenue')).toBe(false);
    expect(roleCan('staff', 'orders.cancel')).toBe(false);
    expect(roleCan('staff', 'catalog.write')).toBe(false);
    expect(roleCan('staff', 'inventory.adjust')).toBe(false);
    expect(roleCan('staff', 'settings.manage')).toBe(false);
    expect(roleCan('staff', 'audit.view')).toBe(false);
  });

  it('let staff do the daily floor work', () => {
    expect(roleCan('staff', 'orders.view')).toBe(true);
    expect(roleCan('staff', 'orders.status')).toBe(true);
    expect(roleCan('staff', 'inventory.receive')).toBe(true);
  });

  it('give managers everything except owner-only areas', () => {
    expect(roleCan('manager', 'catalog.write')).toBe(true);
    expect(roleCan('manager', 'orders.cancel')).toBe(true);
    expect(roleCan('manager', 'reports.view')).toBe(true);
    expect(roleCan('manager', 'settings.manage')).toBe(false);
    expect(roleCan('manager', 'audit.view')).toBe(false);
  });

  it('give owners everything', () => {
    for (const p of Object.keys(backend)) expect(roleCan('owner', p as keyof typeof backend)).toBe(true);
  });
});
