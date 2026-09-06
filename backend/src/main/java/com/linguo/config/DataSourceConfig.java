package com.linguo.config;

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
                log.info("Configured PostgreSQL DataSource connecting to host={}:{}, database={}", host, port, path);
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
            log.info("Configured PostgreSQL DataSource using configured JDBC URL");
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setValidationTimeout(5000);
        return new HikariDataSource(config);
    }

    private void requireCredentials() {
        if (defaultUser == null || defaultUser.isBlank() || defaultPassword == null || defaultPassword.isBlank()) {
            throw new IllegalStateException("PostgreSQL username and password must be configured when not embedded in DATABASE_URL");
        }
    }
}
