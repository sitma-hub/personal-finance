#!/bin/bash

set -e

echo "Setting up Personal Net Worth Tracker..."

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "Docker Compose is not available."
    exit 1
fi

mkdir -p server/uploads server/logs

if [ ! -f server/.env ]; then
    cp server/env.example server/.env
    echo "Created server/.env from env.example"
fi

echo "Installing client dependencies..."
(cd client && npm install)

echo "Installing server dependencies..."
(cd server && npm install)

echo "Building Docker images..."
docker compose build

echo "Setup complete."
echo ""
echo "  docker compose up -d     # start app"
echo "  docker compose down -v   # reset database (deletes data)"
echo ""
echo "  http://localhost:3000"
