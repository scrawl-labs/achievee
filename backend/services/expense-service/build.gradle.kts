plugins {
    id("achievee.spring-service")
}

dependencies {
    implementation(project(":common:common-web"))
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
}
