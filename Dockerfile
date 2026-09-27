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

# Optimize JVM for Render 512MB free tier memory limits & IPv4
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -Djava.net.preferIPv4Stack=true"

COPY --from=build /app/target/backend-1.0.0.jar app.jar

# Run as non-root (least privilege). Render runs on 8000 via $PORT.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown appuser:appgroup /app/app.jar
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD sh -c 'wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8000}/api/v1/health || exit 1'

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
