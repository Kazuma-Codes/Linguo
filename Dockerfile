# Stage 1: Build the JAR with Maven & Java 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# Build application
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Optimize JVM for Render 512MB free tier memory limits
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

COPY --from=build /app/target/backend-1.0.0.jar app.jar

EXPOSE 8000

ENTRYPOINT ["sh", "-c", "java  -jar app.jar"]
