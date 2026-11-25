import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiRequest,
  clearTokens,
  getUserData,
  isTokenExpired,
  setTokenExpiration,
  setTokens,
  setUserData,
} from "./client";
import { API_CONFIG } from "./config";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("returns parsed JSON and builds the URL from the base URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(apiRequest("/health")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_CONFIG.baseUrl}/health`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends a JSON body with a content type on POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, {}));

    await apiRequest("/contact", { method: "POST", body: { a: 1 } });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("adds the bearer token only when auth is required", async () => {
    setTokens("access-1", "refresh-1");
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiRequest("/auth/me", { requiresAuth: true });
    await apiRequest("/public");

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access-1");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("joins Nest validation messages into a readable error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: ["email must be an email", "message should not be empty"] }),
    );

    const err = (await apiRequest("/contact", { method: "POST", body: {} }).catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.detail).toBe("email must be an email, message should not be empty");
  });

  it("prefers `detail` over `message` in an error body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Invalid credentials", message: "x" }));

    await expect(apiRequest("/auth/login")).rejects.toMatchObject({
      status: 401,
      detail: "Invalid credentials",
    });
  });

  it("turns a failed fetch into a status-0 network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiRequest("/health")).rejects.toMatchObject({
      status: 0,
      detail: "Unable to reach the server. Reload the page.",
    });
  });
});

describe("token and user storage", () => {
  it("treats a missing or past expiry as expired", () => {
    expect(isTokenExpired()).toBe(true);
    setTokenExpiration(60);
    expect(isTokenExpired()).toBe(false);
    setTokenExpiration(-1);
    expect(isTokenExpired()).toBe(true);
  });

  it("clearTokens removes tokens, user and organization data", () => {
    setTokens("a", "r");
    setUserData({ id: 1 });
    localStorage.setItem("organization_data", "{}");
    setTokenExpiration(60);

    clearTokens();

    expect(localStorage.length).toBe(0);
    expect(getUserData()).toBeNull();
  });

  it("returns null for corrupted user data instead of throwing", () => {
    localStorage.setItem("user_data", "{not json");
    expect(getUserData()).toBeNull();
  });
});
