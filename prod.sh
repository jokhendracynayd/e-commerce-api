#!/bin/bash

# Production mode script
echo "🚀 Starting E-commerce API in Production Mode..."

# Stop any existing containers
docker-compose down

# Build and start production environment
docker-compose up --build -d

echo "✅ Production environment started!"
echo "🌐 API available at: http://localhost:3001"
echo "📊 Kibana available at: http://localhost:5601"
echo "🔍 Elasticsearch available at: http://localhost:9200"
