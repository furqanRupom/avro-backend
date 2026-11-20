# Avro Backend — E-Commerce REST API

Clean, maintainable, and modular NestJS backend monolith for **Avro**, a small e-commerce shop powered by MongoDB, Mongoose, Passport JWT, and Cash on Delivery (COD).

---

## 1. Tech Stack

- **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
- **Database:** [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Authentication & Security:** Passport JWT, HTTP-only signed cookies, `bcrypt` password hashing
- **Validation:** `class-validator`, `class-transformer`
- **Documentation:** OpenAPI / Swagger UI at `/api/docs`

---

## 2. Project Structure

```text
avro-backend/
├── src/
│   ├── app.controller.ts            # Health check endpoint (/api/v1/health)
│   ├── app.module.ts                # Root application module
│   ├── app.service.ts
│   ├── auth/                        # User registration, login, JWT cookies, profile & roles
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── guards/
│   │   ├── schemas/
│   │   ├── strategies/
│   │   └── types/
│   ├── category/                    # Categories management (Admin CRUD + Public browsing)
│   │   ├── category.controller.ts
│   │   ├── category.module.ts
│   │   ├── category.repository.ts
│   │   ├── category.service.ts
│   │   ├── dto/
│   │   └── schemas/
│   ├── common/                      # Reusable filters, interceptors, and decorators
│   │   ├── decorators/              # @CurrentUser(), @Roles()
│   │   ├── filters/                 # Global HttpExceptionFilter
│   │   ├── interceptors/            # TransformResponseInterceptor
│   │   ├── interfaces/              # ApiResponse<T>
│   │   └── utils/                   # slugify()
│   ├── config/                      # Environment variables validation schema
│   │   └── env.validation.ts
│   ├── dashboard/                   # Admin metrics & store performance overview
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.repository.ts
│   │   └── dashboard.service.ts
│   ├── order/                       # Cash on Delivery order processing, inventory & status
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── order.controller.ts
│   │   ├── order.module.ts
│   │   ├── order.repository.ts
│   │   ├── order.service.ts
│   │   └── schemas/
│   ├── product/                     # Product catalog, stock management, filters & search
│   │   ├── dto/
│   │   ├── product.controller.ts
│   │   ├── product.module.ts
│   │   ├── product.repository.ts
│   │   ├── product.service.ts
│   │   └── schemas/
│   ├── seeders/                     # Idempotent seeders for Admin, Categories & Products
│   │   ├── admin.seed.ts
│   │   ├── category.seed.ts
│   │   ├── product.seed.ts
│   │   └── seed.ts
│   └── main.ts                      # Application bootstrap, Swagger, Pipes, Interceptors
├── docker-compose.yml               # Local MongoDB 7.0 container
├── .env.example
├── .env
├── package.json
└── tsconfig.json
```

---

## 3. Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (`npm install -g pnpm`)
- Docker (optional, for local MongoDB)

### Setup & Run

1. **Navigate to backend:**
   ```bash
   cd avro-backend
   ```

2. **Start MongoDB (via Docker):**
   ```bash
   docker compose up -d
   ```
   *(Or point `MONGODB_URI` in `.env` to your existing MongoDB connection string).*

3. **Install Dependencies:**
   ```bash
   pnpm install
   ```

4. **Seed Database:**
   Pre-populates an Admin user, sample Categories, and Products:
   ```bash
   pnpm seed
   ```

5. **Start Development Server:**
   ```bash
   pnpm start:dev
   ```

- **API Base URL:** `http://localhost:5000/api/v1`
- **Swagger Documentation:** `http://localhost:5000/api/docs`

---

## 4. Default Seed Credentials

- **Admin Email:** `admin@avro.com`
- **Admin Password:** `Admin@123456`
- **Admin Role:** `ADMIN`

---

## 5. Core Business Rules

1. **Cash on Delivery (COD) Only:**
   - COD is the sole payment method.
   - Initial payment status is always `UNPAID`.
   - A COD order can only be marked `PAID` by an admin **after** the order status has reached `DELIVERED`.

2. **Server-Side Pricing & Inventory Integrity:**
   - All line subtotals, discounts, delivery charges (flat 60), and final amounts are calculated by the backend. Client-submitted prices are ignored.
   - Product stock is validated and decremented atomically on order placement.
   - Customer can cancel an order only while it is `PENDING` or `CONFIRMED`. Stock is automatically restored upon cancellation.

3. **Status Transitions:**
   - `PENDING` → `CONFIRMED` or `CANCELLED`
   - `CONFIRMED` → `PROCESSING` or `CANCELLED`
   - `PROCESSING` → `SHIPPED` or `CANCELLED`
   - `SHIPPED` → `DELIVERED` or `CANCELLED`
   - `DELIVERED` & `CANCELLED` are terminal states.

4. **Authentication & Authorization:**
   - Public registration creates `CUSTOMER` accounts only. Role elevation via registration is strictly forbidden.
   - JWT tokens are issued in secure, HTTP-only cookies (`token`).
   - Role-based route protection via `@Roles(Role.ADMIN)`.

---

## 6. Key API Endpoints

### Auth (`/api/v1/auth`)
- `POST /register` — Register new customer
- `POST /login` — Login & receive HTTP-only cookie
- `POST /logout` — Clear session cookie
- `GET /me` — Current authenticated profile *(Protected)*
- `PATCH /profile` — Update name, phone, address *(Protected)*
- `POST /change-password` — Change password *(Protected)*

### Categories (`/api/v1/categories`)
- `GET /` — List active categories *(Public)*
- `GET /:slug` — Get category by slug *(Public)*
- `GET /admin/all` — List all categories *(Admin)*
- `POST /` — Create category *(Admin)*
- `PATCH /:id` — Update category *(Admin)*
- `DELETE /:id` — Delete category if no products attached *(Admin)*

### Products (`/api/v1/products`)
- `GET /` — Browse active products with search, category, price filters, sort & pagination *(Public)*
- `GET /:slug` — Product details by slug *(Public)*
- `GET /admin/all` — List all products *(Admin)*
- `POST /` — Create product *(Admin)*
- `PATCH /:id` — Update product *(Admin)*
- `PATCH /:id/stock` — Update inventory stock *(Admin)*
- `DELETE /:id` — Delete product *(Admin)*

### Orders (`/api/v1/orders`)
- `POST /` — Place COD order *(Customer)*
- `GET /my-orders` — View own order history *(Customer)*
- `GET /:id` — View order details *(Customer / Admin)*
- `PATCH /:id/cancel` — Cancel eligible order & restore stock *(Customer)*
- `GET /admin/all` — View all store orders with filters *(Admin)*
- `PATCH /admin/:id/status` — Advance order status *(Admin)*
- `PATCH /admin/:id/payment` — Confirm COD cash collection *(Admin)*

### Dashboard (`/api/v1/dashboard`)
- `GET /overview` — Store overview stats: customers, products, order counts, paid COD revenue, outstanding delivered COD amount, low-stock products, recent orders *(Admin)*
