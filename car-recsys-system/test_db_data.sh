#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "════════════════════════════════════════════════════════════════"
echo "     🔍 Database Data Test"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""

# Check if PostgreSQL container is running
if ! docker ps | grep -q car-recsys-postgres; then
    echo -e "${RED}✗${NC} PostgreSQL container is not running"
    echo "  Run: ./run.sh"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL container is running"
echo ""

# Test connection
echo -e "${BLUE}━━━ Testing Database Connection ━━━${NC}"
if docker exec car-recsys-postgres psql -U admin -d car_recsys -c "SELECT version();" &>/dev/null; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Cannot connect to database"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━ Checking Schemas ━━━${NC}"
docker exec car-recsys-postgres psql -U admin -d car_recsys -c "\dn" | grep -E "raw|silver|gold"
echo ""

echo -e "${BLUE}━━━ Checking Tables in Each Schema ━━━${NC}"
echo ""
echo -e "${YELLOW}RAW Schema:${NC}"
RAW_TABLES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'raw';" | xargs)
echo "  Tables count: $RAW_TABLES"
docker exec car-recsys-postgres psql -U admin -d car_recsys -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'raw' ORDER BY table_name;"

echo ""
echo -e "${YELLOW}SILVER Schema:${NC}"
SILVER_TABLES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'silver';" | xargs)
echo "  Tables count: $SILVER_TABLES"
docker exec car-recsys-postgres psql -U admin -d car_recsys -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'silver' ORDER BY table_name;"

echo ""
echo -e "${YELLOW}GOLD Schema:${NC}"
GOLD_TABLES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'gold';" | xargs)
echo "  Tables count: $GOLD_TABLES"
docker exec car-recsys-postgres psql -U admin -d car_recsys -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'gold' ORDER BY table_name;"

echo ""
echo -e "${BLUE}━━━ Checking Data Counts ━━━${NC}"
echo ""

# RAW schema
echo -e "${YELLOW}RAW Schema Data:${NC}"
USED_VEHICLES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.used_vehicles;" 2>/dev/null | xargs)
NEW_VEHICLES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.new_vehicles;" 2>/dev/null | xargs)
SELLERS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.sellers;" 2>/dev/null | xargs)
REVIEWS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.reviews_ratings;" 2>/dev/null | xargs)
FEATURES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.vehicle_features;" 2>/dev/null | xargs)
IMAGES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.vehicle_images;" 2>/dev/null | xargs)
RELATIONSHIPS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM raw.seller_vehicle_relationships;" 2>/dev/null | xargs)

echo "  used_vehicles: ${USED_VEHICLES:-0} rows"
echo "  new_vehicles: ${NEW_VEHICLES:-0} rows"
echo "  sellers: ${SELLERS:-0} rows"
echo "  reviews_ratings: ${REVIEWS:-0} rows"
echo "  vehicle_features: ${FEATURES:-0} rows"
echo "  vehicle_images: ${IMAGES:-0} rows"
echo "  seller_vehicle_relationships: ${RELATIONSHIPS:-0} rows"

# GOLD schema
echo ""
echo -e "${YELLOW}GOLD Schema Data:${NC}"
USERS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.users;" 2>/dev/null | xargs)
VEHICLES_RATINGS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.vehicles_with_ratings;" 2>/dev/null | xargs)
POPULAR=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.popular_vehicles;" 2>/dev/null | xargs)
FAVORITES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.user_favorites;" 2>/dev/null | xargs)
INTERACTIONS=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.user_interactions;" 2>/dev/null | xargs)
SEARCHES=$(docker exec car-recsys-postgres psql -U admin -d car_recsys -t -c "SELECT COUNT(*) FROM gold.user_searches;" 2>/dev/null | xargs)

echo "  users: ${USERS:-0} rows"
echo "  vehicles_with_ratings: ${VEHICLES_RATINGS:-0} rows"
echo "  popular_vehicles: ${POPULAR:-0} rows"
echo "  user_favorites: ${FAVORITES:-0} rows"
echo "  user_interactions: ${INTERACTIONS:-0} rows"
echo "  user_searches: ${SEARCHES:-0} rows"

echo ""
echo -e "${BLUE}━━━ Sample Data from raw.used_vehicles ━━━${NC}"
docker exec car-recsys-postgres psql -U admin -d car_recsys -c "SELECT id, brand, model, year, price, condition FROM raw.used_vehicles LIMIT 5;"

echo ""
echo -e "${BLUE}━━━ Summary ━━━${NC}"
TOTAL_RAW=$((${USED_VEHICLES:-0} + ${NEW_VEHICLES:-0} + ${SELLERS:-0} + ${REVIEWS:-0} + ${FEATURES:-0} + ${IMAGES:-0} + ${RELATIONSHIPS:-0}))
TOTAL_GOLD=$((${USERS:-0} + ${VEHICLES_RATINGS:-0} + ${POPULAR:-0} + ${FAVORITES:-0} + ${INTERACTIONS:-0} + ${SEARCHES:-0}))

echo "  Total rows in RAW schema: $TOTAL_RAW"
echo "  Total rows in GOLD schema: $TOTAL_GOLD"
echo ""

if [ "$TOTAL_RAW" -gt 0 ]; then
    echo -e "${GREEN}✓ Database has data!${NC}"
else
    echo -e "${RED}✗ Database is empty. Run: ./run.sh${NC}"
fi

echo ""
