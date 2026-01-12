# Frontend Dockerfile for Vite + React
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb* ./
COPY package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Environment variable for API
ENV VITE_API_URL=http://localhost:8000

# Development mode - run with hot reload
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3000"]
