FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set PORT automatically)
EXPOSE ${PORT:-3001}

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]

