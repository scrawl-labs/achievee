# Achievee Backend (Spring MSA)

Next.js 앱(`../`)의 API를 Spring 서비스로 하나씩 옮겨 가는 MSA 연습용 백엔드.
프론트는 그대로 두고, 도메인 하나씩 떼어낸다 (Strangler 패턴).

## 구조
```
backend/
├── buildSrc/                     # 공통 빌드 규칙 (convention plugins)
│   ├── achievee.java-conventions     # Java 21, Spring Boot BOM, JUnit
│   └── achievee.spring-service       # + Boot 플러그인, actuator, app.jar
├── common/
│   └── common-web/               # 공통 에러 응답 (ProblemDetail), auto-configuration으로 자동 등록
└── services/
    ├── gateway/          :8080   # Spring Cloud Gateway, 외부로 열리는 유일한 입구
    ├── expense-service/  :8081   # 지출
    └── stats-service/    :8082   # 통계 (다른 서비스 이벤트를 모아 읽기 모델 구성 예정)
```

규칙
- 서비스끼리는 **코드를 공유하지 않는다**. `common/*`에는 기술적인 것(에러 형식 등)만 두고 도메인 모델은 두지 않는다.
- 서비스끼리는 서로의 DB를 읽지 않는다. 동기 호출은 REST, 부수 효과는 이벤트로.
- 버전: Spring Boot 4.0.8 (`buildSrc/build.gradle.kts`), Spring Cloud 2025.1.3 (`services/gateway/build.gradle.kts`).
  Spring Cloud는 Boot 마이너 버전마다 호환 라인이 정해져 있으니 Boot를 올릴 때 같이 확인한다.

## 실행
```bash
./gradlew build                                 # 전체 빌드 + 테스트
./gradlew :services:expense-service:bootRun     # 서비스 하나만 실행
docker compose up --build                       # 전체 실행 (게이트웨이: localhost:8080)

curl localhost:8080/api/expenses/ping           # {"service":"expense-service"}
curl localhost:8080/api/stats/ping              # {"service":"stats-service"}
```

## 새 서비스 추가
1. `services/<name>/build.gradle.kts`에 `id("achievee.spring-service")`
2. `settings.gradle.kts`에 `include("services:<name>")`
3. 게이트웨이 `application.yml`에 라우트, `docker-compose.yml`에 서비스 추가

## 다음 단계
- [ ] expense-service: Postgres + Flyway + JPA로 지출 CRUD
- [ ] 인증: Google 로그인(NextAuth) 토큰을 게이트웨이에서 검증
- [ ] Kafka(또는 Redpanda) + Outbox: `ExpenseRecorded` → stats-service 집계
- [ ] Testcontainers 통합 테스트
