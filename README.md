# Claude Code Slack Bot

SlackからClaude Codeを操作するボットアプリケーション。

## セットアップ手順

### 1. 環境変数の設定

`.env`ファイルを編集し、Slack Appで取得したトークンを設定します：

```bash
# .envファイルを編集
nano .env

# 以下の値を設定
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_APP_TOKEN=xapp-YOUR-APP-TOKEN
SLACK_SIGNING_SECRET=YOUR-SIGNING-SECRET
```

### 2. ビルドと起動

```bash
# TypeScriptをビルド
npm run build

# 開発モードで起動（ホットリロード有効）
npm run dev

# 本番モードで起動
npm start
```

## systemdサービスとして起動（推奨）

1. サービスファイルを作成：

```bash
sudo nano /etc/systemd/system/claude-slack.service
```

2. 以下の内容を貼り付け（USERNAMEを自分のユーザー名に変更）：

```ini
[Unit]
Description=Claude Code Slack Bot
After=network.target

[Service]
Type=simple
User=USERNAME
WorkingDirectory=/home/USERNAME/develop/claudecode-slack
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

3. サービスを有効化して起動：

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-slack
sudo systemctl start claude-slack
```

4. ステータス確認：

```bash
sudo systemctl status claude-slack
journalctl -u claude-slack -f
```

## 使い方

Slackで以下のコマンドを使用：

- `/claude start` - 新しいセッションを開始
- `/claude prompt` - プロンプトを送信（モーダル表示）
- `/claude status` - セッション状態を確認
- `/claude restart` - Claude Codeを再起動
- `/claude end` - セッションを終了

または、ボットにメンションすることでヘルプを表示できます。

## トラブルシューティング

### ボットが応答しない場合

1. 環境変数が正しく設定されているか確認
2. Slack Appの権限が正しく設定されているか確認
3. Socket Modeが有効になっているか確認
4. ログを確認：`journalctl -u claude-slack -n 100`

### Claude Codeが見つからない場合

`.env`ファイルの`CLAUDE_CODE_PATH`を確認：

```bash
which claude
# 出力されたパスを.envに設定
```