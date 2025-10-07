#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Olympia Dashboard in Development Mode...${NC}\n"

# Check if api/.env exists
if [ ! -f "api/.env" ]; then
    echo -e "${RED}Error: api/.env file not found!${NC}"
    echo "Please create api/.env from env.example and configure your database settings."
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${RED}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start the backend
echo -e "${GREEN}Starting Flask Backend on http://localhost:5001...${NC}"
cd api && python3 app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start the frontend
echo -e "${GREEN}Starting Next.js Frontend on http://localhost:3000...${NC}"
cd dash_frontend && npm run dev &
FRONTEND_PID=$!

echo -e "\n${BLUE}================================${NC}"
echo -e "${GREEN}✓ Backend running at: http://localhost:5001${NC}"
echo -e "${GREEN}✓ Frontend running at: http://localhost:3000${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "\nPress ${RED}Ctrl+C${NC} to stop both services.\n"

# Wait for both processes
wait
