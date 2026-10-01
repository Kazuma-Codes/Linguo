package com.mosaic.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${spring.datasource.url}")
    private String defaultUrl;

    @Value("${spring.datasource.username:}")
    private String defaultUser;

    @Value("${spring.datasource.password:}")
    private String defaultPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("org.postgresql.Driver");

        String rawUrl = defaultUrl.trim();

        if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(rawUrl.replace("postgresql://", "http://").replace("postgres://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath() != null ? uri.getPath() : "/";
                String query = uri.getQuery();
                String userInfo = uri.getUserInfo();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + (query != null && !query.isBlank() ? "?" + query : "");

                // Supavisor transaction pooler on port 6543 requires prepareThreshold=0 for Hibernate / JPA
                if (port == 6543 && !jdbcUrl.contains("prepareThreshold")) {
                    jdbcUrl += (jdbcUrl.contains("?") ? "&" : "?") + "prepareThreshold=0";
                }
                config.setJdbcUrl(jdbcUrl);

                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    String user = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                    String pass = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                    config.setUsername(user);
                    config.setPassword(pass);
                } else {
                    requireCredentials();
                    config.setUsername(defaultUser);
                    config.setPassword(defaultPassword);
                }
                log.info("Configured PostgreSQL DataSource: target host={}:{}, database={}, user={}", host, port, path, config.getUsername());
            } catch (Exception e) {
                throw new IllegalStateException("Invalid PostgreSQL datasource URL", e);
            }
        } else {
            if (!rawUrl.startsWith("jdbc:postgresql:")) {
                throw new IllegalStateException("Datasource URL must be a PostgreSQL JDBC or PostgreSQL URI");
            }
            requireCredentials();
            config.setJdbcUrl(rawUrl);
            config.setUsername(defaultUser);
            config.setPassword(defaultPassword);
            log.info("Configured PostgreSQL DataSource using configured JDBC URL: {}", rawUrl.replaceAll(":[^/@]+@", ":****@"));
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setValidationTimeout(5000);

        try {
            return new HikariDataSource(config);
        } catch (Exception e) {
            String fullErr = e.toString();
            Throwable cause = e.getCause();
            while (cause != null) {
                fullErr += " " + cause.toString();
                cause = cause.getCause();
            }

            if (fullErr.contains("tenant/user") && fullErr.contains("not found")) {
                log.error("================================================================================");
                log.error("DATABASE CONNECTION ERROR: Supabase tenant/user not found!");
                log.error("Common causes and fixes:");
                log.error("1. SUPABASE PROJECT IS PAUSED: Inactivity on free tier pauses the database.");
                log.error("   -> Go to https://supabase.com/dashboard and click 'Restore project'.");
                log.error("2. WRONG POOLER HOST OR REGION: Check Project Settings > Database > Connection Pooling.");
                log.error("   -> Ensure the pooler domain matches your project region (e.g. aws-0-[region].pooler.supabase.com).");
                log.error("3. MISMATCHED USERNAME: When using the pooler, the user must be postgres.[PROJECT_REF].");
                log.error("   -> When connecting directly (db.[PROJECT_REF].supabase.co), the user must be just 'postgres'.");
                log.error("================================================================================");
            }
            throw e;
        }
    }

    private void requireCredentials() {
        if (defaultUser == null || defaultUser.isBlank() || defaultPassword == null || defaultPassword.isBlank()) {
            throw new IllegalStateException("PostgreSQL username and password must be configured when not embedded in DATABASE_URL");
        }
    }
}
