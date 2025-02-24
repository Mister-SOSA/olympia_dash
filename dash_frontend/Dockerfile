# Use Node.js as base image
FROM node:22.14.0

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Build the Next.js app while ignoring TypeScript and ESLint errors
RUN npm run build || true

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]