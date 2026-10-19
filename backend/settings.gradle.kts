rootProject.name = "achievee-backend"

// 공용 라이브러리: 여러 서비스가 함께 쓰는 코드 (부트 앱이 아님)
include("common:common-web")

// 각각 따로 배포되는 Spring Boot 앱
include("services:gateway")
include("services:expense-service")
include("services:stats-service")
