# Production: Why Mails Are Not Working – Checklist

Use this checklist to fix email and API issues in production.

---

## 1. Frontend API URL (Most Common Cause)

**Problem:** The app uses `NEXT_PUBLIC_API_BASE_URL` for all API calls (login, email config, scheduled emails, etc.). If this points to `localhost` or `0.0.0.0` in production, the browser will call the wrong host and **nothing works** (including mail-related APIs).

**Check:** In production, what is `NEXT_PUBLIC_API_BASE_URL`?

- If it is `http://localhost:8000` or `http://0.0.0.0:8000` → **Wrong.** The browser will try to reach the user’s own machine, not your server.

**Fix:**

1. Set the **real production API URL** in your hosting environment (e.g. Vercel, Netlify, your server).
2. Example:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
   ```
   (Use your actual API host and scheme, e.g. `https://api.example.com`.)
3. Rebuild/redeploy the frontend so the new value is baked in (required for `NEXT_PUBLIC_*`).

**Where to set it:**

- **Vercel:** Project → Settings → Environment Variables → add `NEXT_PUBLIC_API_BASE_URL`.
- **Netlify:** Site → Build & deploy → Environment → add `NEXT_PUBLIC_API_BASE_URL`.
- **Docker/VM:** Set in `.env.production` or in the process environment before starting the app.

---

## 2. CORS on the Backend

**Problem:** Browser blocks requests if the backend does not allow your production frontend origin.

**Check:** Backend CORS config must allow the production frontend origin, e.g.:

- `https://yourdomain.com`
- `https://www.yourdomain.com`
- Or the exact URL where the app is hosted

**Fix:** In the backend, add the production frontend URL to allowed origins (and ensure credentials/headers are allowed if you send cookies/auth headers).

---

## 3. Email Is Sent by the Backend

**Problem:** The frontend only **saves email config** and **schedules** emails via the API. The actual **sending** is done by the backend (e.g. Celery worker, cron, or similar).

**Check:**

- Is the **worker/cron** that sends emails running in production?
- Is **SMTP** (or your mail provider) configured in production env (host, port, user, password, TLS)?
- Are there errors in backend logs when a send is attempted?

**Fix:** Configure SMTP (or provider) in production and ensure the job that processes scheduled emails is running and reachable (e.g. same network as API, correct queue).

---

## 4. Auth / Tokens in Production

**Problem:** If the frontend cannot login or tokens are invalid, all API calls (including email config and scheduled emails) will fail.

**Check:**

- Can users **log in** on the production frontend?
- In browser DevTools → Network: do API requests return **401** or **403**?

**Fix:** Ensure production API URL is correct (see §1), and that token refresh and cookie domain (if used) are correct for your production domain.

---

## 5. Quick Verification

1. **API URL**
   - Open production app → DevTools → Console.
   - Run: `console.log(process.env.NEXT_PUBLIC_API_BASE_URL)` (if exposed) or trigger any API call and check the request URL in the Network tab. It must be your **production API**, not `localhost` or `0.0.0.0`.

2. **Login**
   - Log in on production. If login fails, fix API URL and CORS first.

3. **Email config**
   - Save email config / schedule from the app. Check Network tab: request should go to production API and return 2xx.

4. **Backend**
   - Check backend logs when a scheduled email is due. Confirm no SMTP/CORS/auth errors.

---

## Summary

| Issue | What to do |
|-------|------------|
| API URL wrong in production | Set `NEXT_PUBLIC_API_BASE_URL` to production API URL and redeploy. |
| CORS errors in browser | Allow production frontend origin in backend CORS. |
| Emails never sent | Ensure backend worker/cron runs and SMTP is configured in production. |
| 401/403 on API calls | Fix API URL and auth (tokens, refresh, cookie domain). |

**Most common cause:** `NEXT_PUBLIC_API_BASE_URL` is still `http://localhost:8000` or `http://0.0.0.0:8000` in production. Set it to your real API URL and redeploy.
