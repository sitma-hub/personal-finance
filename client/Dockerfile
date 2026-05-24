FROM node:18-alpine

WORKDIR /app

ARG UID=1000
ARG GID=1000

RUN addgroup -g $GID -S nodejs && \
    adduser -S nodejs -u $UID

# Create non-root user first
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nodejs -u 1001

# Change ownership of /app directory
RUN chown nodejs:nodejs /app

# Copy package files and install dependencies as nodejs user
COPY --chown=nodejs:nodejs package*.json ./
USER nodejs
RUN npm install

# Copy source code as nodejs user
COPY --chown=nodejs:nodejs . .

# Set environment variables to disable ESLint caching
ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
