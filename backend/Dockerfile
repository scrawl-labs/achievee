# 서비스 하나당 이미지 하나. 어떤 서비스를 만들지는 SERVICE 빌드 인자로 고른다.
#   docker build --build-arg SERVICE=expense-service -t achievee/expense-service .
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY . .
ARG SERVICE
RUN ./gradlew --no-daemon :services:${SERVICE}:bootJar

FROM eclipse-temurin:21-jre
ARG SERVICE
WORKDIR /app
COPY --from=build /workspace/services/${SERVICE}/build/libs/app.jar app.jar
# 컨테이너 메모리 한도에 맞춰 힙 크기를 잡는다 (작은 VM 하나에 여러 서비스를 띄우기 위해)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
