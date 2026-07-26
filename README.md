# ms-payments

Backend API for a single-product checkout flow paid with a credit card through a
sandbox payment gateway. Built with **NestJS + TypeScript**, **PostgreSQL** and
**Prisma**, following **Hexagonal Architecture (Ports & Adapters)** and
**Railway Oriented Programming** in the use cases.

> Companion frontend: `fe-payments` (SPA).

---

## Table of contents

- [Architecture](#architecture)
- [Data model](#data-model)
- [Business flow](#business-flow)
- [API reference](#api-reference)
- [Getting started](#getting-started)
- [Testing and coverage](#testing-and-coverage)
- [Security](#security)
- [Deployment](#deployment)

---

## Architecture

Business logic never lives in the routing layer. Controllers only translate HTTP
into use-case calls and back.

```
                inbound                                    outbound
                   |                                          |
  HTTP  ──▶  ProductsController          ┌─▶ PostgresProductRepository ──▶ PostgreSQL
             TransactionsController      │   PostgresCustomerRepository
                   |                     │   PostgresTransactionRepository
                   ▼                     │   PostgresDeliveryRepository
            ┌──────────────┐             │
            │  USE CASES   │  ports ─────┤
            │    (ROP)     │             │
            └──────────────┘             └─▶ WompiPaymentGatewayAdapter ──▶ Gateway API
                   |
                   ▼
            ┌──────────────┐
            │    DOMAIN    │  entities, enums, pure services, DomainError
            └──────────────┘
```

### Folder structure

```
src/
├── domain/                              # Pure business core. No framework, no I/O.
│   ├── models/                          # Product, Customer, Transaction, Delivery
│   ├── resources/                       # Enums and commercial constants
│   ├── services/                        # CardBrandService, AmountCalculatorService
│   └── errors/                          # DomainError discriminated union
│
├── application/
│   ├── ports/                           # Outbound interfaces (repositories, gateway)
│   ├── use-cases/                       # Orchestration written as ROP pipelines
│   └── injections/                      # NestJS modules binding ports to adapters
│
├── infrastructure/
│   ├── entrypoints/rest/                # Controllers, DTOs, HTTP mapping helpers
│   └── outpoints-adapters/
│       ├── postgres/                    # Prisma repositories and row/model mappers
│       └── external-services/           # Payment gateway HTTP adapter
│
├── runner/                              # main.ts and the root module
└── utilities/                           # Cross-cutting helpers
```

### Railway Oriented Programming

Every use case returns `ResultAsync<T, DomainError>` (via
[`neverthrow`](https://github.com/supermacro/neverthrow)). A failure short-circuits
the rest of the pipeline instead of throwing, and only the REST edge
(`unwrapOrThrow`) converts a `DomainError` into an HTTP status:

| DomainErrorCode                 | HTTP |
| ------------------------------- | ---- |
| `PRODUCT_NOT_FOUND`             | 404  |
| `TRANSACTION_NOT_FOUND`         | 404  |
| `INSUFFICIENT_STOCK`            | 409  |
| `TRANSACTION_ALREADY_FINALIZED` | 409  |
| `INVALID_CARD`                  | 422  |
| `INVALID_QUANTITY`              | 422  |
| `GATEWAY_ERROR`                 | 502  |
| `PERSISTENCE_ERROR`             | 500  |

---

## Data model

```mermaid
erDiagram
    PRODUCT  ||--o{ TRANSACTION : "is purchased in"
    CUSTOMER ||--o{ TRANSACTION : places
    CUSTOMER ||--o{ DELIVERY    : receives
    TRANSACTION ||--|| DELIVERY : "is shipped through"

    PRODUCT {
        uuid     id PK
        string   name
        string   description
        int      price_in_cents
        int      stock
        string   image_url
    }

    CUSTOMER {
        uuid     id PK
        string   email UK
        string   full_name
        string   document
        enum     document_type
        string   phone_number
    }

    TRANSACTION {
        uuid     transaction_id PK
        string   reference UK
        string   payment_description
        enum     status
        datetime solicited_date
        int      quantity
        int      product_amount_in_cents
        int      base_fee_in_cents
        int      delivery_fee_in_cents
        int      amount_in_cents
        string   wompi_transaction_id
        string   status_message
        enum     card_brand
        string   card_last_four
        uuid     customer_id FK
        uuid     product_id FK
    }

    DELIVERY {
        uuid     id PK
        string   recipient_name
        string   address
        string   city
        string   region
        string   country
        string   postal_code
        string   phone_number
        enum     status
        datetime delivered_at
        uuid     transaction_id FK,UK
        uuid     customer_id FK
    }
```

### Design decisions

| Decision                                | Rationale                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Money stored as **integer cents**       | Avoids floating-point drift and matches the gateway contract (`amount_in_cents`).                       |
| `TransactionStatus` mirrors the gateway | `PENDING / APPROVED / DECLINED / VOIDED / ERROR`. No translation table needed.                          |
| Amount breakdown persisted              | Fees may change; historic transactions must stay auditable.                                             |
| `Customer` normalised by email          | Repeat buyers reuse a single record instead of duplicating identity data on every transaction.          |
| `Delivery` is 1:1 with `Transaction`    | Each purchase ships exactly once; the unique FK enforces it at database level.                          |
| Only `card_brand` + `card_last_four`    | PAN, CVC and expiry are never persisted. Raw card data exists in memory only during tokenisation.       |
| Conditional stock decrement             | `WHERE stock >= quantity` makes the update atomic, so concurrent checkouts cannot oversell.             |

### Transaction states

| State      | Meaning                                                    |
| ---------- | ---------------------------------------------------------- |
| `PENDING`  | Created locally, payment not yet resolved.                  |
| `APPROVED` | Charge accepted. Stock decremented and delivery assigned.   |
| `DECLINED` | Rejected by the issuing bank. Stock untouched.              |
| `VOIDED`   | Cancelled before settlement.                                |
| `ERROR`    | Gateway or network failure. Never leaves a stuck `PENDING`. |

---

## Business flow

1. `GET /api/products` — the SPA renders the catalogue with live stock.
2. The customer fills in card and delivery data (validated client- and server-side).
3. The summary shows product amount + base fee + delivery fee.
4. `POST /api/transactions` — persists a **PENDING** transaction, its customer and
   its delivery, and returns the transaction number.
5. `POST /api/transactions/:id/payment` — tokenises the card, signs the request,
   charges the gateway and polls until a final status. On `APPROVED` the delivery
   is assigned and stock is decremented, both inside the same use case.
6. `GET /api/transactions/:id` — lets the SPA restore the result after a refresh.

If the gateway resolves a transaction after the synchronous call has returned,
it notifies `POST /api/webhooks/payments`. Both paths converge on the same
`TransactionFulfillmentService`, so the outcome is applied exactly once.

---

## API reference

Interactive Swagger UI: **`/api/docs`** (OpenAPI JSON at `/api/docs-json`).

| Method | Endpoint                        | Description                                     |
| ------ | ------------------------------- | ----------------------------------------------- |
| GET    | `/api/health`                   | Liveness probe.                                 |
| GET    | `/api/products`                 | Catalogue with available stock.                 |
| GET    | `/api/products/:id`             | Single product.                                 |
| POST   | `/api/transactions`             | Create a PENDING transaction + customer + delivery. |
| POST   | `/api/transactions/:id/payment` | Charge the card and finalise the transaction.   |
| GET    | `/api/transactions/:id`         | Current transaction state.                      |
| POST   | `/api/webhooks/payments`        | Gateway events. Signature-verified, idempotent. |

---

## Getting started

### Prerequisites

Node.js 20+, Docker Desktop.

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env      # then fill in the gateway keys

# 3. Start PostgreSQL
docker compose up -d

# 4. Create the schema and generate the typed client
npm run prisma:migrate -- --name init
npm run prisma:generate

# 5. Seed the dummy products
npm run db:seed

# 6. Run the API
npm run start:dev         # http://localhost:3000/api/docs
```

---

## Testing and coverage

```bash
npm test          # unit tests
npm run test:cov  # coverage report (fails below 80%)
```

Jest is configured with a hard **80% threshold** on branches, functions, lines
and statements. Modules that contain no logic (NestJS modules, DTOs, ports,
enums and `main.ts`) are excluded from the metric.

<!-- Paste the output of `npm run test:cov` here before submitting. -->

```
File                        | % Stmts | % Branch | % Funcs | % Lines
----------------------------|---------|----------|---------|--------
All files                   |         |          |         |
```

---

## Security

- Secrets are read from environment variables; `.env` is git-ignored.
- The gateway **private** and **integrity** keys are server-side only and are
  never returned to the SPA.
- Card PAN, CVC and expiry date are never persisted or logged; only the brand
  and the last four digits are stored.
- `helmet` sets the OWASP security headers; CORS is restricted through
  `CORS_ORIGINS`.
- `ValidationPipe` runs with `whitelist` and `forbidNonWhitelisted`, so unknown
  properties are rejected instead of silently accepted.
- Integrity signature: `SHA-256(reference + amount_in_cents + currency + secret)`.
- Webhook events are rejected unless their checksum matches
  `SHA-256(signed_properties + timestamp + events_secret)`, compared in constant
  time. Events for unknown or already finalized transactions are acknowledged
  without side effects, so replaying them changes nothing.

---

## Deployment

<!-- Add the public URL once deployed. -->

| Component | Provider | URL |
| --------- | -------- | --- |
| API       |          |     |
| SPA       |          |     |
| Database  |          |     |
