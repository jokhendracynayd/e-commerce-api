#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Development helper script
show_menu() {
    echo -e "${CYAN}🛠️  E-commerce API Development Helper${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 📊 View API logs"
    echo -e "${GREEN}2.${NC} 🔄 Restart API service"
    echo -e "${GREEN}3.${NC} 🧪 Test API health"
    echo -e "${GREEN}4.${NC} 📈 View all service logs"
    echo -e "${GREEN}5.${NC} 🗄️  Database operations"
    echo -e "${GREEN}6.${NC} 🧹 Clean up Docker resources"
    echo -e "${GREEN}7.${NC} 📋 Show service status"
    echo -e "${GREEN}8.${NC} 🔍 Check service health"
    echo -e "${GREEN}9.${NC} 🚀 Quick restart all services"
    echo -e "${GREEN}0.${NC} ❌ Exit"
    echo ""
}

test_api_health() {
    echo -e "${BLUE}🧪 Testing API health...${NC}"
    if curl -s http://localhost:3001/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API is healthy${NC}"
        echo -e "${CYAN}📊 Health response:${NC}"
        curl -s http://localhost:3001/api/v1/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/v1/health
    else
        echo -e "${RED}❌ API is not responding${NC}"
    fi
    echo ""
}

show_service_status() {
    echo -e "${BLUE}📋 Service Status:${NC}"
    echo ""
    docker-compose -f docker-compose.dev.yml ps
    echo ""
}

check_service_health() {
    echo -e "${BLUE}🔍 Checking service health...${NC}"
    echo ""
    
    # Check Redis
    if docker exec ecommerce_redis_dev redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis: Healthy${NC}"
    else
        echo -e "${RED}❌ Redis: Unhealthy${NC}"
    fi
    
    # Check Elasticsearch
    if curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Elasticsearch: Healthy${NC}"
    else
        echo -e "${RED}❌ Elasticsearch: Unhealthy${NC}"
    fi
    
    # Check API
    if curl -s http://localhost:3001/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API: Healthy${NC}"
    else
        echo -e "${RED}❌ API: Unhealthy${NC}"
    fi
    
    # Check Kibana
    if curl -s http://localhost:5601 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Kibana: Healthy${NC}"
    else
        echo -e "${RED}❌ Kibana: Unhealthy${NC}"
    fi
    echo ""
}

database_operations() {
    echo -e "${CYAN}🗄️  Database Operations:${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 📊 View database status"
    echo -e "${GREEN}2.${NC} 🔄 Reset database"
    echo -e "${GREEN}3.${NC} 📈 Run migrations"
    echo -e "${GREEN}4.${NC} 🔙 Back to main menu"
    echo ""
    read -p "Choose option: " db_choice
    
    case $db_choice in
        1)
            echo -e "${BLUE}📊 Database Status:${NC}"
            docker exec ecommerce_api_dev npx prisma db status
            ;;
        2)
            echo -e "${YELLOW}⚠️  This will reset the database. Are you sure? (y/n):${NC}"
            read -r confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                docker exec ecommerce_api_dev npx prisma migrate reset --force
            fi
            ;;
        3)
            echo -e "${BLUE}📈 Running migrations...${NC}"
            docker exec ecommerce_api_dev npx prisma migrate deploy
            ;;
        4)
            return
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            ;;
    esac
    echo ""
}

cleanup_docker() {
    echo -e "${YELLOW}🧹 Cleaning up Docker resources...${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 🧹 Clean containers"
    echo -e "${GREEN}2.${NC} 🗑️  Clean images"
    echo -e "${GREEN}3.${NC} 💾 Clean volumes"
    echo -e "${GREEN}4.${NC} 🧽 Full cleanup"
    echo -e "${GREEN}5.${NC} 🔙 Back to main menu"
    echo ""
    read -p "Choose option: " cleanup_choice
    
    case $cleanup_choice in
        1)
            docker container prune -f
            ;;
        2)
            docker image prune -f
            ;;
        3)
            docker volume prune -f
            ;;
        4)
            docker system prune -af
            ;;
        5)
            return
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            ;;
    esac
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Choose an option: " choice
    
    case $choice in
        1)
            echo -e "${CYAN}📊 Showing API logs (Press Ctrl+C to exit):${NC}"
            docker-compose -f docker-compose.dev.yml logs -f api
            ;;
        2)
            echo -e "${BLUE}🔄 Restarting API service...${NC}"
            docker-compose -f docker-compose.dev.yml restart api
            echo -e "${GREEN}✅ API service restarted${NC}"
            ;;
        3)
            test_api_health
            ;;
        4)
            echo -e "${CYAN}📈 Showing all service logs (Press Ctrl+C to exit):${NC}"
            docker-compose -f docker-compose.dev.yml logs -f
            ;;
        5)
            database_operations
            ;;
        6)
            cleanup_docker
            ;;
        7)
            show_service_status
            ;;
        8)
            check_service_health
            ;;
        9)
            echo -e "${BLUE}🚀 Quick restarting all services...${NC}"
            docker-compose -f docker-compose.dev.yml restart
            echo -e "${GREEN}✅ All services restarted${NC}"
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done
