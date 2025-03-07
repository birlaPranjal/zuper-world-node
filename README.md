# Zuper Node.js Backend

This is the backend server for the Zuper application, built with Node.js, Express, TypeScript, and Prisma.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3005
   DATABASE_URL="your-database-url"
   DIRECT_URL="your-direct-database-url"
   ```

3. Generate Prisma client:
   ```bash
   pnpm prisma:generate
   ```

4. Run database migrations:
   ```bash
   pnpm prisma:migrate
   ```

## Development

Start the development server:
```bash
pnpm dev
```

## Production

Build the application:
```bash
pnpm build
```

Start the production server:
```bash
pnpm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Authenticate a user
- `POST /api/auth/update-password` - Update user password
- `POST /api/auth/update-profile` - Update user profile information

## Database

This project uses PostgreSQL with Prisma as the ORM. The database schema is defined in `prisma/schema.prisma`. 