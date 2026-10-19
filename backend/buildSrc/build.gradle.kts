plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

dependencies {
    // Spring Boot 버전은 여기 한 곳에서 정한다 (BOM으로 모든 모듈에 전파)
    implementation("org.springframework.boot:spring-boot-gradle-plugin:4.0.8")
}
