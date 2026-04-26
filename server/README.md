# NexaERP Backend - TypeScript Monolithic Architecture

Enterprise-grade ERP platform built with Node.js, Express, TypeScript, and MongoDB.

## Project Structure

```
server/
├── src/
│   ├── controllers/     # Request handlers for each module
│   ├── services/        # Business logic layer
│   ├── models/          # Database schemas and models
│   ├── views/           # Server-side rendering templates
│   ├── middleware/      # Custom middleware (auth, validation, etc.)
│   ├── utils/           # Utility functions and helpers
│   ├── config/          # Configuration files
│   └── server.ts        # Main application entry point
├── dist/                # Compiled JavaScript output
├── node_modules/        # Dependencies
├── .env                 # Environment variables
├── .eslintrc.json       # ESLint configuration
├── .prettierrc.json     # Prettier configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies and scripts
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Code Quality**: ESLint, Prettier
- **Development**: Nodemon, ts-node

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB instance (local or Atlas)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexaerp
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:8080
```

3. Build the project:
```bash
npm run build
```

### Development

Run in development mode with hot reload:
```bash
npm run dev
```

### Production

Build and run in production:
```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode for compilation
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Type check without emitting files

## Architecture

### Monolithic MVC Pattern

The application follows a traditional monolithic architecture with clear separation of concerns:

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Contain business logic and data operations
3. **Models**: Define database schemas and data structures
4. **Middleware**: Process requests before reaching controllers
5. **Utils**: Provide reusable utility functions

### Module Organization

Each business module (CRM, Inventory, Manufacturing, etc.) will follow this structure:

```
src/
├── controllers/
│   └── CRMController.ts
├── services/
│   └── CRMService.ts
├── models/
│   ├── Lead.ts
│   ├── Opportunity.ts
│   └── Customer.ts
└── middleware/
    └── crmAuth.ts
```

## Code Quality

### TypeScript Configuration

- Strict mode enabled
- No implicit any
- Unused variables/parameters detection
- Source maps for debugging

### ESLint Rules

- TypeScript recommended rules
- Prettier integration
- Custom rules for consistency

### Prettier Configuration

- Single quotes
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)

## API Response Format

All API responses follow a standardized format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Helmet for security headers
- CORS configuration
- Input validation and sanitization

## Database Models

### User Model (Example)

```typescript
interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Future Modules

The following enterprise modules will be added in subsequent phases:

1. CRM & Sales Pipeline
2. Advanced Inventory Management
3. Manufacturing & Production
4. Full Accounting Suite
5. Supply Chain Management
6. Human Capital Management
7. Enterprise Asset Management
8. Project Systems
9. Governance, Risk & Compliance
10. Document Management
11. Workflow Builder
12. Industry 4.0 / IoT Integration
13. Advanced Finance
14. Multi-tenant Platform
15. Analytics & BI
16. Mobile Access
17. API Gateway
18. Security & Compliance
19. Global Enterprise Features

## Contributing

1. Follow the established folder structure
2. Write TypeScript with strict typing
3. Add JSDoc comments for public APIs
4. Run linting and formatting before commits
5. Write unit tests for new features
6. Update documentation as needed

## License

Proprietary - NexaERP Platform
