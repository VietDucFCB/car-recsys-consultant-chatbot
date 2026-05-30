# Build stage — produce the static Vite bundle.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY . .
# VITE_API_URL is inlined at build time (Vite). Pass it as a build arg.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve stage — nginx serves the static bundle on $PORT (8080).
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
