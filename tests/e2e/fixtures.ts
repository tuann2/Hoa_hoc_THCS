import { test as base, expect, type Page } from '@playwright/test';

export type { Page };

export interface MockSupabaseUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

export interface MockSupabaseRequest {
  method: string;
  url: string;
  body: unknown;
}

export interface MockSupabaseOptions {
  users?: MockSupabaseUser[];
  progress?: Record<string, unknown>;
}

export interface MockSupabaseState {
  requests: MockSupabaseRequest[];
  progress: Record<string, unknown>;
}

const defaultUsers: MockSupabaseUser[] = [
  {
    id: 'user-alice',
    email: 'alice@example.com',
    password: 'alice-password',
    displayName: 'Alice'
  },
  {
    id: 'user-bob',
    email: 'bob@example.com',
    password: 'bob-password',
    displayName: 'Bob'
  }
];

function sessionFor(user: MockSupabaseUser) {
  return {
    access_token: `access-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      user_metadata: { display_name: user.displayName },
      app_metadata: { provider: 'email', providers: ['email'] }
    }
  };
}

function jsonBody(value: unknown): unknown {
  try {
    return JSON.parse(value as string);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function installSupabaseMock(
  page: Page,
  options: MockSupabaseOptions = {}
): Promise<MockSupabaseState> {
  const users = options.users ?? defaultUsers;
  const usersById = new Map(users.map((user) => [user.id, user]));
  const usersByEmail = new Map(users.map((user) => [user.email, user]));
  const state: MockSupabaseState = {
    requests: [],
    progress: { ...(options.progress ?? {}) }
  };
  let activeUserId: string | null = null;

  await page.route('https://example.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = jsonBody(request.postData() ?? '');

    state.requests.push({ method: request.method(), url: request.url(), body });

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const respond = async (value: unknown, status = 200) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(value)
      });
    };

    if (url.pathname === '/auth/v1/token' && request.method() === 'POST') {
      const user = usersByEmail.get(
        isRecord(body) && typeof body.email === 'string' ? body.email : ''
      );
      const password =
        isRecord(body) && typeof body.password === 'string'
          ? body.password
          : '';

      if (!user || password !== user.password) {
        await respond(
          {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials'
          },
          400
        );
        return;
      }

      activeUserId = user.id;
      await respond(sessionFor(user));
      return;
    }

    if (url.pathname === '/auth/v1/user' && request.method() === 'GET') {
      const user = activeUserId ? usersById.get(activeUserId) : undefined;
      await respond(
        user ? sessionFor(user).user : { error: 'not_authenticated' },
        user ? 200 : 401
      );
      return;
    }

    if (url.pathname === '/auth/v1/logout' && request.method() === 'POST') {
      activeUserId = null;
      await respond({});
      return;
    }

    if (url.pathname === '/rest/v1/profiles' && request.method() === 'GET') {
      const userId = url.searchParams.get('id')?.replace(/^eq\./, '') ?? '';
      const user = usersById.get(userId);
      await respond(user ? { display_name: user.displayName } : null);
      return;
    }

    if (url.pathname === '/rest/v1/progress') {
      const userId =
        url.searchParams.get('user_id')?.replace(/^eq\./, '') ??
        (isRecord(body) && typeof body.user_id === 'string'
          ? body.user_id
          : '');

      if (request.method() === 'GET') {
        const remote = state.progress[userId];
        await respond(
          remote
            ? {
                data: remote,
                version: 4,
                updated_at: '2026-07-17T00:00:00.000Z'
              }
            : null
        );
        return;
      }

      if (request.method() === 'POST' || request.method() === 'PATCH') {
        if (isRecord(body) && 'data' in body) {
          state.progress[userId] = body.data;
        }
        await respond({});
        return;
      }
    }

    await respond(request.method() === 'GET' ? [] : {});
  });

  return state;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const marker = '__hhthcs_e2e_storage_initialized__';

      if (window.name === marker) {
        return;
      }

      window.localStorage.clear();
      window.sessionStorage.clear();
      window.name = marker;
    });
    await installSupabaseMock(page);
    await use(page);
  }
});

export { expect };
