# Claude Code Slack Bot 設計書

## 1. 概要
自宅PC（WSL2）上で動作するClaude Codeを、Slackから操作・通知する統合システムの設計書。

## 2. システム構成

### 2.1 技術スタック
- **実装言語**: Node.js + TypeScript
- **Slackフレームワーク**: Slack Bolt SDK (Socket Mode)
- **通信方式**: WebSocket (Socket Mode)
- **Claude Code連携**: 子プロセス実行

### 2.2 選定理由
- **Socket Mode採用**: ポート開放不可の制約に対応
- **TypeScript**: 型安全性とClaude Codeとの親和性
- **Bolt SDK**: Slack公式SDKで豊富な機能とドキュメント

## 3. アーキテクチャ

### 3.1 システム構成図
```
┌─────────────┐     WebSocket      ┌──────────────────┐     Child Process    ┌─────────────────┐
│  Slack App  │ ◄─────────────────► │ Slack Bot Server │ ◄──────────────────► │ Claude Code CLI │
└─────────────┘                     └──────────────────┘                      └─────────────────┘
                                           (WSL2)
```

### 3.2 主要コンポーネント
1. **Slack Bot Server**: Socket Mode経由でSlackイベントを受信・処理
2. **Session Manager**: Claude Codeセッションのライフサイクル管理
3. **Command Handler**: Slashコマンドの解析と実行
4. **Output Formatter**: 出力の40K文字制限処理とファイル添付

## 4. 詳細設計

### 4.1 ディレクトリ構成
```
claudecode-slack/
├── src/
│   ├── index.ts              # メインエントリポイント
│   ├── slack/
│   │   ├── app.ts           # Slack App初期化
│   │   ├── commands.ts      # Slashコマンドハンドラ
│   │   └── modals.ts        # モーダルUI定義
│   ├── claude/
│   │   ├── session.ts       # セッション管理クラス
│   │   └── executor.ts      # Claude Code実行ラッパー
│   └── utils/
│       └── formatter.ts     # 出力フォーマッター
├── .env                     # 環境変数
├── .env.example            # 環境変数サンプル
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 Slashコマンド仕様

| コマンド | 説明 | 動作 |
|---------|------|------|
| `/claude start` | セッション開始 | 新規Claude Codeセッションを作成 |
| `/claude prompt` | プロンプト送信 | モーダルを表示し、プロンプト入力を受付 |
| `/claude status` | 状態確認 | 現在のセッション状態を表示 |
| `/claude restart` | 再起動 | Claude Codeプロセスを再起動 |
| `/claude end` | セッション終了 | 現在のセッションを終了 |

### 4.3 セッション管理
- **セッションID**: Slack UserIDベースで生成
- **同時実行制限**: 1ユーザー1セッション
- **タイムアウト**: 30分間操作なしで自動終了
- **状態管理**: idle, processing, error

### 4.4 出力処理仕様
1. **40K文字以内**: 通常のメッセージとして返信
2. **40K-1MB**: テキストスニペットとして添付
3. **1MB以上**: ファイルとして添付（最大1GB）

## 5. Slack App設定

### 5.1 必要な権限（OAuth Scopes）
- **Bot Token Scopes**:
  - `commands`: Slashコマンドの受信
  - `chat:write`: メッセージ送信
  - `files:write`: ファイルアップロード
  - `app_mentions:read`: メンション受信

### 5.2 App-Level Token
- **スコープ**: `connections:write`
- **用途**: Socket Mode接続

### 5.3 イベントサブスクリプション
- `app_mention`: ボットへのメンション検知

## 6. 環境構築

### 6.1 必要なパッケージ
```json
{
  "dependencies": {
    "@slack/bolt": "^3.x.x",
    "dotenv": "^16.x.x"
  },
  "devDependencies": {
    "@types/node": "^20.x.x",
    "typescript": "^5.x.x",
    "ts-node": "^10.x.x",
    "nodemon": "^3.x.x"
  }
}
```

### 6.2 環境変数
```bash
# Slack設定
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# Claude Code設定
CLAUDE_CODE_PATH=/usr/local/bin/claude

# アプリケーション設定
SESSION_TIMEOUT_MINUTES=30
MAX_OUTPUT_LENGTH=40000
```

### 6.3 インストールコマンド
```bash
# プロジェクト初期化
npm init -y

# 依存関係インストール
npm install @slack/bolt dotenv
npm install --save-dev @types/node typescript ts-node nodemon

# TypeScript設定
npx tsc --init
```

## 7. セキュリティ設計

### 7.1 認証・認可
- Slack署名検証（Signing Secret）
- ユーザーID/チャンネルIDによるアクセス制御

### 7.2 データ保護
- 環境変数によるトークン管理
- .gitignoreでの機密情報除外
- ログからのセンシティブ情報除去

### 7.3 プロセス分離
- Claude Codeは独立プロセスで実行
- 標準入出力経由での通信
- プロセス異常終了時の自動リカバリ

## 8. 運用設計

### 8.1 起動方法
```bash
# 開発環境
npm run dev

# 本番環境
npm run start
```

### 8.2 systemdサービス化（推奨）
```ini
[Unit]
Description=Claude Code Slack Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/claudecode-slack
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 8.3 監視項目
- プロセス死活監視
- メモリ使用量
- セッション数
- エラーレート

## 9. 実装スケジュール

1. **Phase 1**: 基本機能実装（1-2日）
   - Slack App設定
   - 基本的なコマンドハンドラ
   - Claude Code実行機能

2. **Phase 2**: セッション管理（1日）
   - セッション作成・削除
   - タイムアウト処理
   - 状態管理

3. **Phase 3**: 出力処理（1日）
   - 40K文字制限対応
   - ファイル添付機能
   - エラーハンドリング

4. **Phase 4**: テスト・改善（1日）
   - 統合テスト
   - エラー処理改善
   - ドキュメント整備

## 10. 今後の拡張案
- マルチユーザー対応
- コマンド履歴機能
- 定期実行機能
- Webhookによる外部連携