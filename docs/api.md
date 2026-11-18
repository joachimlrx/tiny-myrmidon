# REST API Reference

The Tiny Myrmidon backend exposes a lightweight JSON REST API for cluster health monitoring and persistent leaderboard records.

**Base URL:**
* Local Ingress: `http://localhost:8080`
* Kubernetes Internal: `http://tiny-myrmidon-api:80`

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and service readiness probe | No |
| `GET` | `/api/scores` | Retrieve top hero leaderboard scores | No |
| `POST` | `/api/scores` | Record a new hero score | No |

---

## 1. Healthcheck

Checks that the Axum application is healthy and responsive. Used by Kubernetes `livenessProbe` and `readinessProbe`.

* **Method:** `GET`
* **Path:** `/api/health`
* **Response Status:** `200 OK`

### Example Request
```bash
curl -s http://localhost:8080/api/health
```

### Example Response
```json
{
  "service": "tiny-myrmidon-api",
  "status": "ok"
}
```

---

## 2. Retrieve Leaderboard

Returns the top 50 scores, sorted descending by score, with ties broken by wave reached.

* **Method:** `GET`
* **Path:** `/api/scores`
* **Response Status:** `200 OK`

### Example Request
```bash
curl -s http://localhost:8080/api/scores
```

### Example Response
```json
[
  {
    "player_name": "Hercules",
    "score": 9999,
    "wave": 15,
    "created_at": 1794854386
  },
  {
    "player_name": "Achilles",
    "score": 5000,
    "wave": 10,
    "created_at": 1794854358
  },
  {
    "player_name": "Patroclus",
    "score": 3200,
    "wave": 7,
    "created_at": 1794854358
  }
]
```

---

## 3. Submit Hero Score

Records a new score in the leaderboard.

* **Method:** `POST`
* **Path:** `/api/scores`
* **Content-Type:** `application/json`

### Request Payload

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `player_name` | String | Yes | 1 to 30 characters after trimming | Name of the hero |
| `score` | Integer | Yes | $\ge 0$ | Total points accumulated |
| `wave` | Integer | Yes | $\ge 1$ | Wave/level reached |

### Request Example
```bash
curl -i -X POST http://localhost:8080/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "player_name": "Leonidas",
    "score": 7450,
    "wave": 11
  }'
```

### Success Response (`201 Created`)
```json
{
  "player_name": "Leonidas",
  "score": 7450,
  "wave": 11,
  "created_at": 1794854900
}
```

### Error Response (`400 Bad Request`)
Returned if `player_name` is empty, contains only spaces, or exceeds 30 characters.
```text
HTTP/1.1 400 Bad Request
```


## 4. Persistence and deployment

When `SCORE_STORE_PATH` is configured, the API loads the leaderboard from a JSON file at startup and writes and synchronizes a temporary file, atomically replaces that file, and synchronizes the parent directory after each accepted score. This improves durability across process or host crashes on filesystems that honor `fsync`. The Kubernetes manifest mounts a `ReadWriteOnce` PVC at `/data` and sets the path to `/data/scores.json`.

This provides persistence across API pod restarts for the single-replica deployment. It is not a multi-replica database: keep the API at one replica while using the file store. For horizontal scaling or concurrent writers across pods, migrate the store to PostgreSQL.

The Kubernetes deployment sets `TRUSTED_PROXY_HOPS=1`. The API only trusts the rightmost client address in `X-Forwarded-For` when this value is positive; the matching NetworkPolicies restrict pod ingress to the Traefik controller in `kube-system`. Outside that deployment, the default is `0`: the API ignores forwarding headers and rate-limits by the TCP peer address supplied by the server. This prevents clients from spoofing `X-Forwarded-For` and avoids sharing one quota across all direct clients. In in-memory router tests without connection metadata, the fallback key remains `unknown`.

If the file is missing, the API starts with an empty leaderboard. If it contains invalid JSON, startup fails rather than silently discarding existing data. Back up the PVC before making storage changes.


## 5. Score integrity and limits

Score validation rejects malformed names, impossible wave values and scores above a configured plausibility bound. This is abuse filtering, not a server-authoritative anti-cheat system: the browser still reports the final score and wave, so a modified client can fabricate a plausible result.

Do not use this anonymous endpoint for a prize-bearing or competitive leaderboard. That requires authenticated run sessions and server-authoritative gameplay validation (or replay verification) before a score can be trusted.
