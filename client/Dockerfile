# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

RUN apk add --no-cache su-exec

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app

# --- Development ---
FROM base AS development

COPY client/package.json client/package-lock.json ./
RUN npm ci

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

EXPOSE 3000

# --- Production: static build + vite preview ---
FROM base AS production

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./

RUN npm run build \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "preview"]
