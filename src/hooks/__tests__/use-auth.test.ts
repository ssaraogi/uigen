import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// --- import after mocks ---

import { useAuth } from "@/hooks/use-auth";

// --- helpers ---

function noAnonWork() {
  mockGetAnonWorkData.mockReturnValue(null);
}

function anonWorkWith(messages: unknown[], fileSystemData = {}) {
  mockGetAnonWorkData.mockReturnValue({ messages, fileSystemData });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  test("isLoading starts false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("sets isLoading true while running, false after", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);
    let resolveSignIn!: (v: unknown) => void;
    mockSignInAction.mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("a@b.com", "pass"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: true }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("calls signInAction with email and password", async () => {
    noAnonWork();
    mockSignInAction.mockResolvedValue({ success: false, error: "bad" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@test.com", "secret123"); });

    expect(mockSignInAction).toHaveBeenCalledWith("user@test.com", "secret123");
  });

  test("returns the result from signInAction", async () => {
    noAnonWork();
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => { returnValue = await result.current.signIn("a@b.com", "wrong"); });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("resets isLoading to false even when signInAction throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      try { await result.current.signIn("a@b.com", "pass"); } catch {}
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when signIn fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "wrong"); });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("sets isLoading true while running, false after", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);
    let resolveSignUp!: (v: unknown) => void;
    mockSignUpAction.mockReturnValue(
      new Promise((res) => { resolveSignUp = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signUp("a@b.com", "pass"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignUp({ success: true }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("calls signUpAction with email and password", async () => {
    noAnonWork();
    mockSignUpAction.mockResolvedValue({ success: false, error: "exists" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@test.com", "mypassword"); });

    expect(mockSignUpAction).toHaveBeenCalledWith("new@test.com", "mypassword");
  });

  test("returns the result from signUpAction", async () => {
    noAnonWork();
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => { returnValue = await result.current.signUp("a@b.com", "pass"); });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  test("resets isLoading to false even when signUpAction throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      try { await result.current.signUp("a@b.com", "pass"); } catch {}
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when signUp fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "pass"); });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── post-sign-in navigation: anon work ───────────────────────────────────────

describe("post-sign-in: anon work exists", () => {
  test("creates a project with anon messages and data, then navigates to it", async () => {
    const messages = [{ role: "user", content: "hello" }];
    const fileSystemData = { "/": { type: "directory" } };
    anonWorkWith(messages, fileSystemData);
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "anon-project-1" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages, data: fileSystemData })
    );
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-1");
  });

  test("does not call getProjects when anon work is present", async () => {
    anonWorkWith([{ role: "user", content: "hi" }]);
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "p1" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("ignores anon work when messages array is empty", async () => {
    anonWorkWith([]);
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-project");
  });

  test("works the same way after signUp", async () => {
    anonWorkWith([{ role: "user", content: "hello" }]);
    mockSignUpAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "anon-project-2" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-2");
  });
});

// ─── post-sign-in navigation: no anon work ────────────────────────────────────

describe("post-sign-in: no anon work", () => {
  test("navigates to the most recent existing project", async () => {
    noAnonWork();
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "recent" }, { id: "older" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockPush).toHaveBeenCalledWith("/recent");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("creates a new project when user has no existing projects", async () => {
    noAnonWork();
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("new project name matches expected format", async () => {
    noAnonWork();
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "x" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    const [{ name }] = mockCreateProject.mock.calls[0];
    expect(name).toMatch(/^New Design #\d+$/);
  });

  test("works the same way after signUp", async () => {
    noAnonWork();
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "p99" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@b.com", "pass"); });

    expect(mockPush).toHaveBeenCalledWith("/p99");
  });
});
