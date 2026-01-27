# Use Node.js base image
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN yarn install

# Copy app source
COPY . .

# Build the app
RUN yarn build

# Copy public folder and static assets to standalone
RUN cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/

# Set working directory to standalone
WORKDIR /app/.next/standalone

# Expose port
EXPOSE 3000

# Start the standalone server
CMD ["node", "server.js"]
