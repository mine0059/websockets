# Sportz — Live Sports Commentary API

A real-time sports commentary backend built with Node.js, Express, and WebSockets. This project was built as a deep-dive into how bidirectional, event-driven communication works at the protocol level — from raw TCP upgrade handshakes all the way to a production-grade pub/sub broadcasting system.

---

## What This Project Does

Sportz exposes a REST API for managing sports matches and their commentary entries, while simultaneously pushing live updates to connected clients over WebSockets. When a new match is created or a commentary entry is added, every relevant subscriber receives the update instantly — no polling required.

**Core capabilities:**

- **Match management** — Create matches, list them with pagination, and auto-derive their status (`scheduled`, `live`, or `finished`) from the provided start/end times.
- **Commentary** — Post timestamped commentary entries against a match. Rich metadata is supported: minute, period, actor, team, event type, and arbitrary `jsonb` metadata.
- **Real-time broadcasts** — When a match is created, all connected clients are notified. When commentary is posted, only clients subscribed to that specific match receive it.
- **Pub/Sub over WebSocket** — Clients send `{ "type": "subscribe", "matchId": 1 }` to opt in to a match feed, and `{ "type": "unsubscribe", "matchId": 1 }` to leave. This keeps the traffic targeted rather than noisy.
- **Connection health** — A server-side heartbeat pings every client every 30 seconds and terminates stale connections that stop responding.
- **Security at the WebSocket upgrade layer** — Arcjet rate limiting is enforced at the HTTP upgrade step, before a WebSocket connection is ever accepted.

---

## Why `ws` Instead of Socket.IO

This is a deliberate choice worth explaining.

