#!/bin/bash

# Personal Finance Scenario Modeler Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Personal Finance Scenario Modeler..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed (try both versions)
if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p server/uploads
mkdir -p server/logs
mkdir -p client/public

# Copy environment file if it doesn't exist
if [ ! -f server/.env ]; then
    echo "📝 Creating environment file..."
    cp server/env.example server/.env
    echo "⚠️  Please review and update server/.env with your configuration"
fi

# Install dependencies for client and server
echo "📦 Installing client dependencies..."
cd client
npm install --legacy-peer-deps
cd ..

echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Build Docker images (use docker compose if available, otherwise docker compose)
echo "🐳 Building Docker images..."
if docker compose version &> /dev/null; then
    docker compose build
else
    docker compose build
fi

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
if docker compose version &> /dev/null; then
    echo "  docker compose up -d"
else
    echo "  docker compose up -d"
fi
echo ""
echo "To stop the application:"
if docker compose version &> /dev/null; then
    echo "  docker compose down"
else
    echo "  docker compose down"
fi
echo ""
echo "To view logs:"
if docker compose version &> /dev/null; then
    echo "  docker compose logs -f"
else
    echo "  docker compose logs -f"
fi
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:5000"
echo "  Database: localhost:5432"
