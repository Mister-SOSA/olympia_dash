# Use Node.js as base image
FROM public.ecr.aws/docker/library/node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app and bind to 0.0.0.0 to accept connections from any IP
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]