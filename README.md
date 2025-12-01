# GIS Web App

React + MapLibre GL JS を使用した GIS フロントエンド Web アプリケーション

## 📋 プロジェクト概要

- **名前**: GIS Web App
- **目的**: 地理情報システム (GIS) データの可視化、管理、検索
- **技術スタック**: 
  - フロントエンド: Vanilla JS + MapLibre GL JS
  - バックエンド: Hono (Cloudflare Workers)
  - データベース: Cloudflare D1 (SQLite)
  - ストレージ: Cloudflare R2
  - デプロイ: Cloudflare Pages

## 🌐 URL

- **開発環境**: https://3000-ig7guhzuxsz4gnlkrlkul-583b4d74.sandbox.novita.ai
- **本番環境**: (デプロイ後に更新)
- **API エンドポイント**: `/api/*`

## ✨ 実装済み機能

### 認証・ユーザー管理
- ✅ JWT ベースのログイン認証
- ✅ ロール管理 (admin, editor, viewer)
- ✅ ログイン状態の永続化

### データセット管理
- ✅ データセット一覧表示
- ✅ データセット詳細表示
- ✅ GeoJSON/CSV/Shapefile アップロード
- ✅ データセット削除 (admin のみ)

### 地図表示
- ✅ MapLibre GL JS による地図レンダリング
- ✅ OpenStreetMap ベースマップ
- ✅ ポイントデータの表示
- ✅ クラスタリング (自動グループ化)
- ✅ ズーム・パン操作
- ✅ レイヤーの表示/非表示切替

### 検索・フィルタリング
- ✅ キーワード検索
- ✅ 属性フィルタ
- ✅ BBOX (地図範囲) 検索
- ✅ 近傍検索 (指定座標から半径検索)

### UI/UX
- ✅ 3カラムレイアウト (左パネル、地図、右詳細パネル)
- ✅ 詳細パネル (スライドイン)
- ✅ クラスタクリックでズームイン
- ✅ フィーチャークリックで詳細表示
- ✅ Tailwind CSS によるスタイリング

## 🗂️ データアーキテクチャ

### データモデル

**users テーブル**
- id, email, password, name, role, created_at, updated_at

**datasets テーブル**
- id, name, type, record_count, r2_key, schema_json, status, created_by, created_at, updated_at

**features テーブル**
- id, dataset_id, geometry_type, min_lon, min_lat, max_lon, max_lat, properties_json, created_at

### ストレージサービス
- **Cloudflare D1**: メタデータと検索インデックス
- **Cloudflare R2**: GeoJSON ファイルの保存
- **JWT Secret**: 環境変数 (development-secret-key-change-in-production)

### データフロー
1. ユーザーがファイルをアップロード
2. バックエンドが R2 にファイルを保存
3. GeoJSON の場合、フィーチャーを D1 に保存
4. 地図表示時は D1 から検索、必要に応じて R2 から取得

## 👥 デフォルトユーザー

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | admin |
| editor@example.com | admin123 | editor |
| viewer@example.com | admin123 | viewer |

## 🚀 開発環境セットアップ

### 前提条件
- Node.js 18+
- npm

### インストール

```bash
# 依存関係のインストール
npm install

# D1 データベースの初期化
npm run db:migrate:local

# テストデータの投入
npm run db:seed
```

### 開発サーバー起動

```bash
# ビルド
npm run build

# PM2 で起動
pm2 start ecosystem.config.cjs

# または wrangler pages dev
npm run dev:sandbox
```

### データベース操作

```bash
# マイグレーション適用 (ローカル)
npm run db:migrate:local

# マイグレーション適用 (本番)
npm run db:migrate:prod

# シードデータ投入
npm run db:seed

# データベースリセット
npm run db:reset

# SQL 実行 (ローカル)
npm run db:console:local

# SQL 実行 (本番)
npm run db:console:prod
```

## 📡 API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得

### データセット
- `GET /api/datasets` - データセット一覧
- `GET /api/datasets/:id` - データセット詳細
- `POST /api/datasets/upload` - データセットアップロード
- `DELETE /api/datasets/:id` - データセット削除

### 地図表示
- `GET /api/map/data` - 地図データ取得 (BBOX指定可能)
- `GET /api/map/nearby` - 近傍検索
- `GET /api/map/features/:id` - フィーチャー詳細

### 検索
- `GET /api/search` - 属性検索

## 🛠️ 未実装機能

### 次のステップで実装推奨

1. **高度な検索機能**
   - SQLite FTS (Full-Text Search) の導入
   - 複雑な属性フィルタ
   - 空間演算 (Intersects, Contains など)

2. **データ編集機能**
   - フィーチャーの追加・編集・削除
   - 属性情報の編集
   - ジオメトリの編集

3. **スタイル管理**
   - レイヤースタイルの保存
   - カラースキームのカスタマイズ
   - シンボルライブラリ

4. **エクスポート機能**
   - GeoJSON エクスポート
   - CSV エクスポート
   - 地図画像エクスポート

5. **ユーザー管理**
   - ユーザー登録機能
   - パスワードリセット
   - プロフィール編集

6. **高度なクラスタリング**
   - カスタムクラスタ設定
   - ヒートマップ表示
   - 統計情報の表示

## 🔧 デプロイメント

### Cloudflare Pages へのデプロイ

```bash
# ビルド
npm run build

# デプロイ
npm run deploy

# または特定プロジェクト名でデプロイ
wrangler pages deploy dist --project-name webapp
```

### 環境変数設定

```bash
# JWT_SECRET の設定
wrangler pages secret put JWT_SECRET --project-name webapp

# その他の環境変数
wrangler pages secret put API_KEY --project-name webapp
```

### 本番データベース作成

```bash
# D1 データベース作成
wrangler d1 create webapp-production

# database_id を wrangler.toml に設定後、マイグレーション適用
npm run db:migrate:prod
```

## 📁 プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx           # メインエントリーポイント
│   ├── types.ts            # TypeScript 型定義
│   ├── utils.ts            # ユーティリティ関数
│   ├── middleware.ts       # 認証ミドルウェア
│   └── routes/             # API ルート
│       ├── auth.ts         # 認証 API
│       ├── datasets.ts     # データセット API
│       ├── map.ts          # 地図表示 API
│       └── search.ts       # 検索 API
├── public/
│   └── static/
│       ├── app.js          # フロントエンド JS
│       └── style.css       # カスタム CSS
├── migrations/             # D1 マイグレーション
│   └── 0001_initial_schema.sql
├── seed.sql                # テストデータ
├── wrangler.toml           # Cloudflare 設定
├── package.json            # 依存関係とスクリプト
├── ecosystem.config.cjs    # PM2 設定
└── README.md               # このファイル
```

## 🔒 セキュリティ

- JWT による認証
- ロールベースのアクセス制御
- SHA-256 によるパスワードハッシュ
- CORS 設定
- 環境変数による機密情報管理

## 📝 開発ガイドライン

### コーディング規約
- TypeScript strict モード
- ESLint / Prettier による自動フォーマット
- コミット前に型チェック

### Git ワークフロー
- `main` ブランチが本番環境
- フィーチャーブランチで開発
- PR レビュー後にマージ

## 📄 ライセンス

MIT License

## 👨‍💻 作成者

ナリモト株式会社

---

最終更新日: 2025-12-01
ステータス: ✅ アクティブ
