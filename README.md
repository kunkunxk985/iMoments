# iMoments · 拾光房间

主题瞬间共创与互动打榜摄影画廊 Web 应用（React 19 + TypeScript + Vite 8 + Deno Edge Function + PostgreSQL）。

## 目录架构

```text
iMoments/
├── src/                      # 前端源码（唯一前端业务目录）
│   ├── main.tsx              # 浏览器渲染入口
│   ├── App.tsx               # 顶层路由壳、全局身份同步与弹窗挂载
│   ├── api.ts                # 后端 REST 客户端、类型契约与直传进度封装
│   ├── pages/                # 一级路由页面
│   │   ├── Plaza.tsx         # 首页公开探索广场与已解锁私密房
│   │   └── Room.tsx          # 房间详情页（展签头图、子栏筛选、画廊/榜单切换）
│   ├── features/             # 房间核心展示与重交互模块
│   │   ├── Gallery.tsx       # 自适应摄影瀑布流与单/双图居中画框
│   │   ├── Leaderboard.tsx   # 金银铜领奖台、票数排行与 AI 展览手记
│   │   ├── Lightbox.tsx      # 全屏大图灯箱、60 MB 分片按需拼接、SHA-256 校验与盖楼短评
│   │   └── StageScreen.tsx   # 16:9 现场流光投屏大屏（二维码进房 + 实时弹幕流）
│   ├── dialogs/              # 独立模态弹窗
│   │   ├── DialogShell.tsx   # 基于 Radix Dialog 的统一弹窗骨架
│   │   ├── CreateRoom.tsx    # 创办拾光活动（AI 自动填表 + 云端 AI 实时原创随机灵感）
│   │   ├── Upload.tsx        # 上传瞬间（AI 命题审图 + 60 MB 自动分片无损上传）
│   │   ├── AccountDialog.tsx # 跨设备唯一账号注册/登录与自定义头像裁剪
│   │   ├── CodeGate.tsx      # 4 位数字口令解锁私密房
│   │   ├── PosterDialog.tsx  # 九宫格蒙太奇分享海报生成
│   │   └── CreditsDialog.tsx # 样板房间摄影作品署名说明
│   ├── components/           # 全站复用的原子 UI 组件
│   │   ├── Nav.tsx           # 顶部极简画廊导航栏
│   │   ├── RoomCard.tsx      # 广场房间展签卡片
│   │   ├── bits.tsx          # 头像、选票点阵、勋章、空状态与加载器
│   │   └── Toaster.tsx       # 全局轻提示通知容器
│   ├── lib/                  # 纯前端工具函数（无 UI 耦合）
│   │   ├── image.ts          # 缩略图生成、色彩遥测、9 MB 切片与 SHA-256 计算
│   │   ├── visitor.ts        # 访客 UUID、跨设备会话 Token 与本地口令缓存
│   │   ├── router.ts         # Hash 路由与查询参数状态同步
│   │   ├── copy.ts           # 剪贴板复制与分享链接构造
│   │   └── aiFallback.ts     # 样板数据旁白与离线 AI 语义兜底引擎
│   ├── config/               # 静态业务配置
│   │   ├── theme.ts          # 5 套点缀色主题与 3 种互动赛制定义
│   │   └── credits.ts        # 预置示例图版权信息
│   └── styles/               # 样式与设计系统
│       ├── globals.css       # Tailwind 入口与亮/暗中性画廊设计变量（Tokens）
│       └── gallery.css       # 画廊排版、组件样式与响应式规则
├── functions/                # 云端后端（Qoder Sites Deno Edge Function）
│   ├── index.ts              # Deno.serve 生产环境入口（注入云数据库与对象存储）
│   ├── routes.mjs            # 全站 REST API 路由、鉴权、投票幂等与分片字节校验
│   ├── ai.mjs                # 云端大模型（智谱 GLM / OpenAI 兼容）+ 视觉遥测双引擎
│   ├── account.mjs           # PBKDF2-SHA256 密码哈希与账号字段校验
│   ├── auth.mjs              # 平台可信用户上下文解析
│   └── seed.mjs              # 首次访问自动播种 5 个样板摄影房间
├── schema.sql                # PostgreSQL 数据库表结构（rooms / moments / moment_parts / accounts 等）
├── public/                   # 静态资源与样板房间预置图片（/seed/*）
├── dev/                      # 本地零配置内存数据库与对象存储模拟器（不参与线上发布）
├── scripts/                  # Node 版本检查与 Vite 生产构建脚本
└── vendor/                   # Tailwind v4 基础样式依赖
```

## 本地开发与构建

```sh
npm ci
npm run dev      # 启动本地内存后端(8000) + Vite 前端热更新，浏览器打开 /__local/ 可切换测试身份
npm run build    # TypeScript 类型检查 + 生成生产静态包至 dist/
```

## 线上部署与环境变量（Qoder Sites）

线上发布仅上传前端构建产物 `dist/` 与云函数目录 `functions/`，数据库按 `schema.sql` 增量迁移。

如需启用真实大模型策展、随机灵感与拍立得旁白，在 Qoder 站点设置中配置以下环境变量并在 `prepare_site.secretNames` 中声明：

- `OPENAI_API_KEY`：模型服务 API Key（如智谱 BigModel）
- `AI_BASE_URL`：`https://open.bigmodel.cn/api/paas/v4/chat/completions`
- `AI_MODEL`：`glm-4-flash-250414`
