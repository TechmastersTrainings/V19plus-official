# Base node image
FROM node:20-slim

# Install ffmpeg for video transcoding
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy root monorepo configs and workspaces
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/
COPY packages/config/package*.json ./packages/config/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies (monorepo root installs all workspace dependencies)
RUN npm ci

# Copy full monorepo source files
COPY . .

# Build the packages and the backend app
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils
RUN npm run build --workspace=apps/backend

# Expose port (Cloud Run sets process.env.PORT automatically)
EXPOSE 5000

# Start NestJS production build
CMD ["npm", "run", "start:prod", "--workspace=apps/backend"]
