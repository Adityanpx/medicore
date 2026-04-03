# MediCore — Hospital Management Microservices System

A production-grade hospital management system built with Node.js microservices architecture. Demonstrates real-world patterns used by companies like Netflix, Uber, and Amazon.

## Architecture Overview
```
                        ┌─────────────────┐
                        │   API Gateway   │
                        │   (Port 3000)   │
                        └────────┬────────┘
                                 │
          ┌──────────┬───────────┼───────────┬──────────┐
          ▼          ▼           ▼           ▼          ▼
    ┌──────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
    │  Auth    │ │ Patient │ │ Doctor │ │ Appt.  │ │ Billing │
    │ Service  │ │ Service │ │Service │ │Service │ │ Service │
    │ :4001    │ │  :4002  │ │  :4003 │ │  :4004 │ │  :4005  │
    └──────────┘ └─────────┘ └────────┘ └────────┘ └─────────┘
         │            │           │          │            │
         ▼            ▼           ▼          │            ▼
    [medicore    [medicore   [medicore        │       [medicore
      -auth]     -patients]  -doctors]       │        -billing]
                                             │
                                    ┌────────▼────────┐
                                    │    RabbitMQ     │
                                    │  Message Broker │
                                    └─────────────────┘
```

## Services

| Service | Port | Database | Responsibility |
|---|---|---|---|
| api-gateway | 3000 | — | Single entry point, request routing |
| auth-service | 4001 | medicore-auth | JWT authentication, user management |
| patient-service | 4002 | medicore-patients | Patient profiles, medical history |
| doctor-service | 4003 | medicore-doctors | Doctor profiles, availability |
| appointment-service | 4004 | medicore-appointments | Booking, scheduling |
| billing-service | 4005 | medicore-billing | Automatic bill generation |

## Key Patterns Implemented

**Synchronous Communication**
Services communicate via REST HTTP using axios. appointment-service calls patient-service and doctor-service simultaneously using Promise.all() for parallel execution.

**Asynchronous Communication**
RabbitMQ fanout exchange broadcasts events across services. When a doctor completes an appointment, billing-service automatically generates a bill without appointment-service knowing billing exists.

**Circuit Breaker Pattern**
Every inter-service HTTP call is wrapped with opossum circuit breakers. After 3 failures the circuit opens and returns instant fallback responses — preventing cascading failures.

**Distributed Tracing**
Every request gets a unique Correlation ID at the API Gateway. It travels through HTTP headers and RabbitMQ message payloads — connecting logs across all services for end-to-end visibility.

**Data Denormalization**
Each service owns its database. appointment-service stores patient and doctor name snapshots to avoid cross-service calls on every read.

**Dead Letter Queue**
Failed RabbitMQ messages move to a dead letter queue after 3 retries — preventing infinite failure loops.

## Tech Stack

- **Runtime** — Node.js
- **Framework** — Express.js
- **Database** — MongoDB Atlas (separate database per service)
- **Message Broker** — RabbitMQ (CloudAMQP)
- **Logging** — Winston + Morgan
- **Circuit Breaker** — opossum
- **Authentication** — JWT (jsonwebtoken)
- **Containerization** — Docker + Docker Compose

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- CloudAMQP account (free tier)

### Setup

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/medicore.git
cd medicore
```

**2. Install dependencies for each service**
```bash
cd services/auth-service && npm install && cd ../..
cd services/patient-service && npm install && cd ../..
cd services/doctor-service && npm install && cd ../..
cd services/appointment-service && npm install && cd ../..
cd services/billing-service && npm install && cd ../..
cd api-gateway && npm install && cd ..
```

**3. Configure environment variables**

Each service needs a `.env` file. Use the `.env.example` files as templates.
```env
# Required in every service
PORT=<service_port>
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<db_name>
AUTH_SERVICE_URL=http://localhost:4001

# Required in appointment-service and billing-service
RABBITMQ_URL=amqps://<cloudamqp_url>

# Required in auth-service only
JWT_SECRET=your_secret_key
```

**4. Start all services**
```bash
# Open 6 terminals — one per service
cd services/auth-service && npm run dev
cd services/patient-service && npm run dev
cd services/doctor-service && npm run dev
cd services/appointment-service && npm run dev
cd services/billing-service && npm run dev
cd api-gateway && npm run dev
```

**5. Import Postman collection**

Import `MediCore_Complete.postman_collection.json` from the root of the repo and run requests top to bottom.

## API Endpoints

### Auth
```
POST /api/auth/register       Register patient or doctor
POST /api/auth/login          Login and receive JWT
POST /api/auth/verify-token   Internal — verify JWT validity
```

### Patient
```
POST  /api/patients/profile         Create patient profile
GET   /api/patients/profile/me      Get my profile
POST  /api/patients/medical-history Add medical history entry
```

### Doctor
```
POST  /api/doctors/profile        Create doctor profile
GET   /api/doctors/profile/me     Get my profile
GET   /api/doctors                Browse all doctors (public)
PATCH /api/doctors/availability   Update availability slots
```

### Appointments
```
POST  /api/appointments/book                   Book appointment
GET   /api/appointments/my                     My appointments (patient)
GET   /api/appointments/doctor                 My appointments (doctor)
PATCH /api/appointments/complete/:id           Mark complete → triggers billing
PATCH /api/appointments/cancel/:id             Cancel appointment
```

### Billing
```
GET   /api/billing/my          My bills (auto-generated by RabbitMQ)
GET   /api/billing/:id         Get specific bill
PATCH /api/billing/:id/pay     Mark bill as paid
```

### System
```
GET /health           API Gateway health
GET /circuit-status   All services health + response times
```

## How the Complete Flow Works
```
1. Patient registers → auth-service creates user in medicore-auth DB
2. Patient creates profile → patient-service creates record in medicore-patients DB
                           → auth-service serviceId updated (cross-service link)
3. Doctor registers + creates profile → same pattern in medicore-doctors DB
4. Patient books appointment:
   → appointment-service verifies token via auth-service
   → fetches patient + doctor data in parallel (Promise.all)
   → checks doctor availability
   → creates appointment in medicore-appointments DB
5. Doctor completes appointment:
   → appointment-service updates status
   → publishes "appointment.completed" event to RabbitMQ fanout exchange
   → billing-service consumer receives event
   → bill auto-generated with 18% GST in medicore-billing DB
6. Patient views bill → billing-service returns generated bill
7. Patient pays → paymentStatus updated to "paid"
```

## Project Structure
```
medicore/
├── api-gateway/
│   ├── index.js
│   ├── logger.js
│   └── correlationId.middleware.js
├── services/
│   ├── auth-service/
│   ├── patient-service/
│   ├── doctor-service/
│   ├── appointment-service/
│   └── billing-service/
│       └── src/
│           ├── config/
│           │   ├── db.js
│           │   ├── logger.js
│           │   ├── rabbitmq.js
│           │   └── circuitBreaker.js
│           ├── controllers/
│           ├── middleware/
│           ├── models/
│           ├── routes/
│           └── consumers/        (billing-service only)
├── docker-compose.yml
└── MediCore_Complete.postman_collection.json
```

## Author

**Aditya Gavali**
- GitHub: https://github.com/Adityanpx
- LinkedIn: https://www.linkedin.com/in/aditya-gavali-b79b4525a/