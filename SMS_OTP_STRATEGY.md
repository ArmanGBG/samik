# Samik — SMS & OTP Implementation Strategy

> **Phase 5 — Deployment Prep & SMS Discovery**
> Prepared for the Senior Architect's review before Arta Payamak integration.

---

## 1. Current State (Dev)

### OTP (Login Verification)

| Aspect | Current Implementation |
|---|---|
| **Storage** | In-memory `Map` pinned to `globalThis.__samikOtpStore` (survives HMR) |
| **TTL** | 2 minutes per code |
| **Max attempts** | 5 per code (then burned) |
| **Rate limit** | Max 3 OTP requests per phone per 5-minute window (prevents SMS bombing) |
| **Code format** | 6-digit numeric (Math.random) |
| **Dev convenience** | OTP code returned in the API response (`devCode` field) so the architect can log in without a real SMS |
| **File** | `src/lib/auth/otp.ts` |

### SMS (Absence Notifications)

| Aspect | Current Implementation |
|---|---|
| **Provider** | `SimulatedSmsProvider` — logs to console, 500ms delay, always succeeds |
| **Trigger** | Teacher commits roll-call → `POST /api/v1/attendance/sessions` → auto-generates `NotificationOutbox` drafts (status: DRAFT) for each ABSENT student |
| **Approval** | Deputy reviews drafts in `/deputy/notifications` UI → can edit text or discard |
| **Bulk send** | `POST /api/v1/notifications/outbox/send-bulk` → returns **202 Accepted immediately** → background job sends each SMS |
| **Real-time** | SSE event `notification:sent` pushed to deputy dashboard after each SMS |
| **File** | `src/lib/sms/provider.ts` + `src/app/api/v1/notifications/outbox/send-bulk/route.ts` |

---

## 2. Production Strategy (Liara + Arta Payamak)

### 2A. OTP Storage → Redis (CRITICAL for multi-instance)

**Problem:** The current in-memory `Map` works for a single Node.js process. On Liara, if the app scales to multiple instances (or restarts during a deploy), the OTP store is lost — users mid-login would fail.

**Solution:** Replace the in-memory `Map` with Redis (Liara offers a managed Redis service).

```typescript
// Future: src/lib/auth/otp-redis.ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function issueOtp(phone: string) {
  // Rate limit check via Redis sorted set
  const key = `otp:rl:${phone}`;
  const now = Date.now();
  await redis.zremrangebyscore(key, 0, now - 5 * 60 * 1000);
  const count = await redis.zcard(key);
  if (count >= 3) throw new OtpRateLimitError(/* ... */);
  await redis.zadd(key, now, now.toString());
  await redis.expire(key, 300); // 5 min TTL

  // Store the OTP with 2-minute TTL
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${phone}`, code, "EX", 120); // 120s TTL
  return { code, expiresInMs: 120_000 };
}

export async function verifyOtp(phone: string, code: string) {
  const stored = await redis.get(`otp:${phone}`);
  if (!stored) throw new OtpNotFoundError();
  if (stored !== code) throw new OtpInvalidError();
  await redis.del(`otp:${phone}`); // consume
  return true;
}
```

**Migration path:** The `otp.ts` module exports the same interface (`issueOtp`, `verifyOtp`). We swap the internal implementation from `Map` to Redis. Zero changes to the API routes.

**Liara env var:** `REDIS_URL=redis://:<password>@redis-xxx.liara.cloud:6379`

### 2B. SMS Gateway → Arta Payamak

**Already done!** The `src/lib/sms/provider.ts` file includes a complete `ArtaPayamakSmsProvider` class. The `getSmsProvider()` factory automatically selects it when `ARTA_PAYAMAK_API_KEY` is set.

**To activate on Liara:**
1. Set these env vars in the Liara dashboard:
   ```
   ARTA_PAYAMAK_API_URL=https://api.artapayamak.com/api/v1/sms/send
   ARTA_PAYAMAK_API_KEY=<your-api-key>
   ARTA_PAYAMAK_SENDER_NUMBER=<your-sender-line>
   ```
2. Redeploy. The `getSmsProvider()` factory will log `[sms] Using ArtaPayamakSmsProvider (production gateway)` on startup.
3. No code changes needed.

**ArtaPayamakSmsProvider features:**
- 10s timeout per request (SMS gateways can be slow)
- Automatic retry (2 attempts) on 5xx/network errors with exponential backoff (500ms → 1000ms)
- No retry on 4xx (invalid number, bad API key) — these are permanent failures
- Returns normalized `SmsSendResult { success, messageId?, error? }` regardless of provider
- On failure, the `NotificationOutbox` record is marked `FAILED` (deputy can retry later)

### 2C. Idempotency Store → Redis (CRITICAL for multi-instance)

Same problem as OTP: the in-memory `Map` in `src/lib/idempotency/store.ts` is per-process. On multi-instance Liara deployments, a duplicate request might hit a different instance and bypass the cache.

**Solution:** Replace the `Map` with Redis:

```typescript
// Future: src/lib/idempotency/redis-store.ts
export async function withIdempotency<T>(key, work) {
  // Try to SET NX (only if not exists) with the key
  const acquired = await redis.set(`idem:${key}`, "PENDING", "EX", 3600, "NX");
  if (!acquired) {
    // Key exists — return cached response
    const cached = await redis.get(`idem:resp:${key}`);
    return cached ? JSON.parse(cached) : work(); // fallback if cache expired
  }
  const result = await work();
  await redis.set(`idem:resp:${key}`, JSON.stringify(result), "EX", 3600);
  return result;
}
```

### 2D. SSE → Redis Pub/Sub (for multi-instance fanout)

