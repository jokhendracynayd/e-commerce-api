#!/bin/bash

# API Performance Monitoring Script
# Usage: ./monitor-performance.sh

echo "🚀 E-Commerce API Performance Monitor"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check API health
check_health() {
    echo -e "\n${BLUE}📊 Health Check${NC}"
    echo "----------------"
    
    local health_response=$(curl -s http://localhost:3001/api/v1/health)
    local status=$(echo $health_response | grep -o '"data":{"status":"[^"]*"' | cut -d'"' -f6)
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✅ API Status: Healthy${NC}"
    else
        echo -e "${RED}❌ API Status: Unhealthy${NC}"
    fi
}

# Function to get metrics
get_metrics() {
    echo -e "\n${BLUE}📈 Performance Metrics${NC}"
    echo "----------------------"
    
    local metrics=$(curl -s http://localhost:3001/api/v1/health/metrics)
    
    # Extract key metrics
    local uptime=$(echo $metrics | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    local memory_rss=$(echo $metrics | grep -o '"rss":"[^"]*"' | cut -d'"' -f4)
    local memory_heap=$(echo $metrics | grep -o '"heapUsed":"[^"]*"' | cut -d'"' -f4)
    local users=$(echo $metrics | grep -o '"users":[0-9]*' | cut -d':' -f2)
    local products=$(echo $metrics | grep -o '"products":[0-9]*' | cut -d':' -f2)
    local orders=$(echo $metrics | grep -o '"orders":[0-9]*' | cut -d':' -f2)
    
    echo "⏱️  Uptime: ${uptime}s"
    echo "💾 Memory RSS: $memory_rss"
    echo "🧠 Heap Used: $memory_heap"
    echo "👥 Users: $users"
    echo "📦 Products: $products"
    echo "🛒 Orders: $orders"
}

# Function to check container status
check_containers() {
    echo -e "\n${BLUE}🐳 Container Status${NC}"
    echo "-------------------"
    
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep ecommerce
}

# Function to analyze recent logs
analyze_logs() {
    echo -e "\n${BLUE}📋 Recent Activity${NC}"
    echo "------------------"
    
    # Count requests in last 10 minutes
    local recent_requests=$(docker logs ecommerce_api --since 10m 2>/dev/null | grep -c "Request Completed")
    echo "📊 Requests (last 10min): $recent_requests"
    
    # Check for errors
    local recent_errors=$(docker logs ecommerce_api --since 10m 2>/dev/null | grep -c "ERROR")
    if [ "$recent_errors" -gt 0 ]; then
        echo -e "${RED}❌ Errors (last 10min): $recent_errors${NC}"
    else
        echo -e "${GREEN}✅ No errors in last 10 minutes${NC}"
    fi
}

# Function to check response times
check_response_times() {
    echo -e "\n${BLUE}⏱️ Response Time Test${NC}"
    echo "---------------------"
    
    local start_time=$(date +%s%3N)
    curl -s http://localhost:3001/api/v1/health > /dev/null
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response_time" -lt 100 ]; then
        echo -e "${GREEN}✅ Response Time: ${response_time}ms (Excellent)${NC}"
    elif [ "$response_time" -lt 500 ]; then
        echo -e "${YELLOW}⚠️  Response Time: ${response_time}ms (Good)${NC}"
    else
        echo -e "${RED}❌ Response Time: ${response_time}ms (Slow)${NC}"
    fi
}

# Function to monitor continuously
monitor_continuous() {
    echo -e "\n${BLUE}🔄 Continuous Monitoring${NC}"
    echo "Press Ctrl+C to stop"
    echo "---------------------"
    
    while true; do
        clear
        echo "🚀 E-Commerce API Performance Monitor - $(date)"
        echo "================================================"
        
        check_health
        get_metrics
        check_containers
        analyze_logs
        check_response_times
        
        echo -e "\n${YELLOW}Refreshing in 30 seconds...${NC}"
        sleep 30
    done
}

# Main menu
case "${1:-menu}" in
    "health")
        check_health
        ;;
    "metrics")
        get_metrics
        ;;
    "containers")
        check_containers
        ;;
    "logs")
        analyze_logs
        ;;
    "response")
        check_response_times
        ;;
    "continuous"|"monitor")
        monitor_continuous
        ;;
    "menu"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  health      - Check API health"
        echo "  metrics     - Get performance metrics"
        echo "  containers  - Check container status"
        echo "  logs        - Analyze recent logs"
        echo "  response    - Test response time"
        echo "  continuous  - Continuous monitoring"
        echo "  monitor     - Alias for continuous"
        echo ""
        echo "Examples:"
        echo "  $0 health"
        echo "  $0 continuous"
        ;;
esac
