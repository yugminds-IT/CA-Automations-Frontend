import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const refreshToken = vi.fn();
const logout = vi.fn();

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiRequest: (...args: unknown[]) => apiRequest(...args) };
});
vi.mock("./auth", () => ({ refreshToken: () => refreshToken(), logout: () => logout() }));

import { ApiError, setTokens } from "./client";
import { apiRequestWithRefresh } from "./interceptor";

const replace = vi.fn();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  apiRequest.mockReset();
  refreshToken.mockReset();
  logout.mockReset();
  replace.mockReset();
  Object.defineProperty(window, "location", { value: { replace }, writable: true });
});

describe("apiRequestWithRefresh", () => {
  it("refreshes once on 401 and retries the request", async () => {
    setTokens("old", "refresh");
    apiRequest.mockRejectedValueOnce(new ApiError(401, "expired")).mockResolvedValueOnce({ ok: 1 });
    refreshToken.mockResolvedValue({ accessToken: "new" });

    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).resolves.toEqual({ ok: 1 });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it("logs out and redirects when the retry is also 401", async () => {
    setTokens("old", "refresh");
    apiRequest.mockRejectedValue(new ApiError(401, "expired"));
    refreshToken.mockResolvedValue({ accessToken: "new" });

    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).rejects.toMatchObject({ status: 401 });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects to login without calling the API when there are no tokens", async () => {
    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).rejects.toMatchObject({ status: 401 });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("does not refresh or log out on an ordinary 403", async () => {
    setTokens("a", "r");
    apiRequest.mockRejectedValue(new ApiError(403, "Cannot access this organization"));

    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).rejects.toMatchObject({ status: 403 });
    expect(refreshToken).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("logs out on a subscription 403 and remembers the reason", async () => {
    setTokens("a", "r");
    apiRequest.mockRejectedValue(new ApiError(403, "Your trial has ended"));

    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).rejects.toMatchObject({ status: 403 });
    expect(sessionStorage.getItem("auth_blocked_reason")).toBe("Your trial has ended");
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("announces network failures for the offline banner", async () => {
    setTokens("a", "r");
    apiRequest.mockRejectedValue(new ApiError(0, "Unable to reach the server."));
    const listener = vi.fn();
    window.addEventListener("api-network-error", listener);

    await expect(apiRequestWithRefresh("/clients", { requiresAuth: true })).rejects.toMatchObject({ status: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("api-network-error", listener);
  });
});
