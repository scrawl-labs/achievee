// 서블릿(WebMVC) 서비스들이 함께 쓰는 에러 응답 형식.
// 서비스 간 공유는 최소한으로: 도메인 모델은 절대 여기 두지 않는다.
plugins {
    id("achievee.java-conventions")
    `java-library`
}

dependencies {
    api("org.springframework.boot:spring-boot-starter-webmvc")
}
