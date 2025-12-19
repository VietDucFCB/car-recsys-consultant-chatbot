#!/bin/bash
echo "=== Test Username Login System ==="
echo ""

# Test 1: Register with username
echo "1. Register new user with username:"
curl -s -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "duc123",
    "email": "duc123@example.com",
    "password": "test123",
    "full_name": "Duc Nguyen"
  }' | python3 -m json.tool | head -20

echo ""
echo ""

# Test 2: Login with username
echo "2. Login with username:"
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "duc123",
    "password": "test123"
  }' | python3 -m json.tool | head -20

echo ""
echo ""

# Test 3: Login with email  
echo "3. Login with email:"
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "duc123@example.com",
    "password": "test123"
  }' | python3 -m json.tool | head -20

echo ""
echo "=== Done ===" 
