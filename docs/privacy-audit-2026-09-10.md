# 开源前隐私 / 安全审计报告（2026-09-10）

> 范围：`src/content/` 全部笔记、`nginx.conf`、`Dockerfile`、`mise.toml`、构建配置。
> 性质：**只登记不清理**（用户指示）。清理动作在开源决策落地时执行。

## 结论概览

| 级别 | 发现 | 规模 |
| ---- | ---- | ---- |
| 🔴 必须处理 | 真实公网 IP `112.26.45.227` | 30 处 / 4 篇 docker 笔记 |
| 🔴 必须处理 | 公司项目实名 `cnsig`（cnsig-ems-ui / cnsig-ems-boot / /home/cnsig） | 145 处 / docker 系列多篇 |
| 🟡 建议处理 | 内网拓扑：k8s Pod/Service IP（10.244.0.11、10.96.3.7）、内网主机（10.20.0.5、10.0.0.5）、后端端口 21080 | 约 10 处 |
| 🟡 建议处理 | 个人身份：git 笔记中的真实提交示例（renguoqiang \<dittorenard@outlook.com\>）、pnpm 笔记中的 `/Users/ren/` 本机路径 | 约 3 处 |
| ✅ 无风险 | nexus.corp.com / registry.corp / bastion.corp.com（.corp.com 为示例风格域名）、user@host / git@github.com 教学占位、无任何密码/密钥/token 泄漏 | — |

## 明细清单

### 🔴 1. 真实公网 IP `112.26.45.227`

出现在部署教学的真实命令与输出中：

- `docker/basics/deploy-pipeline`（1 处）
- `docker/deploy/deploy-script-anatomy`（8 处）
- `docker/registry/offline-transfer`（3 处）
- `docker/registry/image-container-registry`（18 处）

风险：公网 IP 可被端口扫描与地理定位，暴露自建服务器攻击面。
建议替换：`203.0.113.x`（RFC 5737 文档专用段，TEST-NET-3）或 `example.server.ip`。

### 🔴 2. 公司项目实名 `cnsig`（145 处）

镜像名（`cnsig-ems-ui:1.0.1`）、后端服务（`cnsig-ems-boot:21080/admin-api`）、容器路径（`/home/cnsig/cnsig-ems-ui`）、部署目标（`scp root@node:/home/app/cnsig-ems-ui/`）。集中于 `docker/basics/deploy-pipeline`、`docker/dockerfile/*`、`docker/deploy/*`。

风险：披露任职公司/内部项目命名与部署拓扑（nginx → 后端 21080 → admin-api 前缀），存在雇佣关系关联与合规风险。
建议替换：`demo-web` / `demo-api` 风格的通用名，路径改 `/home/app/demo-web`。

### 🟡 3. 内网拓扑（约 10 处）

- `container-debug-502`：`10.244.0.11`（Pod 网段）、`10.96.3.7`（Service 网段）——虽是 RFC1918 私网段，但真实网段规划本身是拓扑信息
- `offline-transfer` / `jump-host`：`10.20.0.5`、`10.0.0.5`（ssh root@ 直连）
- `nginx-conf-anatomy`：后端端口 `21080` 多处

建议替换：Pod/Service 用 `10.244.0.x`→保留段位但改尾号亦可，或统一 `10.10.0.x` 假想段；端口改 `:8080` 通用值。

### 🟡 4. 个人身份（约 3 处）

- `git/object-model/content-addressing`：`author renguoqiang <dittorenard@outlook.com>` 真实提交示例（与 git 提交身份一致，开源后公开关联——若接受此关联则无需处理）
- `package-management/pnpm-structure`：`/Users/ren/Library/pnpm/store`（macOS 本机路径，含用户名）

建议替换：示例作者改 `Zhang San <zhangsan@example.com>`；路径改 `/Users/you/...`。

## 附注：git 历史

以上内容同样存在于 **git 提交历史**中。开源若需彻底清除，届时二选一：

1. `git filter-repo` 替换历史中的敏感字符串（保留提交历史）
2. 以当前清理后的树为初始提交重新起步（丢弃历史，最干净）

此决策属开源执行期动作，本报告不处理。
