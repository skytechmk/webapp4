# HHVM Docker image for Snapify Hack services
FROM hhvm/hhvm:latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /var/www/snapify/hack

# Copy HHVM configuration
COPY ../hhvm-config/server.ini /etc/hhvm/server.ini

# Copy composer files for dependencies
COPY services/*/composer.json ./

# Install Hack dependencies (if any)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy source code
COPY . .

# Create log directories
RUN mkdir -p /var/log/hhvm

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start HHVM
CMD ["hhvm", "--config", "/etc/hhvm/server.ini", "--mode", "server"]