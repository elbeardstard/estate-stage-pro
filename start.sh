#!/bin/bash

# Estate Stage Pro - Local Development Startup Script
# Usage: ./start.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ESTATE STAGE PRO - Local Dev${NC}"
echo -e "${GREEN}========================================${NC}"

# Check for backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Creating backend/.env from template...${NC}"
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "${RED}⚠ Please edit backend/.env and add your API keys:${NC}"
    echo -e "   ANTHROPIC_API_KEY (for staging descriptions)"
    echo -e "   GEMINI_API_KEY (for image generation)"
    exit 1
fi

# Check if keys are set
if grep -q "your_" "$BACKEND_DIR/.env" || grep -q "xxxxx" "$BACKEND_DIR/.env"; then
    echo -e "${RED}⚠ Please update backend/.env with real API keys${NC}"
    exit 1
fi

# Create frontend .env if needed
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo "VITE_API_URL=http://localhost:8000" > "$FRONTEND_DIR/.env"
fi

# Setup Python venv if needed
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${GREEN}Creating Python virtual environment...${NC}"
    python3 -m venv "$BACKEND_DIR/venv"
fi

# Install backend deps
echo -e "${GREEN}Installing backend dependencies...${NC}"
source "$BACKEND_DIR/venv/bin/activate"
pip install -q -r "$BACKEND_DIR/requirements.txt"

# Install frontend deps if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${GREEN}Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR"
    npm install
fi

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting backend...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
python main.py &
BACKEND_PID=$!

sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   App running!${NC}"
echo -e "${GREEN}   Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}   Backend:  http://localhost:8000${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop${NC}\n"

wait
