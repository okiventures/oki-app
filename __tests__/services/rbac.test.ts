import { assertRole, canAccess, GUARDS } from '../../src/services/rbac';

describe('assertRole', () => {
  it('does not throw when role matches', () => {
    expect(() => assertRole('client', 'client')).not.toThrow();
  });

  it('throws when role does not match', () => {
    expect(() => assertRole('client', 'admin')).toThrow('Access denied: admin role required');
  });

  it('throws when userType is undefined', () => {
    expect(() => assertRole(undefined, 'client')).toThrow('Access denied: client role required');
  });

  it('throws when userType is null', () => {
    expect(() => assertRole(null, 'handyman')).toThrow('Access denied: handyman role required');
  });
});

describe('canAccess', () => {
  it('returns true when role is in allowed list', () => {
    expect(canAccess('admin', 'admin')).toBe(true);
    expect(canAccess('handyman', 'admin', 'handyman')).toBe(true);
    expect(canAccess('client', 'client', 'handyman', 'admin')).toBe(true);
  });

  it('returns false when role is not in allowed list', () => {
    expect(canAccess('client', 'admin')).toBe(false);
    expect(canAccess('handyman', 'admin', 'client')).toBe(false);
  });

  it('returns false when userType is undefined', () => {
    expect(canAccess(undefined, 'client')).toBe(false);
  });

  it('returns false when userType is null', () => {
    expect(canAccess(null, 'admin', 'handyman')).toBe(false);
  });

  it('returns false when allowed list is empty', () => {
    expect(canAccess('client')).toBe(false);
  });
});

describe('GUARDS', () => {
  it('client guard allows only client', () => {
    expect(GUARDS.client('client')).toBe(true);
    expect(GUARDS.client('admin')).toBe(false);
    expect(GUARDS.client('handyman')).toBe(false);
  });

  it('handyman guard allows only handyman', () => {
    expect(GUARDS.handyman('handyman')).toBe(true);
    expect(GUARDS.handyman('admin')).toBe(false);
    expect(GUARDS.handyman('client')).toBe(false);
  });

  it('admin guard allows only admin', () => {
    expect(GUARDS.admin('admin')).toBe(true);
    expect(GUARDS.admin('handyman')).toBe(false);
    expect(GUARDS.admin('client')).toBe(false);
  });

  it('staff guard allows admin and handyman', () => {
    expect(GUARDS.staff('admin')).toBe(true);
    expect(GUARDS.staff('handyman')).toBe(true);
    expect(GUARDS.staff('client')).toBe(false);
  });

  it('authenticated guard allows all roles', () => {
    expect(GUARDS.authenticated('client')).toBe(true);
    expect(GUARDS.authenticated('handyman')).toBe(true);
    expect(GUARDS.authenticated('admin')).toBe(true);
  });

  it('all guards reject undefined/null userType', () => {
    expect(GUARDS.client(undefined)).toBe(false);
    expect(GUARDS.client(null)).toBe(false);
    expect(GUARDS.admin(undefined)).toBe(false);
    expect(GUARDS.authenticated(undefined)).toBe(false);
  });
});
