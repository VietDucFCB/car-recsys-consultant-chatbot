#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Print header
clear
echo -e "${CYAN}"
echo "════════════════════════════════════════════════════════════════"
echo "     🚀 Car Recommendation System - Quick Start"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""

# Check if Docker is running
if ! docker info &>/dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Create network if it doesn't exist
if ! docker network inspect car-recsys-network &>/dev/null; then
    print_info "Creating Docker network..."
    docker network create car-recsys-network
    print_status "Network created"
fi

# Stop any running containers (without removing volumes)
echo ""
print_info "Stopping existing containers (keeping data)..."
docker-compose down 2>/dev/null

# Start infrastructure services
echo ""
echo -e "${CYAN}═══ Phase 1: Starting Infrastructure Services ═══${NC}"
print_info "Starting PostgreSQL, Elasticsearch, Qdrant, Redis..."
docker-compose up -d postgres elasticsearch qdrant redis

# Wait for PostgreSQL
echo ""
print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec car-recsys-postgres pg_isready -U admin -d car_recsys &>/dev/null; then
        print_status "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Wait for Elasticsearch
echo ""
print_info "Waiting for Elasticsearch to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:9200/_cluster/health &>/dev/null; then
        print_status "Elasticsearch is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        print_error "Elasticsearch failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Wait for Qdrant
echo ""
print_info "Waiting for Qdrant to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:6333/collections &>/dev/null; then
        print_status "Qdrant is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Qdrant failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Wait for Redis
echo ""
print_info "Waiting for Redis to be ready..."
for i in {1..20}; do
    if docker exec car-recsys-redis redis-cli ping &>/dev/null; then
        print_status "Redis is ready"
        break
    fi
    if [ $i -eq 20 ]; then
        print_error "Redis failed to start"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Setup Database Schema and Load Data
echo ""
echo -e "${CYAN}═══ Phase 2: Setting Up Database ═══${NC}"

# Create schemas
print_info "Creating database schemas..."
if docker exec -i car-recsys-postgres psql -U admin -d car_recsys < database/init/01-init-bytebase.sql &>/dev/null; then
    print_status "Bytebase user created"
else
    print_info "Bytebase user may already exist (skipping)"
fi

if docker exec -i car-recsys-postgres psql -U admin -d car_recsys < database/init/02-create-schema.sql &>/dev/null; then
    print_status "Base schemas created"
else
    print_info "Schemas may already exist (skipping)"
fi

# Check if tables exist
TABLE_COUNT=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'raw' AND table_name = 'used_vehicles';" 2>/dev/null | xargs)

if [ "$TABLE_COUNT" = "0" ]; then
    print_info "Creating database tables..."
    if docker exec -i car-recsys-postgres psql -U admin -d car_recsys < database/init/04-create-all-tables.sql &>/dev/null; then
        print_status "All tables created"
    else
        print_error "Failed to create tables"
        exit 1
    fi
else
    print_status "Tables already exist"
fi

# Check if data exists
DATA_COUNT=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.used_vehicles;" 2>/dev/null | xargs)

if [ "$DATA_COUNT" = "0" ] || [ -z "$DATA_COUNT" ]; then
    print_info "Loading data from CSV files..."
    print_info "This may take 3-5 minutes for ~720,000 rows..."
    echo ""
    
    # Start ETL worker container
    print_info "Starting ETL worker container..."
    docker-compose up -d etl-worker
    sleep 3
    
    # Copy load script into ETL container
    docker cp load_complete_database.py car-recsys-etl:/app/
    
    # Run data loading inside ETL container
    print_info "Running data load script..."
    docker exec car-recsys-etl python3 /app/load_complete_database.py 2>&1 | tee /tmp/load_db.log
    
    # Check if successful
    if grep -q "SUCCESS" /tmp/load_db.log; then
        print_status "Data loaded successfully"
        echo ""
        print_info "Verifying data integrity..."
        FINAL_COUNT=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.used_vehicles;" 2>/dev/null | xargs)
        print_status "Total vehicles in database: $FINAL_COUNT"
    else
        print_error "Failed to load data. Check /tmp/load_db.log for details."
        echo ""
        print_info "Showing last 30 lines of log:"
        tail -30 /tmp/load_db.log
        exit 1
    fi
