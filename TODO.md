# Claude Code Slack Bot - TODO & トラブルシューティング記録

## 🎯 実装済み機能

### ✅ 基本実装
- [x] Slack App設定（Socket Mode）
- [x] 基本的なSlash Commandハンドラー
- [x] セッション管理（シングルトンパターン）
- [x] Claude Code連携機能
- [x] モーダルによるプロンプト入力
- [x] 出力フォーマッター（40K文字制限対応）

### ✅ 解決済みエラー

#### 1. `dispatch_failed`エラー
- **原因**: Socket Mode使用時にRequest URLが設定されていた
- **解決**: Slack AppのSlash CommandsでRequest URLを空欄に設定

#### 2. Claude Codeパスエラー
- **原因**: `/usr/local/bin/claude`が存在しない
- **解決**: 正しいパス`/home/monkey999/.nvm/versions/node/v20.15.0/bin/claude`に修正

#### 3. `not_in_channel`エラー
- **原因**: ボットがチャンネルに参加していない、またはDMでの実行
- **解決**: `say`を`respond`に変更し、`response_type: 'ephemeral'`を使用

#### 4. セッション取得エラー
- **原因**: 異なるSessionManagerインスタンスが作成されていた
- **解決**: SessionManagerをシングルトンパターンに変更

#### 5. TypeScriptビルドエラー
- **原因**: 型定義の不一致、未使用変数
- **解決**: 
  - Session interfaceにsendPromptメソッドを追加
  - 未使用importの削除
  - エラーハンドラーの型修正

## 🔧 現在の課題

### 1. Claude Codeレスポンスタイムアウト
- **症状**: `Timeout waiting for Claude response`
- **原因調査中**:
  - Claude Codeプロセスは正常に起動
  - プロンプトは送信成功
  - しかし応答が返ってこない
- **デバッグログ追加済み**:
  - stdout/stderr出力の詳細ログ
  - プロセス状態の追跡
  - stdin書き込みの確認

## 📋 今後のTODO

### 高優先度
1. **Claude Code通信問題の解決**
   - [ ] Claude Codeのインタラクティブモードの適切な処理
   - [ ] プロンプト終端文字の確認（改行コード問題？）
   - [ ] Claude Codeの初期化完了待機処理
   - [ ] 応答パターンの特定と適切な終了判定

2. **エラーハンドリング改善**
   - [ ] Claude Codeプロセスクラッシュ時の自動復旧
   - [ ] タイムアウト時の適切なエラーメッセージ
   - [ ] セッションタイムアウトの通知

### 中優先度
3. **機能拡張**
   - [ ] `/claude history` - 会話履歴表示
   - [ ] `/claude clear` - 会話履歴クリア
   - [ ] 複数セッション対応（チャンネルごと）
   - [ ] プロンプトテンプレート機能

4. **パフォーマンス改善**
   - [ ] Claude Code起動時間の短縮
   - [ ] メモリ使用量の最適化
   - [ ] 大規模出力の分割送信

### 低優先度
5. **運用改善**
   - [ ] 詳細なメトリクス収集
   - [ ] ヘルスチェックエンドポイント
   - [ ] 自動アップデート機能
   - [ ] 設定ファイル（YAML/JSON）対応

## 🐛 デバッグ用コマンド

```bash
# ログ確認
tail -f bot.log

# プロセス確認
ps aux | grep -E "(nodemon|ts-node|claude)"

# Claude Code直接テスト
claude --version
echo "test" | claude

# ボット再起動
npm run build && npm run dev:log
```

## 📝 注意事項

1. **環境変数の設定順序**
   - `SLACK_BOT_TOKEN`: xoxb-で始まる
   - `SLACK_APP_TOKEN`: xapp-で始まる
   - 逆に設定するとエラーになる

2. **Slack App設定**
   - Socket Mode: 有効
   - Request URL: 空欄（重要！）
   - Event Subscriptions: app_mention

3. **セッション管理**
   - 1ユーザー1セッション
   - 30分でタイムアウト（環境変数で設定可能）
   - セッションIDはUUID v4

## 🚀 次のステップ

1. Claude Code通信問題のデバッグ継続
2. より詳細なログ出力で原因特定
3. 必要に応じて通信方式の変更検討（例：--print オプション使用）