**Problem:** The current `EventEmitter` is per-process. If a teacher's request hits Instance A and the deputy's SSE is connected to Instance B, the event won't reach the deputy.

**Solution:** Replace the local `EventEmitter` with Redis Pub/Sub:

```typescript
// Future: src/lib/realtime/redis-event-bus.ts
// emit: redis.publish(`samik:event:${schoolId}`, JSON.stringify(event))
// subscribe: redis.subscribe(`samik:event:${schoolId}`, handler)
```

Each instance subscribes to the schoolId channels its connected SSE clients care about. When any instance publishes, all instances receive it and forward to their local SSE connections.

---

## 3. Arta Payamak API Contract (to verify with their docs)

Based on common Iranian SMS gateway patterns. **Verify against Arta Payamak's latest API documentation before going live.**

### Request

```
POST {ARTA_PAYAMAK_API_URL}
Content-Type: application/json

{
  "ApiKey": "your-api-key",
  "Sender": "3000xxxx",        // sender line number
  "Receiver": "09123456789",   // recipient mobile
  "Message": "ولی محترم، ..."  // UTF-8 Persian text
}
```

### Response (success)

```json
{
  "Code": 200,
  "MessageId": "12345678",
  "Status": "Sent"
}
```

### Response (failure)

```json
{
  "Code": 400,
  "Message": "Invalid receiver number"
}
```

### Notes

- **Encoding:** Persian text is UTF-8. The `fetch()` body is automatically UTF-8 encoded.
- **Message length:** Iranian SMS gateways typically support up to 70 Persian characters per SMS segment. Messages longer than 70 chars are split and billed as multiple SMS. Our draft messages are ~80-100 chars, so they'll be 2 segments.
- **Sender number:** Must be a line you own (verified via Arta Payamak panel). Shared lines are cheaper but less reliable.
- **Balance:** Each SMS deducts from your Arta Payamak balance. The `School.smsBalance` field in our schema can be synced via their API (future enhancement).

---

## 4. Deployment Checklist (Liara)

### Pre-deploy

- [ ] Create a Liara Postgres service → copy the connection string to `DATABASE_URL`
- [ ] (Recommended) Create a Liara Redis service → copy URL to `REDIS_URL`
- [ ] Get Arta Payamak API credentials → set `ARTA_PAYAMAK_API_KEY`, `ARTA_PAYAMAK_SENDER_NUMBER`, `ARTA_PAYAMAK_API_URL`
- [ ] Generate a JWT secret: `openssl rand -hex 32` → set `JWT_SECRET`
- [ ] Set `SAMIK_SUPER_ADMIN_PHONES` to the initial admin phone(s)
- [ ] Set `NODE_ENV=production`

### Deploy

- [ ] Push code to git → Liara auto-builds via `bun run build`
- [ ] `liara.json` is already configured (platform: next, port: 3000)
- [ ] After first deploy: run the DB migration:
  ```
  bun run db:push:prod
  ```
  (This uses `prisma/schema.prisma` with `provider = "postgresql"`)

### Post-deploy smoke test

- [ ] Visit the landing page → should render
- [ ] Login as SuperAdmin → onboard a test school
- [ ] Login as the school's Principal → set `termStartDate`
- [ ] Login as a Teacher → commit roll-call → verify drafts appear in deputy's outbox
- [ ] Login as Deputy → send bulk SMS → verify 202 + background completion
- [ ] Login as Parent → verify dashboard shows the absence + grades chart

---

## 5. Remaining Work Before Production

| Priority | Task | Effort |
|---|---|---|
| 🔴 Critical | Replace in-memory OTP store with Redis (`src/lib/auth/otp.ts`) | 2h |
| 🔴 Critical | Replace in-memory Idempotency store with Redis (`src/lib/idempotency/store.ts`) | 1h |
| 🔴 Critical | Replace local EventEmitter with Redis Pub/Sub (`src/lib/realtime/event-bus.ts`) | 3h |
| 🟡 Important | Verify Arta Payamak API contract against their latest docs | 1h |
| 🟡 Important | Add `ioredis` to dependencies | 5min |
| 🟡 Important | Add request body size limit + helmet for security headers | 1h |
| 🟢 Nice-to-have | Sync `School.smsBalance` with Arta Payamak balance API | 2h |
| 🟢 Nice-to-have | Add structured logging (pino) for production debugging | 2h |
| 🟢 Nice-to-have | Add health check endpoint (`/api/health`) for Liara load balancer | 30min |

---

## 6. File Inventory

| File | Purpose | Phase 5 Status |
|---|---|---|
| `src/lib/auth/otp.ts` | OTP issue + verify (in-memory) | ⚠️ Needs Redis migration |
| `src/lib/idempotency/store.ts` | Idempotency key cache (in-memory) | ⚠️ Needs Redis migration |
| `src/lib/realtime/event-bus.ts` | SSE event emitter (local) | ⚠️ Needs Redis Pub/Sub migration |
| `src/lib/sms/provider.ts` | SMS provider abstraction (simulated + Arta Payamak) | ✅ Ready — auto-switches on env var |
| `src/app/api/v1/notifications/outbox/send-bulk/route.ts` | 202 Accepted + background job | ✅ Ready — uses `getSmsProvider()` |
| `prisma/schema.prisma` | PostgreSQL (production) | ✅ Updated |
| `prisma/schema.dev.prisma` | SQLite (local dev) | ✅ Created |
| `.env.example` | Production env var template | ✅ Created |
| `liara.json` | Liara PaaS config | ✅ Created |
| `next.config.ts` | `output: "standalone"` | ✅ Verified |
