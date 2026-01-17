# NestJS Backend Boilerplate

A production-ready NestJS backend boilerplate with PostgreSQL, Redis, Prisma ORM, and authentication support.

## Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0
- Docker and Docker Compose

## Getting Started

### 1. Install Dependencies

Install all dependencies using pnpm:

```bash
pnpm install
```

### 2. Start Database Services

Navigate to the nest application directory and start PostgreSQL and Redis:

```bash
cd apps/nest
docker-compose up -d
```

This will start:
- PostgreSQL on port `5403`
- Redis on port `6849`
- Redis Insight UI on port `8104` (accessible at http://localhost:8104)

### 3. Configure Environment Variables

Copy the sample environment file:

```bash
cp apps/nest/.env.local.sample apps/nest/.env.local
```

The default configuration should work for local development. Key variables include:

```bash
# Super admin credentials (for initial login)
SUPER_ADMIN_USERNAME=superadmin@gg.com
SUPER_ADMIN_PASSWORD=samplepassword

# JWT configuration
JWT_SECRET=iu34gt72238r2983jr9jf
JWT_EXPIRES=1d

# Database connections
REDIS_URL=redis://:@localhost:6849/1
DATABASE_URL=postgresql://cyberk:cyberk@localhost:5403/cyberk?schema=public
```

### 4. Initialize the Database

Reset the database, run migrations, and seed initial data:

```bash
cd apps/nest
pnpm prisma:reset:local
```

This will create the database schema and insert seed data including a super admin user.

### 5. Run the Application

From the nest application directory:

```bash
# Start with auto-reload (recommended for development)
pnpm start:local:watch

# Or start without watch mode
pnpm start:local

# Or start with debug mode
pnpm start:local:debug
```

The API will be available at `http://localhost:3000`

## API Documentation

Once running, access the Swagger documentation at:

```
http://localhost:3000/api
```

## Available Scripts

From the root directory:

- `pnpm build` - Build all applications
- `pnpm dev` - Run all applications in development mode
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code with Prettier

From `apps/nest` directory:

### Development
- `pnpm start:local` - Start application
- `pnpm start:local:watch` - Start with watch mode
- `pnpm start:local:debug` - Start with debug mode

### Database
- `pnpm prisma:reset:local` - Reset database, run migrations, and seed
- `npx prisma studio` - Open Prisma Studio to view/edit database
- `npx prisma migrate dev` - Create and apply new migration

### Testing
- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage
- `pnpm test:e2e` - Run end-to-end tests

### Build
- `pnpm build` - Build the application
- `pnpm lint` - Lint and fix code
- `pnpm format` - Format code

## Project Structure

```
.
├── apps/
│   └── nest/              # Main NestJS application
│       ├── apps/          # Application entry points
│       ├── libs/          # Shared libraries and modules
│       │   ├── auth/      # Authentication module
│       │   ├── user/      # User management
│       │   ├── profile/   # User profiles
│       │   ├── todo/      # Todo feature
│       │   ├── post/      # Post feature
│       │   └── ...
│       ├── prisma/        # Database schema and migrations
│       └── docker-compose.yml  # Local services
├── docs/                  # Documentation
└── package.json           # Root package configuration
```

## Features

- NestJS framework with TypeScript
- PostgreSQL database with Prisma ORM
- Redis for caching
- JWT authentication
- Swagger API documentation
- Docker Compose for local development
- Git hooks with Husky
- Code formatting with Prettier
- Linting with ESLint
- Monorepo with Turborepo

## Troubleshooting

### Database Connection Issues

If you encounter connection errors:

1. Check if Docker services are running:
   ```bash
   cd apps/nest
   docker-compose ps
   ```

2. Verify ports are available:
   ```bash
   lsof -i :5403  # PostgreSQL
   lsof -i :6849  # Redis
   ```

3. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Prisma Issues

If Prisma commands fail:

1. Regenerate the Prisma client:
   ```bash
   cd apps/nest
   npx prisma generate
   ```

2. Reset the database:
   ```bash
   pnpm prisma:reset:local
   ```

### Port Already in Use

If port 3000 is already in use, you can change it by setting the `PORT` environment variable in your `.env.local` file.

## License

UNLICENSED
