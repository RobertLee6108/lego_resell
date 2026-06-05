# 로컬 DB 데이터 스냅샷

`local_data.sql`은 `npx supabase db dump --local --data-only`로 만든 **public 스키마 데이터** 백업입니다.

## 복원 (스키마 적용 후)

```bash
npx supabase db reset          # migrations + seed.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/local_data.sql
```

또는 SQL Editor / `psql`로 `local_data.sql`만 실행해도 됩니다(테이블이 이미 있을 때).
