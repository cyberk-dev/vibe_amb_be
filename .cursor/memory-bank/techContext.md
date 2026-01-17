# Technical Context

## Development Environment

### Prerequisites
- Node.js v18+
- PNPM v9.0.0+
- AWS CLI (for deployment)
- Docker (for local development with PostgreSQL)
- Redis (for caching)

### IDE Setup
- VSCode recommended
- ESLint extension
- Prettier extension
- TypeScript extension
- Prisma extension

## Technology Stack

### Core Technologies
1. **NestJS Framework**
   - Purpose: Backend API development
   - Key features used:
     - Dependency injection
     - Decorators
     - Modules
     - Interceptors and filters
     - Guards and pipes

2. **TypeScript**
   - Version: 5.5.4
   - Configuration: Strict mode enabled
   - Features used:
     - Decorators
     - Type inference
     - Strong typing
     - Interfaces and generics

3. **Turborepo**
   - Version: 2.3.3
   - Purpose: Monorepo management
   - Features:
     - Task orchestration
     - Caching
     - Workspace management
     - Dependency graph

### Database
1. **PostgreSQL**
   - Purpose: Main database
   - Access: Via Prisma ORM
   - Features used:
     - Relational data modeling
     - Transactions
     - Migrations

2. **Prisma ORM**
   - Version: Latest
   - Features:
     - Type-safe database access
     - Migration management
     - Query building
     - Data modeling

3. **Redis**
   - Purpose: Caching
   - Implementation: @keyv/redis
   - Usage:
     - API response caching
     - Distributed caching
     - TTL-based expiration

### Infrastructure

1. **AWS CDK**
   - Version: 2.177.0
   - Components:
     - Lambda functions
     - API Gateway
     - S3 and CloudFront
     - EventBus and SQS
     - IAM roles and policies

2. **Serverless**
   - Components:
     - Lambda functions
     - API Gateway
     - CloudFront
     - Serverless Express

3. **Docker**
   - Purpose: Local development
   - Services:
     - PostgreSQL
     - Redis

### Authentication

1. **JWT**
   - Features:
     - Access tokens
     - Refresh tokens
     - Role-based authorization
     - Custom guards

2. **User Management**
   - Features:
     - Profile-centric design
     - Multiple auth providers
     - User confirmation
     - Role assignment

### Development Tools

1. **Package Management**
   - Tool: PNPM
   - Version: 9.0.0
   - Features:
     - Workspace support
     - Fast installation
     - Disk efficiency

2. **Code Quality**
   - ESLint
   - Prettier
   - TypeScript compiler
   - Jest for testing

3. **Bundling**
   - Webpack
   - Custom configurations for:
     - Lambda functions
     - Lambda layers
     - Workers

## Technical Constraints

### Performance Requirements
- Lambda cold start < 1s
- API response time < 200ms
- Optimized bundle size
- Efficient caching

### Security Requirements
- JWT-based authentication
- User-specific data access
- HTTPS everywhere
- CORS configuration
- Input validation

### Scalability Approach
- Serverless architecture
- Stateless design
- Event-driven patterns
- Caching strategy
- Efficient database access

## Dependencies

### Key Production Dependencies
```json
{
  "aws-cdk": "^2.177.0",
  "@nestjs/core": "latest",
  "@nestjs/common": "latest",
  "@nestjs/swagger": "latest",
  "prisma": "latest",
  "nestjs-prisma": "latest",
  "@vendia/serverless-express": "latest",
  "class-transformer": "latest",
  "class-validator": "latest",
  "@keyv/redis": "latest"
}
```

### Key Development Dependencies
```json
{
  "prettier": "^3.2.5",
  "turbo": "^2.3.3",
  "typescript": "5.5.4",
  "webpack": "latest",
  "jest": "latest"
}
```

## Development Setup

### Installation
```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd apps/nest && npx prisma generate

# Build all packages
pnpm build

# Start development
pnpm dev
```

### Development Commands
- `pnpm build`: Build all packages
- `pnpm dev`: Start development
- `pnpm lint`: Run linting
- `pnpm format`: Format code
- `pnpm test`: Run tests

### Deployment
```bash
# Deploy to AWS
cd apps/cdk && pnpm cdk deploy

# Deploy specific environment
cd apps/cdk && pnpm cdk deploy --context env=dev
```

## Important Files

### Configuration Files
- `apps/nest/prisma/schema.prisma`: Database schema
- `apps/cdk/lib/cdk-stack.ts`: AWS infrastructure
- `apps/nest/nest-cli.json`: NestJS configuration
- `apps/nest/webpack-lambda.config.js`: Lambda bundling

### Entry Points
- `apps/nest/apps/api/src/main.ts`: API Lambda handler
- `apps/cdk/bin/cdk.ts`: CDK entry point 