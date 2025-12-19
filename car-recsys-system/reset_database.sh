#!/bin/bash
# Script to completely reset the database

echo "=========================================="
echo "RESETTING DATABASE"
echo "=========================================="

cd "/home/duc-nguyen16/Car Recsys Consultant Chatbot/car-recsys-system"

# Stop all containers
echo "Stopping all containers..."
docker-compose down

# Remove database volume
echo "Removing database volume..."
docker volume rm car-recsys-system_postgres_data 2>/dev/null || true
docker volume rm car-recsys-system_bytebase_data 2>/dev/null || true

# Clean up any leftover data
echo "Cleaning up..."
docker system prune -f

# Start fresh
echo "Starting fresh containers..."
docker-compose up -d postgres postgrest bytebase

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 15

# Check status
echo ""
echo "=========================================="
echo "Container Status:"
echo "=========================================="
docker-compose ps

echo ""
echo "=========================================="
echo "Database has been completely reset!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run schema creation: docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/02-create-schema.sql"
echo "2. Load data: python3 load_flexible.py"
