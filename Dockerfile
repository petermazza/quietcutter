# Use Node.js base image
FROM node:20-slim

# Install FFmpeg with all codecs
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libavcodec-extra \
    && rm -rf /var/lib/apt/lists/*

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

# Verify public folder exists and show contents
RUN ls -la public/ && ls -la .next/standalone/

# Copy public folder to standalone (must happen AFTER build)
RUN cp -r /app/public /app/.next/standalone/public

# Copy static assets to standalone
RUN cp -r /app/.next/static /app/.next/standalone/.next/static

# Verify the copy worked
RUN ls -la /app/.next/standalone/public/

# Set working directory to standalone
WORKDIR /app/.next/standalone

# Set environment variables for Next.js standalone
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Expose port (Railway uses 8080)
EXPOSE 8080

# Start the standalone server
CMD ["node", "server.js"]
