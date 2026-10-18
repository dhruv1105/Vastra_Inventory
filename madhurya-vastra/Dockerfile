# Madhurya Vastra app image.
#   target dev    → `next dev` with the source bind-mounted (docker-compose.dev.yml)
#   target runner → small production image from Next's standalone output (default)

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/db ./db
COPY --from=build --chown=app:app /app/scripts ./scripts
# The migrator runs before the server and is not part of the traced standalone bundle.
COPY --from=build --chown=app:app /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=app:app /app/lib/auth/password.mjs /app/lib/auth/staff.mjs ./lib/auth/
RUN mkdir -p public/uploads && chown app:app public/uploads
USER app
EXPOSE 3000
# Apply pending migrations, then start. Seeds never run automatically in production.
# First owner: docker compose exec app node scripts/create-owner.mjs --name "…" --phone …
CMD ["sh", "-c", "node scripts/db.mjs migrate && node server.js"]
