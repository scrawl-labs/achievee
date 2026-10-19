// 독립 실행되는 Spring Boot 서비스 공통 설정
plugins {
    id("achievee.java-conventions")
    id("org.springframework.boot")
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    // Dockerfile이 서비스 이름과 상관없이 같은 경로에서 jar를 집어갈 수 있게
    archiveFileName = "app.jar"
}

tasks.named<Jar>("jar") {
    enabled = false
}
