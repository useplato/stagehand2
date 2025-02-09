# Use Node.js LTS (Long Term Support) image as base
FROM node:20-slim

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package.json ./

# Install dependencies while explicitly avoiding platform-specific builds
RUN npm install --no-optional --legacy-peer-deps --omit=optional
RUN npm install @rollup/rollup-linux-x64-gnu

# Copy the rest of the application code
COPY . .

RUN npm run build-dom-scripts
RUN npm run build-js
RUN npm run build-types

# Expose the port your server will run on (adjust if needed)
EXPOSE 3000

# Start the server
CMD npx tsx evals/eval_api_server.ts
