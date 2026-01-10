# Testing Guide - Car Recommendation System

## Quick Start

### 1. Start All Services
```bash
chmod +x run-dev.sh
./run-dev.sh
```

### 2. Verify Backend is Running
```bash
# Health check
curl http://localhost:8000/health

# Expected: {"status":"healthy","version":"1.0.0","environment":"development"}
```

### 3. Test API Endpoints

#### Search Vehicles
```bash
# Get all vehicles (first page)
curl "http://localhost:8000/api/v1/search?page=1&page_size=10"

# Search by brand
curl "http://localhost:8000/api/v1/search?brand=Toyota"

# Search with price filter
curl "http://localhost:8000/api/v1/search?price_min=10000&price_max=30000"
```

#### Get Popular Vehicles (Recommendations)
```bash
curl "http://localhost:8000/api/v1/reco/popular?limit=10"
```

#### Get Similar Vehicles
```bash
# Replace VEHICLE_ID with actual vehicle_id from your data
curl "http://localhost:8000/api/v1/reco/similar/VEHICLE_ID?limit=5"
```

#### Get Vehicle Details
```bash
curl "http://localhost:8000/api/v1/listing/VEHICLE_ID"
```

### 4. Test Authentication

#### Register a new user
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
# Save the access_token from response
```

#### Get Personalized Recommendations (requires auth)
```bash
curl -X GET "http://localhost:8000/api/v1/reco/personalized" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Test Interactions (requires auth)

#### Track a view interaction
```bash
curl -X POST http://localhost:8000/api/v1/interactions/track \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VEHICLE_ID",
    "interaction_type": "view",
    "interaction_score": 1.0
  }'
```

#### Add to favorites
```bash
curl -X POST http://localhost:8000/api/v1/interactions/favorites \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VEHICLE_ID"
  }'
```

## Frontend Testing

1. Open http://localhost:3000 in browser
2. You should see:
   - Homepage with hero section
   - Popular categories
   - Featured vehicles (loaded from API)
3. Click on a vehicle to see detail page
4. Use search to filter vehicles
5. Login to access personalized recommendations

## Troubleshooting

### Database not loading data
```bash
# Run ETL manually
docker-compose exec etl-worker python load_complete_database.py

# Check postgres logs
docker-compose logs postgres
```

### Backend errors
```bash
# Check backend logs
docker-compose logs backend -f
```

### Frontend not connecting to API
```bash
# Verify VITE_API_URL
docker-compose exec frontend printenv | grep VITE

# Restart frontend
docker-compose restart frontend
```

### Check database tables
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U admin -d car_recsys

# List schemas
\dn

# List tables in raw schema
\dt raw.*

# Query vehicles
SELECT COUNT(*) FROM raw.used_vehicles;
SELECT vehicle_id, brand, car_model, price FROM raw.used_vehicles LIMIT 5;
```

## API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
