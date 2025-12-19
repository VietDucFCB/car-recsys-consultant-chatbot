#!/bin/bash
echo "=== Quick Auth Test ==="
echo ""

# Clean up existing user first
echo "1. Register new test user:"
curl -s -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "quicktest@example.com",
    "password": "test123",
    "full_name": "Quick Test"
  }' | python3 -m json.tool

echo ""
echo ""
echo "2. Login:"
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "quicktest@example.com",
    "password": "test123"
  }' | python3 -m json.tool

echo ""
echo "=== Done ===" 