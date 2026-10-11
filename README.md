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

## 감정 어휘 (일기)
일기에서 "지금 어떤 감정일까요?"로 감정 단어를 고르고(최대 3개), 감정 사전에서 둘러볼 수 있습니다. 주간 회고에는 이번 주에 쓴 감정 단어와 어휘 증가가 나옵니다.
- 단어, 설명, 계열 분류와 "비슷하지만 다른 감정" 연결은 **이 프로젝트에서 직접 작성**했습니다 (`src/lib/emotions.ts`). 한국어와 영어 목록이 있고, 다른 언어는 영어 목록을 보여줍니다.
- **질문으로 찾기**: 질문 3개(마음이 어느 쪽인지, 누구/무엇을 향하는지, 들떠 있는지 가라앉아 있는지)에 답하면 후보 단어를 보여줍니다. 일기 글을 읽거나 외부로 보내지 않고, 단어마다 직접 매긴 쾌–불쾌(`VALENCE`), 향하는 대상(`FOCUS`), 에너지(`ENERGY`) 태그로 계산합니다. 정답이 아니라 생각을 돕는 제안입니다.
- 선택한 감정 단어는 일기 본문처럼 암호화되어 저장됩니다.

## 출처
감정 어휘를 넓혀 보자는 아이디어는 아래 연구에서 영감을 받았고, 어휘 범위를 점검하고 쾌–불쾌 차원을 정하는 데 두 문헌을 더 참고했습니다. **해당 데이터셋은 이 프로젝트에 포함하거나 사용하지 않았습니다** (데이터셋은 CC BY-NC 4.0, 비영리 조건).
- Jung, Y., Shin, H., & Bergen, B. K. (2026). *EVOKE: Emotion Vocabulary Of Korean and English*. arXiv:2602.10414 — https://arxiv.org/abs/2602.10414
- Bradley, M. M., & Lang, P. J. (1999). *Affective norms for English words (ANEW): Instruction manual and affective ratings*. Technical Report C-1, University of Florida. — 단어마다 쾌–불쾌 정도를 매기는 **차원적 관점**만 참고했고, ANEW의 단어와 점수는 사용하지 않았습니다. (우리 점수는 `src/lib/emotions.ts`의 `VALENCE`, 직접 판단한 −2~+2)
- 데이터셋: https://github.com/yoonwonj/EVOKE (CC BY-NC 4.0)
- 박인조, 민경환 (2005). 한국어 감정단어의 목록 작성과 차원 탐색. *한국심리학회지: 사회 및 성격*, 19(1), 109–129. — 흔히 쓰는 감정단어가 빠지지 않았는지 **범위를 점검하는 데만** 참고했고, 그 단어 목록과 평정값은 가져다 쓰지 않았습니다.

로고 글자는 학교안심 둥근미소(한국교육학술정보원, SIL OFL 1.1)를 도형으로 변환한 것이며, 랜딩 제목에는 같은 폰트 Bold를 웹폰트로 사용합니다. 라이선스: `public/fonts/OFL-HakgyoansimDunggeunmiso.txt`
