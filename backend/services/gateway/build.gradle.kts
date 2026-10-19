plugins {
    id("achievee.spring-service")
}

dependencies {
    // Spring Cloud 2025.1.x = Spring Boot 4.0.x 호환 라인
    implementation(platform("org.springframework.cloud:spring-cloud-dependencies:2025.1.3"))
    implementation("org.springframework.cloud:spring-cloud-starter-gateway-server-webflux")
}
