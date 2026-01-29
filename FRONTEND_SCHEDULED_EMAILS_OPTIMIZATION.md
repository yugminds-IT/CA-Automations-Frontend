# Frontend: Scheduled Emails Fetching – Optimizations

This doc describes what was done on the frontend to reduce duplicate and per-client polling, and what the backend could add to reduce requests further.

---

## What Was Done on the Frontend

### 1. Avoid per-client polling / refetch on unrelated changes

- **Before:** When `historyStatusFilter` or `clients.length` changed, we called both `fetchEmailHistory()` and `fetchScheduledMails()`. So changing the history filter triggered a full scheduled-mails refetch (N requests).
- **After:**  
  - **History:** Only `fetchEmailHistory()` runs when `historyStatusFilter` or `clients.length` changes.  
  - **Scheduled:** `fetchScheduledMails()` runs only when `clients.length` is set (once when we have clients) and then on a 60s poll. It does **not** run when the user only changes the history filter.

### 2. Poll less often

- **Before:** Scheduled mails were polled every **30 seconds**.
- **After:** Polling interval is **60 seconds** (one batch of requests per minute).

### 3. Fetch once per view

- **Scheduled tab:** Scheduled mails are fetched once when the view has clients, then only on the 60s interval. They are not refetched on every re-render or when switching to the History tab / changing history filter.
- **History:** History is fetched when the user has clients and when the history filter (or client list) changes, not on a timer.

### 4. Dedupe / no concurrent overlap

- A ref (`isFetchingScheduledRef`) guards `fetchScheduledMails()`: if a fetch is already in flight, we do not start another one. This avoids duplicate overlapping requests (e.g. from Strict Mode or fast tab switches).

### 5. Single batch per “logical” fetch (parallel, not sequential)

- **Before:** For each of N clients we did `await getScheduledEmails(client.id, ...)` in a loop → N **sequential** requests per fetch.
- **After:** We use `Promise.all(clients.map(client => getScheduledEmails(client.id, ...)))` so we still do N requests per fetch, but **in parallel** (one batch). Same for `fetchEmailHistory()`: one parallel batch instead of N sequential calls.
- **Result:** One “logical” fetch = one batch of N parallel requests, and we only trigger that batch once per view + every 60s for scheduled (and when filter/client list changes for history).

### 6. Cleanup on unmount

- The scheduled-mails effect clears the 60s interval and sets `isMounted = false` so we don’t call `setState` after unmount. The in-flight guard prevents starting a new fetch when the component is unmounting.

---

## What the Backend Could Add (Optional)

Today the API is per-client: `GET /api/v1/client/{client_id}/scheduled-emails`. So for N clients we still do N requests per batch (even though they are now parallel and less frequent).

If the backend adds a **single** endpoint that returns scheduled emails for many clients in one call, the frontend could switch to one request per fetch instead of N. For example:

- **Example:** `GET /api/v1/scheduled-emails?client_ids=1,2,3&status=pending`  
  (or an org-scoped endpoint like “pending scheduled emails for current org”.)

Then the frontend would:

- Call this endpoint **once** when the view has clients and when the 60s poll fires (and for history, once when filter/client list changes).
- No per-client loop; one request per “fetch” instead of N.

Until such an endpoint exists, the frontend keeps using the current per-client endpoints in one parallel batch per fetch, with the behavior above (fetch once per view, 60s poll, no refetch on history filter, dedupe, cleanup).

---

## Summary

| Area | Before | After |
|------|--------|--------|
| When scheduled mails refetch | On history filter change + clients load + every 30s | Only when we have clients (once) + every **60s** |
| When history refetches | On history filter + clients load | Same (no change) |
| Scheduled requests per “fetch” | N sequential | N **parallel** (one batch) |
| Duplicate/concurrent fetches | Possible | Guarded with ref |
| Unmount | Interval could keep firing | Interval cleared, no setState after unmount |

Overall: **fewer refetches**, **no refetch of scheduled mails on history filter change**, **one batch in parallel per fetch**, **poll every 60s**, and **dedupe + cleanup** to avoid duplicate or runaway requests.
