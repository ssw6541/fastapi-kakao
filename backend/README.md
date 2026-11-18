# 백엔드 실행

기본 저장소는 `users.db`(SQLite)입니다. Supabase PostgreSQL을 사용하려면
`.env.example`을 참고해 `.env`에 Supabase Connect의 PostgreSQL 연결 문자열을
`DATABASE_URL`로 설정하세요. IPv4 환경에서는 Session pooler를 이용할 수 있습니다.
데이터베이스 비밀번호가 포함된 `.env`는 공유하거나 커밋하지 마세요.

기존 SQLite 데이터를 처음 이전할 때는 백엔드 서버를 중지하고 실행합니다.

```powershell
uv sync
uv run python migrate_sqlite.py
uv run uvicorn main:app --reload
```

이전 명령은 회원과 세션을 복사하고 원본 `users.db`를 보존합니다. 같은 데이터가
이미 있으면 건너뛰고, 대상에 충돌하는 데이터가 있으면 복사를 중단합니다. SQLite로
되돌리려면 서버를 중지하고 `DATABASE_URL`을 제거한 후 다시 시작하세요. 전환 이후
각 저장소에서 발생한 변경은 자동으로 동기화되지 않습니다.

HTTPS 배포 환경에서는 `COOKIE_SECURE=true`로 설정하세요.

## Supabase Data API

내 정보 조회에 Data API를 사용하려면 `.env`에 `SUPABASE_URL`과 백엔드 전용
`SUPABASE_SECRET_KEY`를 함께 설정합니다. Secret key는 브라우저나 Git에 넣지 마세요.
`data_api.sql`을 PostgreSQL에 적용하고 Supabase API 설정의 Exposed schemas에
`app_api`를 추가해야 합니다. 이 스키마는 서비스 역할에만 내 정보 조회 함수 실행을
허용하며, 회원과 세션 테이블은 `fastapi_kakao` 스키마에 남습니다.
가입, 로그인, 로그아웃, 탈퇴는 기존 PostgreSQL 연결을 사용합니다.

## 카카오 로그인

카카오 개발자 콘솔에서 카카오 로그인을 활성화하고 REST API 키의 Redirect URI에
`http://localhost:5173/api/auth/kakao/callback`을 등록합니다. `.env`에
`KAKAO_CLIENT_ID`와 `KAKAO_CLIENT_SECRET`을 설정하고 백엔드를 재시작하세요.
로컬에서는 브라우저로 `http://localhost:5173`에 접속합니다. 배포 시에는
`KAKAO_REDIRECT_URI`, `FRONTEND_URL`, `COOKIE_SECURE=true`를 환경에 맞게 설정하고
변경된 Redirect URI를 카카오 개발자 콘솔에 등록하세요.

카카오 계정은 기존 이메일 계정과 자동 연결하지 않습니다. 이메일 제공 동의가 없어도
동작하며, 내부 식별용 주소는 실제 이메일이 아닙니다. 앱의 회원탈퇴는 로컬 회원과
세션을 삭제하지만 카카오 측 앱 연결을 해제하지는 않습니다.

## Google 로그인

Google Cloud에서 웹 애플리케이션 OAuth 클라이언트를 만들고 로컬과 배포 환경의
`/api/auth/google/callback` 주소를 승인된 리디렉션 URI로 등록합니다. 로컬 `.env`와
Render 환경 변수에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 설정하세요.
배포 환경의 `GOOGLE_REDIRECT_URI`는 `render.yaml`에 지정되어 있습니다. 기존 Render
Blueprint에는 새 `sync: false` 변수가 자동으로 추가되지 않으므로 수동으로 입력합니다.
Google 계정은 다른 로그인 방식의 계정과 자동으로 연결되지 않습니다.
