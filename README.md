# AI 音乐社区 MVP

Next.js 全栈 AI 音乐社区，包含原创生成、参考音频翻唱、音乐广场、播放器、点赞收藏、榜单、积分消耗和 MVP 管理页。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000/music`。

## 生成接口

配置 `.env.local` 后会切换到 `suno-api.io` 真实生成适配器：

```bash
SUNO_API_BASE_URL=https://www.suno-api.io
SUNO_API_KEY=your-key
SUNO_MODEL=suno-v5-5
SUNO_CALLBACK_URL=https://example.com/api/suno-callback
SUNO_FORCE_MOCK=false
```

真实生成使用 `POST /api/v1/generate` 创建任务，再通过
`GET /api/v1/generate/record-info?taskId=...` 轮询结果。前端提交后会自动轮询约 2 分钟，拿到音频地址后自动发布到音乐广场。

如果需要离线演示，把 `SUNO_FORCE_MOCK=true` 写入 `.env.local`，系统会使用内置 MockProvider。

## 数据库

MVP 当前用内存 store 演示完整交互。Supabase 表结构草案在 `supabase/schema.sql`，后续可把 `src/lib/music/store.ts` 替换为 Supabase 实现，页面和 API 路由保持不变。

## 验证

```bash
npm run lint
npm test
npm run build
```
