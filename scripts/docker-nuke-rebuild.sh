#!/bin/bash
# =============================================================================
# Docker Nuke & Rebuild Script
# =============================================================================
# Purpose: Complete cleanup and rebuild of the Docker development environment
# Usage: ./scripts/docker-nuke-rebuild.sh [--keep-db]
#
# Options:
#   --keep-db    Preserve PostgreSQL data volume (default: destroy everything)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

KEEP_DB=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --keep-db)
            KEEP_DB=true
            shift
            ;;
    esac
done

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Docker Environment Nuke & Rebuild${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Phase 1: Stop containers
echo -e "${YELLOW}🛑 Phase 1: Stopping all containers...${NC}"
docker compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}   ✓ Containers stopped${NC}"

# Phase 2: Clean Docker volumes
echo -e "${YELLOW}🗑️  Phase 2: Cleaning Docker volumes...${NC}"
if [ "$KEEP_DB" = true ]; then
    echo -e "${BLUE}   (Keeping database volume)${NC}"
    # Remove only app-related volumes
    docker volume rm reftofund_node_modules_dev 2>/dev/null || true
    docker volume rm reftofund_next_cache_dev 2>/dev/null || true
    docker volume rm reftofund_redis_data_dev 2>/dev/null || true
else
    echo -e "${RED}   ⚠️  Destroying ALL volumes including database${NC}"
    docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
fi
echo -e "${GREEN}   ✓ Volumes cleaned${NC}"

# Phase 3: Prune Docker system
echo -e "${YELLOW}🧹 Phase 3: Pruning Docker system...${NC}"
docker system prune -f 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo -e "${GREEN}   ✓ Docker system pruned${NC}"

# Phase 4: Clean local files
echo -e "${YELLOW}📂 Phase 4: Cleaning local build artifacts...${NC}"

# Fix permissions first (in case of root-owned files from container)
if [ -d ".next" ]; then
    sudo chown -R $USER:$USER .next 2>/dev/null || true
    rm -rf .next
    echo -e "${GREEN}   ✓ Removed .next directory${NC}"
fi

# Clean node_modules if they exist locally (shouldn't in Docker setup)
if [ -d "node_modules" ] && [ ! -L "node_modules" ]; then
    echo -e "${BLUE}   Cleaning local node_modules (not typical for Docker setup)...${NC}"
    rm -rf node_modules
    echo -e "${GREEN}   ✓ Removed node_modules${NC}"
fi

# Clean Turbopack cache
rm -rf /tmp/next-panic-*.log 2>/dev/null || true
echo -e "${GREEN}   ✓ Cleaned Turbopack panic logs${NC}"

# Phase 5: Rebuild with no cache
echo -e "${YELLOW}🏗️  Phase 5: Rebuilding images with --no-cache...${NC}"
docker compose -f docker-compose.dev.yml build --no-cache
echo -e "${GREEN}   ✓ Images rebuilt${NC}"

# Phase 6: Start services
echo -e "${YELLOW}🚀 Phase 6: Starting services...${NC}"
docker compose -f docker-compose.dev.yml up -d
echo -e "${GREEN}   ✓ Services started${NC}"

# Phase 7: Wait for health checks
echo -e "${YELLOW}⏳ Phase 7: Waiting for services to be healthy...${NC}"
sleep 5

# Check container status
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Container Status${NC}"
echo -e "${BLUE}============================================${NC}"
docker compose -f docker-compose.dev.yml ps

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ✅ Environment Ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Access the app at: ${BLUE}http://localhost:3000${NC}"
echo -e "Prisma Studio:     ${BLUE}http://localhost:5555${NC}"
echo ""
echo -e "${YELLOW}📋 To view logs:${NC}"
echo -e "   docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo -e "${YELLOW}📋 To view app logs only:${NC}"
echo -e "   docker compose -f docker-compose.dev.yml logs -f app"
echo ""

# Ask if user wants to tail logs
read -p "Would you like to tail the logs now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose -f docker-compose.dev.yml logs -f
fi
