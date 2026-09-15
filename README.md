# lifeOS

一个人生管理系统：自律打卡 · 行动计划 · 纸质阅读 · 记账 · 资产登记 · 日常记录，一个主面板总览一切。

**多端**：Windows 桌面端 · 网页端 · Android 手机端（不含 iOS）——一套代码，三端一致。
**存储**：自有云服务器 PostgreSQL（+ pgvector，后期向量化），多端实时同步。

## 设计文档

- 📋 [01 · 详细设计（需求扩展）](docs/01-详细设计.md)
- 🏗️ [02 · 程序设计与架构（多端 + 云存储版）](docs/02-程序设计与架构.md)

## 板块

| 板块 | 说明 |
|------|------|
| 🎯 自我生长 | 习惯打卡（连续天数 + 热力图）、四级行动计划、**纸质阅读书架（拟物书封 + 翻书打卡 + 书摘复盘）** |
| 💰 记账理财 | 每笔收支登记、分类/账户/预算、财务报表 |
| 📦 资产订阅 | 实物设备 + VIP/订阅账号，保修与到期分档提醒 |
| 📔 日常瞬间 | 朋友圈式图文时间线记录（支持关联打卡/计划/账单/书籍） |
| 🏠 主面板 | 今日计划 / 在读书籍 / 今日支出 / 即将到期订阅 总览 |

## 技术栈

- 前端：React 18 · TypeScript · Vite · Ant Design 5 · Zustand
- 数据访问：Repository 抽象（Mock 先行，后期切远程）
- 多端外壳：Tauri 2（Windows 桌面 / Android，备选 Electron / Capacitor）
- 后端（接入阶段）：Node.js · Fastify · Prisma
- 数据库（接入阶段）：PostgreSQL 16 + pgvector（备选 MySQL，不推荐：缺原生向量能力）
- 部署（接入阶段）：云服务器 · Docker Compose · Caddy（自动 HTTPS）
- 工程：pnpm monorepo

## 开发策略

Mock 先行：第一阶段不接数据库，用 Mock 数据把全量功能跑通验收；预留 Repository 数据接口，后期统一接入真实数据库。

## 本地开发

```bash
corepack enable
pnpm install
pnpm dev       # Web 开发服务器
pnpm typecheck # TypeScript 契约与应用检查
pnpm lint
pnpm build
```

## 状态

- ✅ **A0：工程骨架已完成** — pnpm monorepo、共享实体/Repository/Zod 契约、localStorage MockDataSource、响应式 Web 布局与完整页面路由已就绪。
- ✅ **A1：记账闭环（Mock）已完成** — 内置与自定义分类、账户管理、收入/支出 CRUD、流水筛选、月度/分类预算、12 月趋势/分类占比/账户余额报表，以及一键演示数据。
- ✅ **A2：自律闭环（Mock）已完成** — 习惯 CRUD、今天打卡/取消、补打限制、连续天数与年度热力图；年/月/周/日四级计划、关联上级、进度/状态/排序，以及可配置的未完成日计划自动结转。
- ✅ **A3：资产闭环（Mock）已完成** — 实物资产与订阅 / VIP 的 CRUD、保修和到期日 30/7/3/1 分档提示、自动续费信息、实物估值与订阅月均 / 年度统计，以及演示资产。
- ✅ **A4：日常闭环（Mock）已完成** — 时间线与按月日历浏览、文字 / 最多 9 张图片、心情 / 天气 / 地点 / 标签、关联打卡 / 账单 / 资产，以及本地图片压缩与演示日常。
- ✅ **A5：主面板聚合与备份已完成** — 今日计划 / 习惯 / 支出 / 预算 / 到期提醒 / 最近动态总览、直接完成今日计划、全量演示数据、主题与计划偏好、Mock JSON 导入 / 导出 / 合并 / 清空。
- 🚧 **A6：纸质阅读书架（设计已完成）** — 纸质书 CRUD、CSS 拟物精装书封（不强制传图）、翻书页码打卡、读书笔记与页码关联书摘、年度阅读挑战进度。

## 第二阶段 B：真实数据源接入

- 🚧 **B1 后端骨架已准备** — `apps/api` 提供 Fastify 5、统一错误包络、JWT + 刷新令牌认证服务、Prisma 身份持久化端口与 PostgreSQL 数据模型；业务资源 API 与 `RemoteDataSource` 将在后续项逐步接入。

### 启动本地 API 骨架

```bash
# 1. 启动 PostgreSQL + pgvector

docker compose up -d db

# 2. 配置环境变量，并生成 Prisma Client / 创建数据库迁移
cp apps/api/.env.example apps/api/.env
pnpm prisma:generate
pnpm --filter @lifeos/api prisma:migrate

# 3. 启动 API
pnpm dev:api
```

本地 API 健康检查为 `GET /health`；在 Prisma Client 尚未生成时健康检查仍可用，认证请求会明确返回 `503 PERSISTENCE_UNAVAILABLE`，避免误写入数据。

实现路线图见 [docs/02](docs/02-程序设计与架构.md) 第 12 节。
