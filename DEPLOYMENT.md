# Personal Finance Scenario Modeler - Deployment Guide

## Overview

The Personal Finance Scenario Modeler is a fully dockerized full-stack React application that enables users to input their personal finance data and run different scenarios for financial planning.

## Architecture

- **Frontend**: React 18 with Redux Toolkit, TypeScript, Material-UI
- **Backend**: Node.js with Express, TypeScript, PostgreSQL
- **Database**: PostgreSQL with comprehensive financial data schema
- **Containerization**: Docker & Docker Compose
- **Visualization**: Chart.js, Recharts for interactive charts

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd personal-finance-scenario-modeler
   ```

2. **Run the setup script**:
   ```bash
   ./setup.sh
   ```

3. **Start the application**:
   ```bash
   npm run docker:up
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## Development Setup

### Backend Development

```bash
cd server
npm install
npm run dev
```

### Frontend Development

```bash
cd client
npm install
npm start
```

### Database Setup

The database is automatically initialized with the schema when using Docker. For local development:

1. Install PostgreSQL
2. Create database: `personal_finance_db`
3. Run the init script: `psql -d personal_finance_db -f server/database/init.sql`

## Features Implemented

### ✅ Core Features

1. **Comprehensive Data Management**
   - Assets (savings, investments, real estate, vehicles)
   - Liabilities (mortgages, loans, credit cards)
   - Income streams (salary, freelance, rental income)
   - Expenses (categorized with inflation tracking)

2. **Advanced Scenario Modeling**
   - Market condition scenarios (bull/bear markets, crashes)
   - Inflation modeling
   - Income growth projections
   - Life event simulations

3. **Monte Carlo Simulations**
   - Probability distributions
   - Confidence intervals (5th, 25th, 50th, 75th, 95th percentiles)
   - Goal achievement probability

4. **Interactive Visualization**
   - Real-time charts with Recharts
   - Asset breakdown pie charts
   - Net worth trend lines
   - Scenario comparison views

5. **Data Import/Export**
   - CSV and Excel file support
   - Template generation
   - Bulk data import

6. **Goal-Based Planning**
   - Financial target setting
   - Progress tracking
   - Priority management

### 🔧 Technical Features

- **TypeScript**: Full type safety across frontend and backend
- **Redux Toolkit**: State management with async thunks
- **Material-UI**: Modern, responsive UI components
- **PostgreSQL**: Robust relational database with proper indexing
- **Docker**: Full containerization for easy deployment
- **RESTful API**: Well-structured API endpoints
- **Error Handling**: Comprehensive error handling and validation

## API Endpoints

### Assets
- `GET /api/assets` - Get all assets
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/assets/:id/holdings` - Get investment holdings
- `POST /api/assets/:id/holdings` - Add investment holding

### Scenarios
- `GET /api/scenarios` - Get all scenarios
- `POST /api/scenarios` - Create new scenario
- `POST /api/scenarios/:id/calculate` - Run scenario calculations
- `GET /api/scenarios/:id/results` - Get scenario results
- `POST /api/scenarios/:id/monte-carlo` - Run Monte Carlo simulation

### Import/Export
- `POST /api/import/csv` - Import CSV data
- `POST /api/import/excel` - Import Excel data
- `GET /api/export/csv` - Export CSV data
- `GET /api/export/excel` - Export Excel data

## Database Schema

The database includes comprehensive tables for:
- Users (single-user app)
- Assets with investment holdings and real estate properties
- Liabilities with mortgages
- Income streams
- Expenses
- Scenarios and results
- Goals
- Monte Carlo simulations

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://pfsm_user:pfsm_password@localhost:5432/personal_finance_db
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### Frontend
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Production Deployment

### Using Docker Compose

1. **Build production images**:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Manual Deployment

1. **Backend**:
   ```bash
   cd server
   npm run build
   npm start
   ```

2. **Frontend**:
   ```bash
   cd client
   npm run build
   # Serve build folder with nginx/apache
   ```

## Monitoring and Maintenance

### Health Checks
- Backend health endpoint: `GET /health`
- Database connection monitoring
- Application uptime tracking

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup
```bash
# Database backup
docker-compose exec postgres pg_dump -U pfsm_user personal_finance_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U pfsm_user personal_finance_db < backup.sql
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, and 5432 are available
2. **Database connection**: Check PostgreSQL container is running
3. **CORS errors**: Verify CORS_ORIGIN environment variable
4. **File upload issues**: Check upload directory permissions

### Debug Mode

```bash
# Enable debug logging
export DEBUG=*
npm run dev
```

## Security Considerations

- No authentication required (single-user app)
- Input validation on all endpoints
- SQL injection protection with parameterized queries
- File upload restrictions
- Rate limiting on API endpoints

## Performance Optimization

- Database indexing on frequently queried columns
- Chart rendering optimization
- Lazy loading for large datasets
- Caching for scenario results

## Future Enhancements

- Real-time market data integration
- Advanced tax calculations
- Retirement planning tools
- Estate planning features
- Mobile app development
- Multi-user support with authentication

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check Docker logs for errors
4. Ensure all prerequisites are met

---

**Note**: This is a personal finance tool designed for individual use. Always consult with financial professionals for important financial decisions.
