#!/bin/bash

# Almanac Startup Script
# Starts the Next.js application with all necessary setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================="
echo "       Almanac Startup Script"
echo "========================================="
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
echo -e "${YELLOW}Checking for Node.js...${NC}"
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo -e "${YELLOW}Visit: https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check for npm
echo -e "${YELLOW}Checking for npm...${NC}"
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version) found${NC}"

# Check if .env exists
echo -e "\n${YELLOW}Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}⚠️  A .env file has been created for you.${NC}"
    echo -e "${YELLOW}Please edit .env and add your API keys before running again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .env file found${NC}"

# Check if API keys are configured
if grep -q "PASTE_YOUR" .env; then
    echo -e "${YELLOW}⚠️  Warning: Some API keys in .env need to be configured${NC}"
    echo -e "${YELLOW}   Please replace PASTE_YOUR_*_HERE with actual keys${NC}"
    echo -e "${YELLOW}   You can continue, but some features may not work${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Check for Prisma
echo -e "\n${YELLOW}Checking database...${NC}"
if [ -d "prisma" ]; then
    # Generate Prisma Client
    echo -e "${YELLOW}Generating Prisma Client...${NC}"
    npx prisma generate

    # Run migrations if needed
    if [ ! -f "dev.db" ]; then
        echo -e "${YELLOW}Setting up database...${NC}"
        npx prisma migrate dev --name init
        echo -e "${GREEN}✅ Database initialized${NC}"
    else
        echo -e "${GREEN}✅ Database exists${NC}"
        # Check for pending migrations
        echo -e "${YELLOW}Checking for database migrations...${NC}"
        npx prisma migrate deploy 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}⚠️  No Prisma schema found, skipping database setup${NC}"
fi

# Check if course_scanner is set up
echo -e "\n${YELLOW}Checking Course Scanner tool...${NC}"
if [ -d "course_scanner" ]; then
    if [ ! -f "course_scanner/.env" ]; then
        echo -e "${YELLOW}⚠️  course_scanner/.env not found${NC}"
        echo -e "${YELLOW}   Course Scanner may not work without GEMINI_API_KEY${NC}"
    elif grep -q "PASTE_YOUR" course_scanner/.env; then
        echo -e "${YELLOW}⚠️  GEMINI_API_KEY not configured in course_scanner/.env${NC}"
    else
        echo -e "${GREEN}✅ Course Scanner configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Course Scanner directory not found${NC}"
fi

# Start the development server
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}🚀 Starting Almanac Development Server${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "\n${YELLOW}Application will be available at:${NC}"
echo -e "${GREEN}   http://localhost:3000${NC}\n"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}\n"

# Start Next.js dev server
npm run dev
