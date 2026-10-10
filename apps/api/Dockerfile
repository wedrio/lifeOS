FROM node:22-alpine

WORKDIR /app
# 国内构建加速：corepack 下载 pnpm、pnpm 安装依赖、prisma 下载引擎
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com \
    npm_config_registry=https://registry.npmmirror.com \
    PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
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
