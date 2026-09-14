FROM node:22-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @lifeos/api prisma:generate && pnpm --filter @lifeos/api build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@lifeos/api", "start"]
