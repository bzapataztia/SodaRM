# Rental Manager - Multi-tenant SaaS Platform

## Overview

Rental Manager is a comprehensive multi-tenant SaaS platform designed for property management companies to manage their rental portfolio, automate invoicing, process payments, and generate compliance reports. The application streamlines rental operations by automating monthly invoice generation, sending payment reminders, processing OCR documents for utility charges, and producing insurer reports.

The system is built as a modern full-stack web application with a React frontend and Node.js/Express backend, utilizing PostgreSQL for data persistence and integrating with multiple third-party services for payments, communications, and document processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- React Hook Form with Zod for form validation

**Design Pattern:**
The frontend follows a component-based architecture with clear separation between pages, reusable components, and UI primitives. State management is handled through React Query for server data and local React state for UI state. The application uses a protected route pattern where authentication state determines access to different views.

**Key Architectural Decisions:**
- **Client-side routing:** Wouter was chosen over React Router for its minimal bundle size while providing essential routing features
- **Server state management:** React Query eliminates the need for global state management by providing intelligent caching, background updates, and automatic refetching
- **Component composition:** Shadcn UI provides unstyled, accessible components that can be customized rather than a rigid component library
- **Form handling:** React Hook Form reduces re-renders and provides better performance than controlled components for complex forms

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js framework
- TypeScript for type safety across the stack
- Drizzle ORM for database operations with type-safe queries
- Neon serverless PostgreSQL for database hosting
- JWT-based authentication via Replit Auth (OpenID Connect)
- Node-cron for scheduled job execution

**API Design:**
RESTful API following resource-oriented design patterns. All endpoints are prefixed with `/api` and protected by authentication middleware. Multi-tenancy is enforced at the application level by filtering queries with `tenantId`.

**Key Architectural Decisions:**
- **Multi-tenant isolation:** Every database table includes a `tenantId` column, and all queries are automatically scoped to the authenticated user's tenant. This provides strong data isolation while using a single database schema.
- **Authentication strategy:** Replit Auth (OpenID Connect) provides social login (Google, GitHub, Apple) without managing passwords or user credentials directly. Session data is stored in PostgreSQL.
- **ORM choice:** Drizzle was selected for its lightweight footprint, excellent TypeScript support, and SQL-like query syntax that provides transparency over query execution.
- **Job scheduling:** Node-cron runs within the application process for scheduled tasks like invoice generation and payment reminders, avoiding the complexity of separate worker processes.

### Database Architecture

**Database:** PostgreSQL (via Neon serverless)

**Schema Design:**
The database follows a normalized relational model with the following core entities:

- **tenants:** Organization/company records with plan information and Stripe customer data
- **users:** User accounts linked to tenants with role-based permissions
- **contacts:** Multi-role contact records (owners, tenants, guarantors, providers)
- **properties:** Real estate properties with ownership information
- **contracts:** Rental agreements linking properties, owners, and tenants
- **invoices:** Monthly billing records generated from contracts
- **invoice_charges:** Line items for invoices (rent, utilities, fees)
- **payments:** Payment records applied to invoices
- **insurers:** Insurance company records for policy management
- **policies:** Insurance policies linked to contracts
- **ocr_logs:** Audit trail for document processing
- **audit_logs:** General audit trail for system actions
- **sessions:** Session storage for authentication

**Multi-tenancy Implementation:**
All tenant-scoped tables include a `tenantId` foreign key. Row-level isolation is enforced in application code through the storage layer, which automatically adds tenant filters to all queries.

**Key Architectural Decisions:**
- **Single schema multi-tenancy:** Chosen over separate databases per tenant for operational simplicity and cost efficiency. Suitable for the target market size.
- **Audit logging:** Separate audit_logs and ocr_logs tables provide compliance tracking and debugging capabilities.
- **Flexible contact roles:** Contacts can have multiple roles (owner, tenant, guarantor) using a JSON array field, reducing table joins.
- **Decimal precision:** Financial amounts use PostgreSQL's `numeric` type to avoid floating-point precision issues.

### External Dependencies

**Payment Processing:**
- **Stripe:** Subscription billing, customer portal, and webhook handling for plan upgrades. Integrated using official Stripe SDK with checkout sessions and customer portal links.

**Communication Services:**
- **SendGrid:** Transactional email delivery for invoice reminders and reports. Credentials managed via Replit connectors with automatic token refresh.
- **Twilio WhatsApp (planned):** WhatsApp bot integration for payment status queries (not yet implemented in codebase).

**Document Processing:**
- **AWS Textract:** OCR processing for utility bills and service invoices. Extracts text, tables, and key-value pairs from PDF documents to automatically create invoice charges.

**Cloud Storage:**
- **S3-compatible storage:** For storing generated PDF reports and uploaded documents (referenced but not fully implemented in current codebase).

**Authentication:**
- **Replit Auth (OpenID Connect):** Provides social login integration with Google, GitHub, and Apple. Eliminates need for custom authentication implementation.

**Infrastructure:**
- **Replit deployment platform:** Hosting environment with built-in database provisioning and secrets management
- **Neon serverless PostgreSQL:** Managed database with connection pooling and automatic scaling

**Key Integration Patterns:**
- **Webhook handling:** Stripe webhooks for subscription events are processed synchronously with raw body verification
- **Credential management:** External service credentials are fetched from Replit connectors on-demand rather than cached, ensuring fresh tokens
- **OCR workflow:** Uploaded documents are processed asynchronously, stored in logs with confidence scores, and require manual approval before creating charges
- **Scheduled jobs:** Cron tasks run on the main application process for invoice generation (monthly), payment reminders (daily D-3 and D+1), and insurer reports (monthly)