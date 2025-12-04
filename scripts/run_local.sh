#!/bin/bash

# MedAssist Local Development Script
# Starts all microservices for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    MedAssist - Medicine Delivery Platform      ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Error: Python 3 is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Python $(python3 --version)${NC}"
    
    # Check MongoDB
    if ! command -v mongod &> /dev/null; then
        echo -e "${YELLOW}Warning: MongoDB is not installed locally. Ensure it's accessible via MONGODB_URI${NC}"
    else
        echo -e "${GREEN}✓ MongoDB installed${NC}"
    fi
    
    # Check Redis
    if ! command -v redis-server &> /dev/null; then
        echo -e "${YELLOW}Warning: Redis is not installed locally. Ensure it's accessible via REDIS_URI${NC}"
    else
        echo -e "${GREEN}✓ Redis installed${NC}"
    fi
    
    echo ""
}

# Load environment variables
load_env() {
    if [ -f "$BACKEND_DIR/.env" ]; then
        export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
        echo -e "${GREEN}✓ Environment variables loaded${NC}"
    elif [ -f "$BACKEND_DIR/.env.example" ]; then
        echo -e "${YELLOW}Warning: .env not found, using .env.example${NC}"
        export $(grep -v '^#' "$BACKEND_DIR/.env.example" | xargs)
    else
        echo -e "${RED}Error: No environment file found${NC}"
        exit 1
    fi
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # Install shared module
    echo "Installing shared module..."
    cd "$BACKEND_DIR/shared" && npm install --silent
    
    # Install Node.js services
    for service in auth-service user-order-service search-service notification-worker; do
        echo "Installing $service..."
        cd "$BACKEND_DIR/$service" && npm install --silent
    done
    
    # Install Python services
    for service in pharmacist-service driver-service; do
        echo "Installing $service..."
        cd "$BACKEND_DIR/$service" && pip install -r requirements.txt -q
    done
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Start a Node.js service
start_node_service() {
    local service=$1
    local port=$2
    echo -e "${BLUE}Starting $service on port $port...${NC}"
    cd "$BACKEND_DIR/$service"
    npm start &
    sleep 2
}

# Start a Python service
start_python_service() {
    local service=$1
    local port=$2
    echo -e "${BLUE}Starting $service on port $port...${NC}"
    cd "$BACKEND_DIR/$service"
    python3 -m uvicorn main:app --host 0.0.0.0 --port "$port" &
    sleep 2
}

# Start all services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    echo ""
    
    # Start Node.js services
    start_node_service "auth-service" "${AUTH_SERVICE_PORT:-3001}"
    start_node_service "user-order-service" "${USER_ORDER_SERVICE_PORT:-3002}"
    start_node_service "search-service" "${SEARCH_SERVICE_PORT:-3003}"
    start_node_service "notification-worker" "${NOTIFICATION_WORKER_PORT:-3004}"
    
    # Start Python services
    start_python_service "pharmacist-service" "${PHARMACIST_SERVICE_PORT:-8001}"
    start_python_service "driver-service" "${DRIVER_SERVICE_PORT:-8002}"
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  All services started successfully!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "Services running:"
    echo -e "  • Auth Service:         http://localhost:${AUTH_SERVICE_PORT:-3001}"
    echo -e "  • User Order Service:   http://localhost:${USER_ORDER_SERVICE_PORT:-3002}"
    echo -e "  • Search Service:       http://localhost:${SEARCH_SERVICE_PORT:-3003}"
    echo -e "  • Notification Worker:  http://localhost:${NOTIFICATION_WORKER_PORT:-3004}"
    echo -e "  • Pharmacist Service:   http://localhost:${PHARMACIST_SERVICE_PORT:-8001}"
    echo -e "  • Driver Service:       http://localhost:${DRIVER_SERVICE_PORT:-8002}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    pkill -f "node.*auth-service" 2>/dev/null || true
    pkill -f "node.*user-order-service" 2>/dev/null || true
    pkill -f "node.*search-service" 2>/dev/null || true
    pkill -f "node.*notification-worker" 2>/dev/null || true
    pkill -f "uvicorn.*pharmacist-service" 2>/dev/null || true
    pkill -f "uvicorn.*driver-service" 2>/dev/null || true
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Handle Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    check_prerequisites
    load_env
    
    # Parse command line arguments
    case "${1:-}" in
        --install|-i)
            install_deps
            ;;
        --start|-s)
            start_services
            wait
            ;;
        *)
            install_deps
            start_services
            wait
            ;;
    esac
}

main "$@"
