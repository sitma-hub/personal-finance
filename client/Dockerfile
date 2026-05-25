# syntax=docker/dockerfile:1

FROM node:18-alpine AS base

RUN apk add --no-cache su-exec

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app

ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true

# --- Development ---
FROM base AS development

COPY client/package.json client/package-lock.json ./
RUN npm ci

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]

EXPOSE 3000

# --- Production: static build served by a minimal server or nginx ---
FROM base AS production

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./

RUN npm run build \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "start"]
