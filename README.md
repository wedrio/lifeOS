# lifeOS

一个人生管理系统：自律打卡 · 记账 · 资产登记 · 日常记录，一个主面板总览一切。

**多端**：Windows 桌面端 · 网页端 · Android 手机端（不含 iOS）——一套代码，三端一致。
**存储**：自有云服务器 PostgreSQL（+ pgvector，后期向量化），多端实时同步。

## 设计文档

- 📋 [01 · 详细设计（需求扩展）](docs/01-详细设计.md)
- 🏗️ [02 · 程序设计与架构（多端 + 云存储版）](docs/02-程序设计与架构.md)

## 板块

| 板块 | 说明 |
|------|------|
| 🎯 自律 | 习惯打卡（连续天数 + 热力图）、日/周/月/年四级计划 |
| 💰 记账 | 每笔收支登记、分类/账户/预算、报表 |
| 📦 资产 | 实物设备 + VIP/订阅账号，到期提醒 |
| 📔 日常 | 朋友圈式时间线记录（文字 + 图片） |
| 🏠 主面板 | 今日计划 / 今日支出 / 即将到期订阅 总览 |

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
- ⏭️ **下一项：A1 记账闭环（Mock）** — 分类、账户、记一笔、流水、预算与报表。

实现路线图见 [docs/02](docs/02-程序设计与架构.md) 第 12 节。
