# ゲームサーバー デプロイ指示書

## 概要

TT のマルチプレイヤー機能を動かすため、`server/` ディレクトリの Node.js サーバーをデプロイしてください。
クライアント（GitHub Pages）からは WebSocket (`wss://`) で接続します。

---

## サーバー仕様

| 項目 | 値 |
|---|---|
| ランタイム | Node.js 22 |
| エントリポイント | `server/dist/index.js` |
| ポート | `PORT` 環境変数（デフォルト `2567`） |
| プロトコル | WebSocket (HTTP → WS upgrade) |
| ヘルスチェック | `GET /health` → `{"status":"ok"}` |

### エンドポイント一覧

| パス | 用途 | プロトコル |
|---|---|---|
| `/ws/game` | Open World マルチプレイ | WebSocket (カスタム) |
| `/` (root) | 缶蹴りミニゲーム | WebSocket (Colyseus) |
| `/health` | ヘルスチェック | HTTP GET |

### 通信内容

- **`/ws/game`**: 20Hz でバイナリ位置パケット送受信 + JSON チャット/アクション
- **`/` (Colyseus)**: 缶蹴りゲームの状態同期（2〜6人）

---

## ビルド手順

```bash
cd server
npm ci
npm run build    # TypeScript → dist/
npm start        # node dist/index.js
```

---

## Dockerfile（参考）

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 2567
CMD ["node", "dist/index.js"]
```

---

## Fly.io デプロイ（参考）

既存の WebTransport サーバー (`openworld-quic.fly.dev`) と同じ Fly.io を使う場合：

```toml
# fly.toml
app = "tt-game-server"
primary_region = "nrt"  # 東京

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "2567"

[http_service]
  internal_port = 2567
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 200
    soft_limit = 150

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

```bash
cd server
fly launch          # 初回
fly deploy          # 2回目以降
```

---

## デプロイ後にフロント側で必要な変更

デプロイ先の URL が確定したら、`src/scenes/OpenWorldScene.ts` の `getWsUrl()` を更新する：

```typescript
// 現状: ページと同じオリジンに接続（GitHub Pages では動かない）
private getWsUrl(): string {
  const params = new URLSearchParams(window.location.search);
  if (params.get("ws")) return params.get("ws")!;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws/game`;
}

// ↓ デプロイ後: デフォルトURLを差し替える
private getWsUrl(): string {
  const params = new URLSearchParams(window.location.search);
  if (params.get("ws")) return params.get("ws")!;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return `ws://${location.host}/ws/game`;
  }
  return "wss://<デプロイ先ホスト名>/ws/game";
}
```

---

## 動作確認

1. **ヘルスチェック**: `curl https://<デプロイ先>/health` → `{"status":"ok"}`
2. **WebSocket**: ブラウザから `?ws=wss://<デプロイ先>/ws/game` 付きで開く
3. **複数タブ**: 2つタブを開いて互いのキャラクターが見えること

---

## 注意事項

- WebSocket は **wss://** (TLS) 必須（GitHub Pages が HTTPS のため mixed content でブロックされる）
- CORS は不要（WebSocket は CORS の対象外）
- `auto_stop_machines = "stop"` にするとアイドル時にマシン停止 → コスト節約だが初回接続が遅い。常時稼働なら `"off"` に変更
- 依存パッケージ: `colyseus`, `@colyseus/ws-transport`, `express`, `ws`（すべて `server/package.json` に記載済み）