else
    print_status "Data already exists ($DATA_COUNT rows)"
fi

# Start Database Tools
echo ""
echo -e "${CYAN}═══ Phase 3: Starting Database Tools ═══${NC}"
print_info "Starting PostgREST and Bytebase..."
docker-compose up -d postgrest bytebase

# Wait for PostgREST
echo ""
print_info "Waiting for PostgREST to be ready..."
for i in {1..20}; do
    if curl -s http://localhost:3001 &>/dev/null; then
        print_status "PostgREST is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Bytebase
echo ""
print_info "Waiting for Bytebase to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8080 &>/dev/null; then
        print_status "Bytebase is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Start Backend API
echo ""
echo -e "${CYAN}═══ Phase 4: Starting Backend API ═══${NC}"
print_info "Building and starting Backend..."
docker-compose up -d --build backend

# Wait for Backend
echo ""
print_info "Waiting for Backend API to be ready..."
for i in {1..40}; do
    if curl -s http://localhost:8000/health &>/dev/null || curl -s http://localhost:8000/docs &>/dev/null; then
        print_status "Backend API is ready"
        break
    fi
    if [ $i -eq 40 ]; then
        print_error "Backend failed to start. Check logs: docker-compose logs backend"
        exit 1
    fi
    echo -n "."
    sleep 3
done

# Start Frontend
echo ""
echo -e "${CYAN}═══ Phase 5: Starting Frontend ═══${NC}"
print_info "Building and starting Frontend..."
docker-compose up -d --build frontend

# Wait for Frontend
echo ""
print_info "Waiting for Frontend to be ready..."
for i in {1..40}; do
    if curl -s http://localhost:3000 &>/dev/null; then
        print_status "Frontend is ready"
        break
    fi
    if [ $i -eq 40 ]; then
        print_error "Frontend failed to start. Check logs: docker-compose logs frontend"
        exit 1
    fi
    echo -n "."
    sleep 3
done

# Print final status
echo ""
echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════════════"
echo "     ✅ All Services Started Successfully!"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo "🌐 Access Points:"
echo ""
echo -e "${CYAN}━━━ Frontend & API ━━━${NC}"
echo -e "  ${GREEN}Frontend:${NC}        http://localhost:3000"
echo -e "  ${GREEN}Backend API:${NC}     http://localhost:8000"
echo -e "  ${GREEN}API Docs:${NC}        http://localhost:8000/docs"
echo ""
echo -e "${CYAN}━━━ Data Services ━━━${NC}"
echo -e "  ${BLUE}PostgreSQL:${NC}      localhost:5432 (user: admin, pass: admin123)"
echo -e "  ${BLUE}PostgREST:${NC}       http://localhost:3001"
echo -e "  ${BLUE}Elasticsearch:${NC}   http://localhost:9200"
echo -e "  ${BLUE}Qdrant:${NC}          http://localhost:6333"
echo -e "  ${BLUE}Redis:${NC}           localhost:6379"
echo ""
echo -e "${CYAN}━━━ Management ━━━${NC}"
echo -e "  ${BLUE}Bytebase:${NC}        http://localhost:8080"
echo ""
echo -e "${YELLOW}━━━ Quick Commands ━━━${NC}"
echo "  docker-compose ps                # Check all services"
echo "  docker-compose logs -f backend   # View backend logs"
echo "  docker-compose logs -f frontend  # View frontend logs"
echo "  docker-compose restart backend   # Restart backend"
echo "  docker-compose down              # Stop all services"
echo "  ./run.sh                         # Restart everything"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
