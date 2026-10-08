# Achievee

구글 캘린더/태스크 기반 성과 지표 + 일기 + 지출 앱 (Next.js 14).

- **달력**: 날짜별 완료한 태스크 수를 뱃지로 표시 (Todomate 스타일)
- **통계**: 달성률, 연속 달성, 요일별 달성률
- **일기 / 지출**: 로컬 SQLite (`data/achievee.db`, Node 내장 `node:sqlite`)
- **데이터 소스**: Google Tasks(완료 여부) + Google Calendar(일정 수). 캘린더 이벤트에는 "완료" 개념이 없어서 완료 지표는 Tasks 기준.

## 실행
```bash
cp .env.example .env.local   # 값 채우기 (없으면 데모 데이터로 동작)
npm install
npm run dev
```
Google Cloud Console에서 OAuth 클라이언트(Web)를 만들고 Calendar API, Tasks API를 활성화한 뒤
리디렉션 URI에 `http://localhost:3000/api/auth/callback/google` 을 추가하세요. Node ≥ 22.13 필요.
