# Achievee

구글 캘린더/태스크 기반 성과 지표 + 일기 + 지출 앱 (Next.js 14).

- **달력**: 날짜별 완료한 태스크 수를 뱃지로 표시 (Todomate 스타일)
- **통계**: 달성률, 연속 달성, 요일별 달성률
- **일기 / 지출**: Postgres (Neon). 일기 본문과 지출 메모는 AES-256-GCM으로 암호화해 저장
- **로그인 필수**: Google 로그인 후에만 사용 가능 (사용자 키 = Google 계정 id)
- **언어**: English / 한국어 / 日本語 / Español (사이드바 하단에서 변경, 쿠키 저장)
- **데이터 소스**: Google Tasks(완료 여부) + Google Calendar(일정 수). 캘린더 이벤트에는 "완료" 개념이 없어서 완료 지표는 Tasks 기준.

## 실행
```bash
cp .env.example .env.local   # 값 채우기 
npm install
npm run dev
```
Google Cloud Console에서 OAuth 클라이언트(Web)를 만들고 Calendar API, Tasks API를 활성화한 뒤
리디렉션 URI에 `http://localhost:3000/api/auth/callback/google` 을 추가하세요. 

## 배포 (Vercel)
1. Vercel → Storage → Neon Postgres 연결 (`DATABASE_URL` 자동 주입)
2. 환경변수: `GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`
3. Google OAuth 리디렉션 URI에 `https://<도메인>/api/auth/callback/google` 추가
4. 공개 서비스는 Google OAuth 앱 검증(민감 스코프: calendar/tasks readonly)과 개인정보처리방침 페이지가 필요
