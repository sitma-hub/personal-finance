# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

RUN apk add --no-cache su-exec

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app

# --- Development: bind-mounted source, deps in a named volume ---
FROM base AS development

COPY server/package.json server/package-lock.json ./
RUN npm ci

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

EXPOSE 5000

# --- Production: self-contained image, no bind mounts ---
FROM base AS production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./

RUN npm run build \
  && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
