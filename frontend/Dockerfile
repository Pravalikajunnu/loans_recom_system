FROM node:18-slim

WORKDIR /app

# Copy package descriptors and lockfile
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start server in dev mode for ease of developer inspect & hot reload
CMD ["npm", "run", "dev"]
