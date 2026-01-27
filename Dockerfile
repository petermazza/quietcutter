# Use Node.js base image
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy app source
COPY . .

# Build the app
RUN yarn build

# Expose port
EXPOSE 3000

# Start the app
CMD ["yarn", "start"]
