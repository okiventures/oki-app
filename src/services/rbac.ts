import { UserType } from '../types';

export class RoleAccessError extends Error {
  constructor(required: UserType) {
    super(`Access denied: ${required} role required`);
    this.name = 'RoleAccessError';
  }
}

export function assertRole(userType: UserType | undefined | null, required: UserType): void {
  if (userType !== required) {
    throw new RoleAccessError(required);
  }
}

export function canAccess(userType: UserType | undefined | null, ...allowed: UserType[]): boolean {
  if (!userType) return false;
  return allowed.includes(userType);
}

export const GUARDS = {
  client: (ut: UserType | undefined | null) => canAccess(ut, 'client'),
  handyman: (ut: UserType | undefined | null) => canAccess(ut, 'handyman'),
  admin: (ut: UserType | undefined | null) => canAccess(ut, 'admin'),
  staff: (ut: UserType | undefined | null) => canAccess(ut, 'admin', 'handyman'),
  authenticated: (ut: UserType | undefined | null) => canAccess(ut, 'client', 'handyman', 'admin'),
} as const;
