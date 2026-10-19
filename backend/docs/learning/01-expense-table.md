# 실험 01. 지출 테이블 설계

> 흐름: **내 설계 초안 → 같이 리뷰 → 1천만 건 넣고 측정 → 예측과 비교 → 배운 것 정리**

## 1. 재료: 지금 Next.js 앱의 지출 테이블

`src/lib/db.ts`에 있는 현재 스키마 (그대로 옮김):

```sql
CREATE TABLE IF NOT EXISTS expense (
  id       SERIAL PRIMARY KEY,
  "user"   TEXT    NOT NULL,          -- Google 계정 id
  date     TEXT    NOT NULL,          -- 'YYYY-MM-DD'
  category TEXT    NOT NULL,          -- food, cafe, transport, shopping, culture, fixed, other
  memo     TEXT    NOT NULL DEFAULT '', -- AES-256-GCM 암호문
  amount   INTEGER NOT NULL,
  need     INTEGER NOT NULL DEFAULT 1  -- 1 = 필요한 지출, 0 = 안 써도 됐던 지출
);
CREATE INDEX IF NOT EXISTS expense_user_date ON expense ("user", date);

-- 함께 쓰이는 테이블
CREATE TABLE settings ("user" TEXT PRIMARY KEY, month_start_day INTEGER NOT NULL DEFAULT 1, ...);
-- income(수입), saving(저축/투자)도 expense와 거의 같은 모양
```

알아두면 좋은 사실들:
- 카테고리는 코드에 고정된 7개 (`src/lib/i18n.ts`의 `CATEGORIES`). 첫 버전에서는 `'식비'`처럼 한국어 라벨을 그대로 저장해서, 지금도 읽을 때 `LEGACY_CAT`으로 변환한다.
- 통화는 저장하지 않는다. 화면 언어에 따라 KRW/USD/JPY/EUR/TWD로 **표시만** 바뀐다.
- 사용자마다 "한 달의 시작일"(`month_start_day`, 예: 월급날 25일)을 정할 수 있다. 그래서 "이번 달"이 1일~말일이 아닐 수 있다.
- 메모는 암호화되어 있어서 DB에서 검색이나 정렬을 할 수 없다.

## 2. 실제로 나가는 쿼리 (조회 패턴)

| # | 어디서 | 쿼리 모양 | 빈도 |
|---|---|---|---|
| Q1 | 지출 탭 목록 | `WHERE user=? AND date >= ? AND date < ? ORDER BY date DESC, id DESC` (메모 포함) | 매우 자주 |
| Q2 | 통계, 돈 흐름 차트 | `SELECT date, category, amount, need WHERE user=? AND date >= ? AND date < ?` → **합계는 앱(JS)에서 계산** | 자주 |
| Q3 | 추가 / 수정 / 삭제 | `INSERT`, `UPDATE ... WHERE user=? AND id=?`, `DELETE ... WHERE user=? AND id=?` | 자주 |
| Q4 | 검색 | `WHERE user=? AND memo <> '' ORDER BY date DESC, id DESC LIMIT n` → 복호화 후 앱에서 검색 | 가끔 |
| Q5 | 회원 탈퇴 | `DELETE FROM expense WHERE user=?` | 드묾 |

앞으로 생길 조회 (stats-service가 맡을 것):
- 월별 / 카테고리별 합계, 6개월 추이
- "안 써도 됐던 지출" 비율
- 기분 / 운동과 지출의 상관 (다른 서비스 데이터와 조합)

## 3. 설계할 때 생각해볼 질문 (답은 일부러 안 적음)

1. **타입**: `date`가 TEXT, `need`가 INTEGER, `amount`가 INTEGER다. 각각 괜찮은가? 바꾼다면 뭘로, 왜?
2. **돈**: 언어를 USD로 바꾸면 `12.50`달러는 어떻게 저장되나? 한 사용자가 여러 통화를 쓰면?
3. **PK**: `SERIAL`(int4)로 충분한가? 서비스가 나뉘고 이벤트로 id를 주고받게 되면?
4. **카테고리**: 문자열 그대로? 별도 테이블? enum? 나중에 사용자 정의 카테고리를 허용한다면?
5. **인덱스**: `("user", date)` 하나로 Q1~Q5가 다 빠른가? `ORDER BY date DESC, id DESC`는 어떤가?
6. **감사 / 운영**: `created_at`, `updated_at`, 삭제 방식(진짜 삭제 vs 삭제 표시)은?
7. **대용량**: 사용자 10만 명 × 1인당 100건 = 1천만 건일 때 Q2의 "6개월치 다 가져와서 앱에서 합계"는 괜찮은가?

## 4. 내 설계 초안 ✍️

> 여기에 직접 적기. 틀려도 됨. 컬럼, 타입, 제약조건, 인덱스, 그리고 **왜 그렇게 했는지 한 줄씩**.

```sql
-- TODO
```

### 측정 전 예측 ✍️
> 1천만 건(사용자 10만 명)일 때, 한 사용자의 한 달 지출 목록(Q1) 조회는 몇 ms 걸릴까?
> 인덱스가 아예 없으면? 지금 인덱스 그대로면? 내 설계로는?

- 인덱스 없음: ? ms
- 현재 인덱스: ? ms
- 내 설계: ? ms

## 5. 측정 결과
(리뷰 후 채움)

## 6. 배운 것
(측정 후 채움)
