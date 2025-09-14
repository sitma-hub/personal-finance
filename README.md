# Personal Finance Scenario Modeler

A comprehensive full-stack React application for personal finance scenario modeling and analysis.

## Features

- **Comprehensive Financial Data Management**: Input and manage all aspects of your financial portfolio
- **Advanced Scenario Modeling**: Model market conditions, inflation, income growth, and life events
- **Monte Carlo Simulations**: Understand probability distributions of financial outcomes
- **Interactive Visualizations**: Real-time charts and projections with parameter adjustments
- **Multi-Timeframe Analysis**: Short-term (1-5 years), medium-term (5-15 years), and long-term (15+ years) projections
- **Goal-Based Planning**: Set financial targets and work backwards to determine required actions
- **Data Import**: CSV/Excel import capabilities for bulk data entry

## Tech Stack

- **Frontend**: React 18, Redux Toolkit, TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **Visualization**: Chart.js, D3.js

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd personal-finance-scenario-modeler
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your database credentials
   ```

3. **Start with Docker:**
   ```bash
   npm run docker:up
   ```

4. **Or start development servers:**
   ```bash
   npm run dev
   ```

### Production Deployment

```bash
npm run docker:build
npm run docker:up
```

## Project Structure

```
personal-finance-scenario-modeler/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store and slices
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript type definitions
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
├── docker compose.yml     # Docker configuration
└── tasks/                 # Project documentation
    └── prd-personal-finance-scenario-modeler.md
```

## API Documentation

The API provides endpoints for:
- Financial data management (CRUD operations)
- Scenario modeling and calculations
- Data import/export
- User preferences and settings

## Contributing

1. Follow the PRD specifications in `/tasks/prd-personal-finance-scenario-modeler.md`
2. Use TypeScript for type safety
3. Follow React and Node.js best practices
4. Write tests for critical functionality
5. Update documentation as needed

## License

MIT License - see LICENSE file for details
