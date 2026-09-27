# Base node image
FROM node:20-slim

# Install ffmpeg for video transcoding
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy all package.json files for workspace resolution
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/
COPY packages/config/package*.json ./packages/config/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies
RUN npm ci

# Copy full source
COPY . .

# Build shared packages and backend
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils
RUN npm run build --workspace=apps/backend

# Expose port
EXPOSE 4000

# Start production server
CMD ["npm", "run", "start:prod", "--workspace=apps/backend"]
