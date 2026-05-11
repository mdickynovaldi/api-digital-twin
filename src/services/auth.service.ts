import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { UserRole, type User } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';
import { AppError } from '@/src/middleware';
import type { ApiRole, LoginInput, RegisterInput } from '@/src/schemas/auth.schema';

const PASSWORD_HASH_ALGORITHM = 'pbkdf2_sha256';
const PASSWORD_HASH_ITERATIONS = 210_000;
const PASSWORD_HASH_KEY_LENGTH = 32;
const DEFAULT_SESSION_TTL_HOURS = 168;

export type AuthenticatedUser = {
  id: string;
  username: string;
  display_name: string;
  role: ApiRole;
};

const roleByApi: Record<ApiRole, UserRole> = {
  operator: UserRole.OPERATOR,
  maintenance: UserRole.MAINTENANCE,
};

const apiRoleByPrisma: Record<UserRole, ApiRole> = {
  [UserRole.OPERATOR]: 'operator',
  [UserRole.MAINTENANCE]: 'maintenance',
};

function getSessionTtlHours(): number {
  const configured = Number.parseInt(process.env.AUTH_SESSION_TTL_HOURS || '', 10);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_TTL_HOURS;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(
    password,
    salt,
    PASSWORD_HASH_ITERATIONS,
    PASSWORD_HASH_KEY_LENGTH,
    'sha256'
  ).toString('hex');

  return [
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_HASH_ITERATIONS,
    salt,
    hash,
  ].join('$');
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, iterationsRaw, salt, expectedHash] = storedHash.split('$');
  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    !iterationsRaw ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const actual = pbkdf2Sync(
    password,
    salt,
    iterations,
    Buffer.from(expectedHash, 'hex').length,
    'sha256'
  );
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function transformUser(user: Pick<User, 'id' | 'username' | 'displayName' | 'role'>): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    role: apiRoleByPrisma[user.role],
  };
}

function getBearerToken(authorizationHeader?: string): string {
  const [type, token] = (authorizationHeader || '').split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) {
    throw new AppError('Bearer token is required', 401, 'UNAUTHORIZED');
  }
  return token;
}

async function createSession(userId: string): Promise<{
  token: string;
  expires_at: string;
}> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + getSessionTtlHours() * 60 * 60 * 1000
  );

  await prisma.authSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  return {
    token,
    expires_at: expiresAt.toISOString(),
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<{
    user: AuthenticatedUser;
    token: string;
    expires_at: string;
  }> {
    const username = input.username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new AppError('Username already exists', 409, 'USERNAME_EXISTS');
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(input.password),
        displayName: input.display_name?.trim() || username,
        role: roleByApi[input.role],
      },
    });
    const session = await createSession(user.id);

    return {
      user: transformUser(user),
      ...session,
    };
  },

  async login(input: LoginInput): Promise<{
    user: AuthenticatedUser;
    token: string;
    expires_at: string;
  }> {
    const username = input.username.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }

    const session = await createSession(user.id);
    return {
      user: transformUser(user),
      ...session,
    };
  },

  async authenticate(authorizationHeader?: string): Promise<AuthenticatedUser> {
    const token = getBearerToken(authorizationHeader);
    const tokenHash = hashToken(token);
    const session = await prisma.authSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) {
        await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return transformUser(session.user);
  },

  async logout(authorizationHeader?: string): Promise<{ revoked: boolean }> {
    const token = getBearerToken(authorizationHeader);
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
    return { revoked: true };
  },
};

export function toApiRole(role: UserRole): ApiRole {
  return apiRoleByPrisma[role];
}

export function toPrismaRole(role: ApiRole): UserRole {
  return roleByApi[role];
}
