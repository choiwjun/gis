# 🚀 Cloudflare Pages デプロイガイド

このガイドでは、GIS Web App を Cloudflare Pages にデプロイする手順を説明します。

## 📋 前提条件

- Cloudflare アカウント
- GitHub リポジトリ: https://github.com/choiwjun/gis
- Wrangler CLI インストール済み

## 🔧 ステップ 1: Cloudflare D1 データベースの作成

### 1.1 本番データベース作成

```bash
# D1 データベースを作成
wrangler d1 create webapp-production
```

実行結果から `database_id` をコピーしてください：

```
✅ Successfully created DB 'webapp-production'!

[[d1_databases]]
binding = "DB"
database_name = "webapp-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← これをコピー
```

### 1.2 wrangler.toml の更新

`wrangler.toml` ファイルの `database_id` を更新：

```toml
[[d1_databases]]
binding = "DB"
database_name = "webapp-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← ペースト
```

### 1.3 マイグレーション適用

```bash
# 本番データベースにマイグレーションを適用
npm run db:migrate:prod
```

## 🪣 ステップ 2: Cloudflare R2 バケットの作成

```bash
# R2 バケットを作成
wrangler r2 bucket create webapp-geodata
```

## 🔐 ステップ 3: 環境変数の設定

### 3.1 JWT Secret の設定

本番環境用の強力なシークレットキーを生成：

```bash
# ランダムな秘密鍵を生成 (例)
openssl rand -base64 32
```

生成されたキーを Cloudflare Pages にセット：

```bash
wrangler pages secret put JWT_SECRET --project-name webapp
# プロンプトで生成したキーを入力
```

### 3.2 .dev.vars ファイル (ローカル開発用)

`.dev.vars` ファイルを作成（.gitignore に含まれています）：

```env
JWT_SECRET=your-local-development-secret-key
```

## 📦 ステップ 4: Cloudflare Pages プロジェクトの作成

### 4.1 Cloudflare Dashboard から作成

1. Cloudflare Dashboard にログイン: https://dash.cloudflare.com/
2. **Workers & Pages** > **Create application** をクリック
3. **Pages** タブを選択
4. **Connect to Git** をクリック
5. GitHub リポジトリ `choiwjun/gis` を選択

### 4.2 ビルド設定

**Build settings:**
- **Framework preset**: None
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

**Environment variables:**
- `NODE_VERSION`: `18`

### 4.3 Bindings の設定

Cloudflare Dashboard で以下の Bindings を追加：

**D1 Database:**
- Variable name: `DB`
- D1 database: `webapp-production`

**R2 Bucket:**
- Variable name: `R2`
- R2 bucket: `webapp-geodata`

### 4.4 デプロイ

**Save and Deploy** をクリックしてデプロイを開始します。

## 🖥️ ステップ 5: CLI からのデプロイ (代替方法)

### 5.1 Pages プロジェクト作成

```bash
# Pages プロジェクトを作成
wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2025-12-01
```

### 5.2 ビルドとデプロイ

```bash
# ビルド
npm run build

# デプロイ
wrangler pages deploy dist --project-name webapp
```

### 5.3 Bindings の設定

デプロイ後、Cloudflare Dashboard で Bindings を手動で設定する必要があります。

## ✅ ステップ 6: デプロイ確認

### 6.1 URL の確認

デプロイが完了すると、以下のような URL が発行されます：

- **本番**: `https://webapp.pages.dev`
- **プレビュー**: `https://[commit-hash].webapp.pages.dev`

### 6.2 動作確認

1. ブラウザでデプロイされた URL にアクセス
2. ログインページが表示されることを確認
3. 以下の認証情報でログイン：
   - Email: `admin@example.com`
   - Password: `admin123`
4. 地図が正常に表示されることを確認
5. データセット一覧が表示されることを確認

### 6.3 API 動作確認

```bash
# Health check
curl https://webapp.pages.dev/api/health

# ログインテスト
curl -X POST https://webapp.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## 🔄 継続的デプロイ

GitHub に push すると、Cloudflare Pages が自動的に以下を実行します：

- `main` ブランチ → 本番環境に自動デプロイ
- その他のブランチ → プレビュー環境を作成

## 🛠️ トラブルシューティング

### ビルドエラー

**問題**: `wrangler.toml not found`
**解決**: `wrangler.toml` がリポジトリのルートにあることを確認

**問題**: `D1 database not found`
**解決**: 
1. D1 データベースが作成されているか確認
2. `wrangler.toml` の `database_id` が正しいか確認
3. Cloudflare Dashboard で Bindings が設定されているか確認

### ランタイムエラー

**問題**: `JWT_SECRET is undefined`
**解決**: Environment Variables で `JWT_SECRET` が設定されているか確認

**問題**: `Database connection error`
**解決**: 
1. D1 Binding が正しく設定されているか確認
2. マイグレーションが適用されているか確認: `npm run db:migrate:prod`

### データベーステーブルが存在しない

```bash
# マイグレーションを再適用
wrangler d1 migrations apply webapp-production

# テーブル確認
wrangler d1 execute webapp-production \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## 📊 デプロイ後のタスク

### 1. 本番データの投入

```bash
# 本番環境にシードデータを投入 (オプション)
wrangler d1 execute webapp-production --file=./seed.sql
```

### 2. カスタムドメインの設定 (オプション)

Cloudflare Dashboard から:
1. **Pages** > **webapp** > **Custom domains**
2. **Set up a custom domain** をクリック
3. ドメイン名を入力 (例: `gis.example.com`)
4. DNS レコードを設定

### 3. Analytics の有効化

Cloudflare Dashboard から:
1. **Pages** > **webapp** > **Analytics**
2. Web Analytics を有効化

## 🔒 セキュリティ設定

### 1. JWT Secret の変更

開発環境のシークレットから本番環境用に変更：

```bash
# 強力なシークレットキーを生成
openssl rand -base64 32

# Pages Secret を更新
wrangler pages secret put JWT_SECRET --project-name webapp
```

### 2. CORS 設定の確認

`src/middleware.ts` で CORS 設定を確認し、必要に応じて本番ドメインのみに制限：

```typescript
// 例: 特定ドメインのみ許可
c.header('Access-Control-Allow-Origin', 'https://webapp.pages.dev');
```

## 📝 デプロイチェックリスト

- [ ] D1 データベース作成完了
- [ ] `database_id` を `wrangler.toml` に設定
- [ ] マイグレーション適用完了
- [ ] R2 バケット作成完了
- [ ] JWT_SECRET 環境変数設定完了
- [ ] Cloudflare Pages プロジェクト作成完了
- [ ] D1 Binding 設定完了
- [ ] R2 Binding 設定完了
- [ ] デプロイ成功確認
- [ ] ログイン動作確認
- [ ] 地図表示確認
- [ ] API 動作確認

## 🎯 次のステップ

1. 実際の GeoJSON データをアップロード
2. ユーザーアカウントの追加
3. カスタムドメインの設定
4. モニタリングとログの設定
5. バックアップ戦略の構築

---

**更新日**: 2025-12-01  
**作成者**: ナリモト株式会社
