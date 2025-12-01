# Vercel 배포 가이드

⚠️ **중요**: 이 프로젝트는 **Cloudflare Pages/Workers** 전용으로 설계되었습니다.

## 문제점

현재 프로젝트는 다음 Cloudflare 전용 서비스를 사용합니다:
- **Cloudflare D1**: SQLite 데이터베이스
- **Cloudflare R2**: 오브젝트 스토리지
- **Workers Bindings**: 환경 변수 바인딩

Vercel에서는 이러한 서비스를 사용할 수 없어 **404 에러**가 발생합니다.

## 해결 방법

### 옵션 1: Cloudflare Pages 사용 (권장 ⭐)

프로젝트가 Cloudflare용으로 설계되었으므로 Cloudflare Pages에 배포하세요.

```bash
# 1. Cloudflare 로그인
wrangler login

# 2. D1 데이터베이스 생성
wrangler d1 create webapp-production

# 3. wrangler.toml에 database_id 추가

# 4. R2 버킷 생성
wrangler r2 bucket create webapp-geodata

# 5. 마이그레이션 적용
wrangler d1 migrations apply webapp-production

# 6. 배포
npm run build
wrangler pages deploy dist --project-name webapp
```

**배포 URL**: `https://webapp.pages.dev`

### 옵션 2: Vercel용으로 수정 (복잡)

Vercel에 배포하려면 다음 작업이 필요합니다:

#### 1. 데이터베이스 교체
Cloudflare D1 → Vercel Postgres 또는 PlanetScale

```bash
npm install @vercel/postgres
# 또는
npm install @planetscale/database
```

#### 2. 스토리지 교체
Cloudflare R2 → Vercel Blob 또는 AWS S3

```bash
npm install @vercel/blob
```

#### 3. 환경 변수 설정
Vercel Dashboard에서 설정:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob 토큰
- `JWT_SECRET`: JWT 비밀키

#### 4. 코드 수정
모든 D1/R2 호출을 새로운 서비스로 교체해야 합니다.

**예시** (`src/routes/datasets.ts`):
```typescript
// Before (Cloudflare D1)
const results = await c.env.DB.prepare('SELECT * FROM datasets').all();

// After (Vercel Postgres)
import { sql } from '@vercel/postgres';
const results = await sql`SELECT * FROM datasets`;
```

### 옵션 3: 정적 데모 버전 (빠른 해결책)

API 없이 프론트엔드만 배포하고 하드코딩된 데모 데이터 사용:

1. `public/` 폴더에 정적 GeoJSON 파일 추가
2. API 호출을 로컬 파일 로드로 교체
3. 인증 기능 제거

## 권장 사항

**Cloudflare Pages를 사용하세요!** ⭐

이유:
- ✅ 코드 수정 불필요
- ✅ 무료 티어 제공
- ✅ 글로벌 CDN
- ✅ D1 + R2 통합
- ✅ 빠른 배포 (1분 이내)

## 현재 에러 해결

Vercel에서 발생하는 404 에러는 다음 이유 때문입니다:

1. **바인딩 누락**: `c.env.DB`, `c.env.R2`가 정의되지 않음
2. **런타임 차이**: Workers 런타임 vs Node.js 런타임
3. **라우팅 설정**: Vercel의 파일 기반 라우팅 vs Workers 라우팅

## 빠른 테스트

현재 샌드박스 환경에서 완벽하게 작동 중입니다:
- **URL**: https://3000-ig7guhzuxsz4gnlkrlkul-583b4d74.sandbox.novita.ai
- **로그인**: admin@example.com / admin123

## 도움이 필요하신가요?

1. **Cloudflare Pages 배포 가이드**: `DEPLOYMENT.md` 참조
2. **Vercel 마이그레이션**: 전체 코드베이스 수정 필요 (2-3일 소요)
3. **하이브리드 접근**: Cloudflare Workers + Vercel Frontend

---

**결론**: Cloudflare Pages 사용을 강력히 권장합니다. 프로젝트가 이를 위해 최적화되어 있습니다.
