# 部署到腾讯云服务器（单机 Docker）

## 0. 前提

| 项 | 要求 |
|----|------|
| 服务器 | 已装 Docker + Docker Compose v2（`docker compose version` 可用） |
| 域名（建议） | A 记录解析到服务器 IP；Caddy 据此自动签发 HTTPS |
| 腾讯云安全组 | 只放行 **22 / 80 / 443**（5432、3000 一律不放） |
| 代码 | 服务器可访问 GitHub（私有仓库用 PAT，见下） |

> 无域名时可临时 `SITE_ADDRESS=:80` 走 HTTP（仅测试用）。

## 1. 拉取代码

私有仓库需要一个只读 Personal Access Token（GitHub → Settings → Developer settings → Tokens，勾 `repo`）：

```bash
git clone https://<你的PAT>@github.com/wedrio/lifeOS.git
cd lifeOS
```

**分支选择**：数据库切片在 `feature/db-slice-habits`（基于 `feature/android-shell`）。
推荐先把 PR #7 → #8 合并进 `main`，然后在服务器 `git checkout main && git pull`；
急着部署也可以直接 `git checkout feature/db-slice-habits`。

## 2. 配置

```bash
cp deploy/.env.prod.example deploy/.env.prod
vim deploy/.env.prod      # 填域名/密码/JWT_SECRET（openssl rand -base64 32）
chmod 600 deploy/.env.prod
```

## 3. 启动

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

首次会构建 api/web 镜像并预拉依赖，需几分钟。`db` 是 compose 自带的
pgvector 容器（数据卷 `lifeos-postgres-prod`，不映射任何公网端口）。

## 4. 建表（全新数据卷，一次性）

```bash
docker compose -f deploy/docker-compose.prod.yml exec api \
  sh -c "cd apps/api && pnpm exec prisma migrate deploy"
```

> 服务器上旧的 `pgvector` 容器与本套部署互不影响（旧库当前无业务数据）。
> 若想把旧库数据搬过来：`pg_dump` 旧库 → `docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U lifeos lifeos < dump.sql`。

## 5. 验证

```bash
curl https://<域名>/api/health
# {"status":"ok","service":"lifeos-api","persistence":"configured"}
```

浏览器打开 `https://<域名>` → 网页端即云端数据；桌面/手机端打包时
用 `VITE_DATA_SOURCE=remote` + `VITE_API_BASE_URL=https://<域名>` 构建。

## 6. 备份（建议 cron）

```bash
bash deploy/backup.sh
# crontab -e 每天凌晨 3 点：
# 0 3 * * * cd /path/to/lifeOS && bash deploy/backup.sh >> deploy/backups/backup.log 2>&1
```

## 7. 常用运维

```bash
docker compose -f deploy/docker-compose.prod.yml ps          # 状态
docker compose -f deploy/docker-compose.prod.yml logs -f api # API 日志
git pull && docker compose -f deploy/docker-compose.prod.yml up -d --build   # 更新
docker compose -f deploy/docker-compose.prod.yml down        # 停止（数据卷保留）
```

## 常见问题

- **证书签发失败**：确认域名已解析到本机、80/443 已放行；Caddy 首次签发需要几分钟。
- **登录后不久掉线**：确认 `ACCESS_TOKEN_TTL=7d`（Tauri 端跨站拿不到 refresh cookie）。
- **CORS 报错**：`CORS_ORIGIN` 需含 `https://tauri.localhost,http://tauri.localhost`。
