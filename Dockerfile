# Use a slim Python base image (similar size philosophy to node:alpine)
FROM python:3.11-slim

# Environment
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Create app directory
WORKDIR /app

# System deps for shells (bash/zsh) + ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash zsh ca-certificates locales \
 && rm -rf /var/lib/apt/lists/*

# Create logs directory like before
RUN mkdir -p logs

# Install runtime Python dependencies (MCP SDK etc.)
# Add more here if your project needs them
RUN pip install --no-cache-dir mcp

# Copy your Python source code
COPY src ./src
COPY examples ./examples 2>/dev/null || true
COPY run.sh ./run.sh 2>/dev/null || true

# Make run.sh executable if you use it
RUN [ -f run.sh ] && chmod +x run.sh || true

# For dev/test builds
FROM python:3.11-slim AS dev
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends bash zsh ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY your_pkg ./your_pkg
COPY tests ./tests
ENTRYPOINT ["pytest", "-q"]

# Entrypoint: run MCP server on stdio
ENTRYPOINT ["python", "-m", "main.py"]