[`ws`](https://github.com/websockets/ws) is a bare-bones, spec-compliant WebSocket library. It does exactly what the WebSocket protocol defines — nothing more. Socket.IO, on the other hand, is an abstraction layer that adds its own message framing, a custom namespace/room system, reconnection logic, and a fallback to HTTP long-polling when WebSockets are unavailable. That abstraction is convenient, but it comes at a cost:

- **Socket.IO clients must use the Socket.IO client library.** A plain browser `WebSocket` or any other standard client cannot connect to a Socket.IO server.
- **The overhead is real.** Socket.IO's own protocol sits on top of WebSocket frames, adding extra bytes and complexity to every message.
- **It hides the protocol.** One of the goals of this project was to understand how WebSockets actually work — the upgrade handshake, frame construction, ping/pong, and readyState — not to delegate all of that to a library.

Using `ws` meant implementing things like pub/sub, heartbeating, and graceful cleanup by hand. That was the point. The result is a leaner server with no client-side library dependency and direct control over every aspect of the connection lifecycle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| HTTP Framework | Express 5 |
| WebSocket | `ws` v8 |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM |
| Schema Validation | Zod |
| Security | Arcjet (rate limiting & bot protection) |
| Monitoring | ManageEngine APM Insight |
| Migrations | Drizzle Kit |

---

## Project Structure

```
src/
├── config/         # Arcjet security middleware configuration
├── controllers/    # Request handlers for matches and commentary
├── db/             # Drizzle ORM client and schema definitions
├── routes/         # Express router definitions
├── seed/           # Database seed script
├── utils/          # Helper utilities (e.g. match status derivation)
├── validation/     # Zod schemas for request validation
├── ws/             # WebSocket server — pub/sub, heartbeat, broadcast logic
└── server.js       # Entry point — wires Express and WebSocket to one HTTP server
tut_server.js       # Standalone tutorial server used during initial learning
```

> **`tut_server.js`** is kept in the repository intentionally. It is the raw, minimal WebSocket server written during the learning phase — a plain broadcast server with no REST integration — and shows exactly where this project started before the architecture grew.

---

## How It Works — Architecture Overview

The WebSocket server shares the same underlying HTTP server as Express. Instead of running on a separate port, it intercepts HTTP Upgrade requests at the `server.on('upgrade', ...)` level, routes `/ws` connections to the WebSocket server, and hands everything else to Express as normal.

```
Client
  │
  ├── HTTP Request ──────────────► Express Router → Controller → DB
  │
  └── WS Upgrade (ws://…/ws) ───► WebSocket Server
                                       │
                                       ├── subscribe(matchId)
                                       ├── unsubscribe(matchId)
                                       └── receive broadcasts
```

Broadcasts are injected from the REST layer into the WebSocket layer via `app.locals`, keeping the two transports decoupled while still letting an HTTP controller trigger a real-time push.

---

## REST API Reference

### Matches

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/matches` | List matches. Accepts `?limit=` query param (max 100, default 50). |
| `POST` | `/matches` | Create a new match. |

**POST `/matches` — request body:**
```json
{
  "sport": "football",
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "startTime": "2025-06-01T15:00:00.000Z",
  "endTime": "2025-06-01T17:00:00.000Z",
  "homeScore": 0,
  "awayScore": 0
}
```

### Commentary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/matches/:id/commentary` | Fetch commentary for a match. Accepts `?limit=` query param. |
| `POST` | `/matches/:id/commentary` | Add a commentary entry to a match. |

**POST `/matches/:id/commentary` — request body:**
```json
{
  "minute": 34,
  "period": "first_half",
  "eventType": "goal",
  "actor": "Saka",
  "team": "Arsenal",
  "message": "Saka fires low into the bottom corner!",
  "metadata": { "xg": 0.73 },
  "tags": ["goal", "saka", "arsenal"]
}
```

### WebSocket

Connect to `ws://localhost:8080/ws`. Upon connection you receive:
```json
{ "type": "welcome" }
```

Subscribe to a match:
```json
{ "type": "subscribe", "matchId": 1 }
```

Unsubscribe from a match:
```json
{ "type": "unsubscribe", "matchId": 1 }
```

Incoming broadcast when a match is created:
```json
{ "type": "match_created", "data": { ...match } }
```

Incoming broadcast when commentary is posted:
```json
{ "type": "commentary", "data": { ...commentaryEntry } }
```

---

## Getting Started

### Prerequisites

- Node.js v20 or later
- A PostgreSQL database (a free [Neon](https://neon.tech) project works perfectly)

### 1. Clone the repository

```bash
git clone https://github.com/mine0059/websockets.git
cd websockets
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_neon_postgres_connection_string
HOST=0.0.0.0
PORT=8080

# Optional — only needed if you want Arcjet security enforcement
ARCJET_KEY=your_arcjet_api_key
```

### 4. Run database migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. (Optional) Seed the database

```bash
npm run seed
```

### 6. Start the development server

```bash
npm run dev
```

The server will be available at `http://localhost:8080` and the WebSocket endpoint at `ws://localhost:8080/ws`.

To start without file watching (production-like):

```bash
npm start
```

---

## Key Things Learnt

Working on this project covered a range of concepts that go significantly beyond basic REST server development:

- **The WebSocket handshake** — How a plain HTTP request upgrades to a persistent WebSocket connection via the `Upgrade` header, and what `101 Switching Protocols` actually means at the TCP level.
- **Sharing one port for HTTP and WebSocket** — Attaching a `noServer: true` WebSocket server to an existing HTTP server and manually handling the `upgrade` event, rather than letting a library spin up a second server.
- **Pub/Sub pattern from scratch** — Building a `Map<matchId, Set<WebSocket>>` subscriber store to ensure each broadcast reaches only the clients who asked for it.
- **Connection lifecycle management** — Tracking `readyState` (CONNECTING / OPEN / CLOSING / CLOSED), cleaning up subscriptions on disconnect, and terminating error-state sockets gracefully.
- **Heartbeating** — Implementing a ping/pong interval to distinguish truly idle clients from dead connections, and automatically terminating zombies.
- **Security at the transport layer** — Running Arcjet's rate-limiter and bot-detection _before_ the WebSocket connection is accepted, at the HTTP Upgrade stage, so malicious clients never gain a live socket.
- **Drizzle ORM** — Writing type-safe queries without giving up the mental model of SQL, and using `drizzle-kit` for migration management.
- **Zod validation** — Validating both request bodies and query parameters at the boundary of the application, with structured error responses that tell the caller exactly what was wrong.
- **Decoupling HTTP and WebSocket layers** — Threading broadcast functions through `app.locals` so controllers can trigger real-time pushes without importing or depending on the WebSocket server directly.

---

## License

ISC
