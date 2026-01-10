#!/bin/bash
# Quick development startup script

set -e

echo "=== Car Recommendation System - Development Startup ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ docker-compose is not available. Please install docker-compose."
    exit 1
fi

# Start services
echo "📦 Starting infrastructure services..."
$COMPOSE_CMD up -d postgres redis elasticsearch qdrant

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

echo "📊 Starting ETL to load data..."
$COMPOSE_CMD up -d etl-worker

echo "⏳ Waiting for data load..."
sleep 5

echo "🚀 Starting backend API..."
$COMPOSE_CMD up -d backend

echo "⏳ Waiting for backend to be ready..."
sleep 5

echo "🌐 Starting frontend..."
$COMPOSE_CMD up -d frontend

echo ""
echo "=== All services started! ==="
echo ""
echo "📍 URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   PostgREST:    http://localhost:3001"
echo "   Bytebase:     http://localhost:8080"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop all:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
