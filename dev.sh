#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Development mode script with hot reloading
echo -e "${CYAN}🚀 Starting E-commerce API in Development Mode with Hot Reloading...${NC}"
echo ""

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Check if ports are available
echo -e "${BLUE}🔍 Checking port availability...${NC}"
if ! check_port 3001; then
    echo -e "${RED}❌ Port 3001 is already in use. Please stop the service using that port.${NC}"
    exit 1
fi
if ! check_port 6379; then
    echo -e "${RED}❌ Port 6379 is already in use. Please stop the service using that port.${NC}"
    exit 1
fi
if ! check_port 9200; then
    echo -e "${RED}❌ Port 9200 is already in use. Please stop the service using that port.${NC}"
    exit 1
fi
if ! check_port 5601; then
    echo -e "${RED}❌ Port 5601 is already in use. Please stop the service using that port.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All ports are available${NC}"
echo ""

# Stop any existing containers
echo -e "${BLUE}🛑 Stopping any existing containers...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
docker-compose down 2>/dev/null || true

# Clean up any orphaned containers
echo -e "${BLUE}🧹 Cleaning up orphaned containers...${NC}"
docker container prune -f >/dev/null 2>&1 || true

# Build and start development environment
echo -e "${BLUE}🔨 Building and starting development environment...${NC}"
echo ""

# Start services in background
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"

# Function to wait for service health
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        case $service in
            "Redis")
                if docker exec ecommerce_redis_dev redis-cli ping >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service is ready${NC}"
                    return 0
                fi
                ;;
            "Elasticsearch")
                if curl -s http://localhost:$port/_cluster/health >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service is ready${NC}"
                    return 0
                fi
                ;;
            "API")
                if curl -s http://localhost:$port/api/v1/health >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service is ready${NC}"
                    return 0
                fi
                ;;
            *)
                if curl -s http://localhost:$port >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service is ready${NC}"
                    return 0
                fi
                ;;
        esac
        
        echo -e "${YELLOW}⏳ Waiting for $service... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service failed to start within expected time${NC}"
    return 1
}

# Wait for Redis
wait_for_service "Redis" 6379

# Wait for Elasticsearch
wait_for_service "Elasticsearch" 9200

# Wait for API
wait_for_service "API" 3001

echo ""
echo -e "${GREEN}🎉 Development environment started successfully!${NC}"
echo ""
echo -e "${CYAN}📋 Service Information:${NC}"
echo -e "${GREEN}  🌐 API:           http://localhost:3001${NC}"
echo -e "${GREEN}  📊 Kibana:        http://localhost:5601${NC}"
echo -e "${GREEN}  🔍 Elasticsearch: http://localhost:9200${NC}"
echo -e "${GREEN}  🔴 Redis:         localhost:6379${NC}"
echo ""
echo -e "${CYAN}📝 Development Features:${NC}"
echo -e "${GREEN}  ✅ Hot reloading enabled${NC}"
echo -e "${GREEN}  ✅ Code changes auto-reflect${NC}"
echo -e "${GREEN}  ✅ No rebuild needed for changes${NC}"
echo -e "${GREEN}  ✅ Volume mounting active${NC}"
echo ""
echo -e "${CYAN}🛠️  Useful Commands:${NC}"
echo -e "${GREEN}  📊 View logs:     docker-compose -f docker-compose.dev.yml logs -f${NC}"
echo -e "${GREEN}  🛑 Stop services: docker-compose -f docker-compose.dev.yml down${NC}"
echo -e "${GREEN}  🔄 Restart API:   docker-compose -f docker-compose.dev.yml restart api${NC}"
echo -e "${GREEN}  🧹 Clean up:     docker system prune -f${NC}"
echo ""

# Ask user if they want to see logs
echo -e "${YELLOW}📋 Would you like to view the API logs? (y/n):${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${CYAN}📊 Showing API logs (Press Ctrl+C to exit logs and return to shell):${NC}"
    echo -e "${YELLOW}💡 Tip: You can make code changes now and see them reload automatically!${NC}"
    echo ""
    docker-compose -f docker-compose.dev.yml logs -f api
else
    echo -e "${GREEN}✅ Development environment is running in the background${NC}"
    echo -e "${CYAN}💡 To view logs later, run: docker-compose -f docker-compose.dev.yml logs -f api${NC}"
fi
