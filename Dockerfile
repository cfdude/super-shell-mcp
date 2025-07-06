# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create logs directory
RUN mkdir -p logs

# Copy package files first for better caching
COPY package*.json ./

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build the project (compiles TypeScript and sets executable permissions)
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev && npm cache clean --force

# Ensure the built file is executable
RUN chmod +x build/index.js

# Expose stdio for MCP communication
# Note: MCP servers typically communicate via stdio, not network ports

# Set the entrypoint to the built application
ENTRYPOINT ["node", "build/index.js"]