#!/bin/bash

# 🚗 Car Recommendation System - Auto Setup Script
# This script automatically sets up the entire system with data

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "════════════════════════════════════════════════════════════════"
echo "     🚗 Car Recommendation System - Auto Setup"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if Docker is installed
echo ""
print_info "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_status "Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_status "Docker Compose is installed"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi
print_status "Python 3 is installed"

# Install Python dependencies
echo ""
print_info "Installing Python dependencies..."
pip install -q pandas psycopg2-binary 2>/dev/null || {
    print_error "Failed to install Python dependencies"
    exit 1
}
print_status "Python dependencies installed"

# Stop any existing containers
echo ""
print_info "Stopping any existing containers..."
docker-compose down 2>/dev/null || true
print_status "Existing containers stopped"

# Start fresh containers
echo ""
print_info "Starting PostgreSQL, PostgREST, and Bytebase..."
docker-compose up -d postgres postgrest bytebase

# Wait for PostgreSQL to be ready
echo ""
print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U admin &>/dev/null; then
        print_status "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 1
done

# Additional wait to ensure PostgreSQL is fully initialized
sleep 5

# Create database schemas
echo ""
print_info "Creating database schemas..."

if docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/01-init-bytebase.sql &>/dev/null; then
    print_status "Bytebase user created"
else
    print_error "Failed to create Bytebase user"
    exit 1
fi

if docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/02-create-schema.sql &>/dev/null; then
    print_status "Base schemas created"
else
    print_error "Failed to create base schemas"
    exit 1
fi

if docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/04-create-all-tables.sql &>/dev/null; then
    print_status "All tables created"
else
    print_error "Failed to create tables"
    exit 1
fi

# Load data
echo ""
print_info "Loading data from CSV files..."
print_info "This may take 3-5 minutes for ~720,000 rows..."

if python3 load_complete_database.py 2>&1 | tee setup.log | grep -q "SUCCESS"; then
    print_status "Data loaded successfully"
else
    print_error "Failed to load data. Check setup.log for details."
    exit 1
fi

# Verify data
echo ""
print_info "Verifying data integrity..."
python3 check_db_status.py

# Print access information
echo ""
echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════════════"
echo "     ✅ Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo "You can now access:"
echo ""
echo -e "  ${BLUE}PostgREST API:${NC}"
echo "    http://localhost:3001"
echo "    Example: curl http://localhost:3001/used_vehicles?limit=5"
echo ""
echo -e "  ${BLUE}Bytebase (Database UI):${NC}"
echo "    http://localhost:8080"
echo "    Connect to: postgres:5432"
echo "    User: bytebase_admin / bytebase123"
echo ""
echo -e "  ${BLUE}PostgreSQL:${NC}"
echo "    Host: localhost:5432"
echo "    Database: car_recsys"
echo "    User: admin / admin123"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker-compose ps              # Check containers"
echo "  docker-compose logs postgres   # View logs"
echo "  docker-compose down            # Stop all services"
echo "  ./reset_database.sh            # Reset & reload data"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
