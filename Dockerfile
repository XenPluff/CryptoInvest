# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node-runtime
# Official PostgreSQL 17 tools match the hosted database. The entrypoint below
# launches only AUREON; PostgreSQL itself remains the separate managed service.
FROM postgres:17-bookworm
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && groupadd --gid 1000 node && useradd --uid 1000 --gid node --create-home node
ENTRYPOINT []
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json .npmrc ./
# The optional CA mount supports managed cloud proxies without weakening TLS.
# The application toolchain is installed once and retained for operator scripts.
RUN --mount=type=secret,id=environment_ca,uid=1000,gid=1000 \
    if [ -f /run/secrets/environment_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/environment_ca; fi; \
    NPM_CONFIG_CACHE=/tmp/aureon-build-npm npm ci --ignore-scripts --fetch-timeout=30000 --fetch-retries=1 && rm -rf /tmp/aureon-build-npm
COPY --chown=node:node . .
ARG API_INTERNAL_URL=http://127.0.0.1:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build && rm -rf .next/cache && touch .env
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["npm", "start"]
