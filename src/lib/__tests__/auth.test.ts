// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockGet,
      set: mockSet,
      delete: mockDelete,
    })
  ),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function makeToken(overrides: Record<string, unknown> = {}, expSeconds = 60 * 60) {
  return new SignJWT({ userId: "user-1", email: "test@example.com", ...overrides })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

function makeRequest(cookieValue?: string): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    headers: cookieValue ? { cookie: `${COOKIE_NAME}=${cookieValue}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets cookie with correct name, httpOnly, sameSite, and path", async () => {
    await createSession("user-1", "test@example.com");
    expect(mockSet).toHaveBeenCalledOnce();
    const [name, , options] = mockSet.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();
    const [, , { expires }] = mockSet.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("token encodes userId and email", async () => {
    await createSession("user-42", "hello@example.com");
    const [, token] = mockSet.mock.calls[0];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });
});

describe("getSession", () => {
  test("returns null when cookie is absent", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    mockGet.mockReturnValue({ value: await makeToken() });
    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for a malformed token", async () => {
    mockGet.mockReturnValue({ value: "not-a-jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredToken = await makeToken({}, -10);
    mockGet.mockReturnValue({ value: expiredToken });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

describe("verifySession", () => {
  test("returns null when request has no cookie", async () => {
    expect(await verifySession(makeRequest())).toBeNull();
  });

  test("returns session payload for a valid token in request", async () => {
    const session = await verifySession(makeRequest(await makeToken()));
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for a malformed token in request", async () => {
    expect(await verifySession(makeRequest("bad-token"))).toBeNull();
  });

  test("returns null for an expired token in request", async () => {
    const expiredToken = await makeToken({}, -10);
    expect(await verifySession(makeRequest(expiredToken))).toBeNull();
  });
});
