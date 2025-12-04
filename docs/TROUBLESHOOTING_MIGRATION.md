# 🛠️ Snapify Troubleshooting & Migration Guide

## 📋 Table of Contents

1. [Common Issues and Solutions](#-1-common-issues-and-solutions)
2. [Error Codes and Messages](#-2-error-codes-and-messages)
3. [Debugging Techniques](#-3-debugging-techniques)
4. [Performance Troubleshooting](#-4-performance-troubleshooting)
5. [Migration Guides](#-5-migration-guides)
6. [Data Migration Procedures](#-6-data-migration-procedures)
7. [Version Upgrade Guides](#-7-version-upgrade-guides)
8. [Rollback Procedures](#-8-rollback-procedures)

---

## 🔧 1. Common Issues and Solutions

### 1.1 Installation and Setup Issues

#### Issue: Node.js version compatibility errors
**Symptoms**: `Error: Node.js version not supported` or `SyntaxError: Unexpected token`
**Solutions**:
```bash
# Check current Node.js version
node -v

# Install correct version (20+ required)
nvm install 20
nvm use 20

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Missing environment variables
**Symptoms**: `Error: Missing required environment variable: JWT_SECRET`
**Solutions**:
```bash
# Create .env file from template
cp .env.example .env

# Verify required variables
grep -E '^(JWT_SECRET|S3_ENDPOINT|S3_BUCKET_NAME|S3_ACCESS_KEY|S3_SECRET_KEY)' .env

# Set missing variables
export JWT_SECRET=$(openssl rand -hex 32)
```

### 1.2 Runtime Issues

#### Issue: Application fails to start
**Symptoms**: `Error: listen EADDRINUSE: address already in use`
**Solutions**:
```bash
# Find and kill process on port
lsof -i :3001
kill -9 <PID>

# Or use different port
export PORT=3002
npm run dev
```

#### Issue: Database connection failures
**Symptoms**: `Error: SQLite database not found` or `Error: Connection refused`
**Solutions**:
```bash
# Verify database file exists
ls -la data/snapify.db

# Check database permissions
chmod 644 data/snapify.db
chown $USER:$USER data/snapify.db

# Initialize database if missing
npm run db:init
```

### 1.3 Media Processing Issues

#### Issue: Media upload failures
**Symptoms**: `Error: File upload timeout` or `Error: Invalid file type`
**Solutions**:
```bash
# Check file size limits
grep -r "uploadLimit" config/

# Verify storage backend
curl -v http://localhost:9000

# Check available disk space
df -h
```

#### Issue: Image processing errors
**Symptoms**: `Error: Image processing failed` or `Error: Unsupported format`
**Solutions**:
```bash
# Check supported formats
grep -r "supportedFormats" utils/

# Verify image processing dependencies
npm list sharp

# Test with different image format
convert input.jpg -quality 80 output.jpg
```

### 1.4 Real-time Communication Issues

#### Issue: WebSocket connection failures
**Symptoms**: `Error: WebSocket connection failed` or `Error: Connection timeout`
**Solutions**:
```bash
# Check Redis server status
redis-cli ping

# Verify WebSocket configuration
grep -r "websocket" config/

# Test WebSocket connection
wscat -c ws://localhost:3001
```

#### Issue: Real-time updates not working
**Symptoms**: Media uploads don't appear in real-time
**Solutions**:
```bash
# Check Redis pub/sub
redis-cli publish test_channel "test message"

# Verify event listeners
grep -r "socket.on" components/
```

---

## ❌ 2. Error Codes and Messages

### 2.1 HTTP Error Codes

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| 400 | `INVALID_REQUEST` | Malformed request | Check request format |
| 401 | `UNAUTHORIZED` | Missing/invalid auth | Verify JWT token |
| 403 | `FORBIDDEN` | Insufficient permissions | Check user roles |
| 404 | `NOT_FOUND` | Resource doesn't exist | Verify resource ID |
| 409 | `CONFLICT` | Resource already exists | Use different identifier |
| 429 | `RATE_LIMITED` | Too many requests | Wait and retry |
| 500 | `INTERNAL_ERROR` | Server error | Check server logs |
| 503 | `SERVICE_UNAVAILABLE` | Service down | Check dependencies |

### 2.2 Media Processing Errors

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| MEDIA_001 | `FILE_TOO_LARGE` | File exceeds size limit | Compress file |
| MEDIA_002 | `UNSUPPORTED_FORMAT` | Invalid file format | Convert format |
| MEDIA_003 | `PROCESSING_FAILED` | Processing error | Check file integrity |
| MEDIA_004 | `STORAGE_ERROR` | Storage failure | Verify storage backend |
| MEDIA_005 | `WATERMARK_ERROR` | Watermark failed | Check watermark config |

### 2.3 Database Errors

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| DB_001 | `CONNECTION_FAILED` | Database connection error | Check DB config |
| DB_002 | `QUERY_ERROR` | SQL query failed | Validate query syntax |
| DB_003 | `CONSTRAINT_VIOLATION` | Constraint violation | Check data integrity |
| DB_004 | `TRANSACTION_FAILED` | Transaction error | Verify transaction logic |
| DB_005 | `MIGRATION_ERROR` | Migration failed | Check migration files |

### 2.4 Authentication Errors

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| AUTH_001 | `INVALID_CREDENTIALS` | Wrong username/password | Verify credentials |
| AUTH_002 | `TOKEN_EXPIRED` | JWT token expired | Refresh token |
| AUTH_003 | `INVALID_TOKEN` | Malformed JWT token | Generate new token |
| AUTH_004 | `ACCOUNT_LOCKED` | Account locked | Contact admin |
| AUTH_005 | `MFA_REQUIRED` | MFA required | Complete MFA |

---

## 🔍 3. Debugging Techniques

### 3.1 Logging and Monitoring

#### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=snapify:*

# Start application with debug
npm run dev

# View logs in real-time
tail -f logs/snapify.log
```

#### Log Analysis
```bash
# Filter error logs
grep -i "error" logs/snapify.log

# Count error occurrences
grep -c "ERROR" logs/snapify.log

# Follow logs with timestamps
tail -f logs/snapify.log | grep --line-buffered "ERROR"
```

### 3.2 Debugging Tools

#### Browser Debugging
```javascript
// Enable debug mode in browser
localStorage.debug = 'snapify:*'

// Check network requests
fetch('/api/debug/info')
  .then(response => response.json())
  .then(console.log)
```

#### Server Debugging
```bash
# Attach debugger to Node.js process
node --inspect-brk server.js

# Use Chrome DevTools to connect
chrome://inspect

# Profile CPU usage
node --prof server.js
```

### 3.3 Common Debugging Commands

```bash
# Check running processes
ps aux | grep snapify

# Check open ports
netstat -tulnp | grep snapify

# Check memory usage
pm2 monit

# Check disk I/O
iotop -o
```

---

## 🚀 4. Performance Troubleshooting

### 4.1 Performance Metrics

#### Key Performance Indicators
```bash
# Check response times
curl -w "Total: %{time_total}s\n" -o /dev/null -s http://localhost:3001/api/health

# Check memory usage
pm2 show snapify | grep memory

# Check CPU usage
top -p $(pgrep -f snapify)
```

### 4.2 Performance Issues

#### Issue: Slow API responses
**Diagnosis**:
```bash
# Check slow queries
grep -r "executionTime" logs/

# Profile database queries
npm run db:profile
```

**Solutions**:
```bash
# Add database indexes
npm run db:optimize

# Enable query caching
export ENABLE_QUERY_CACHE=true
```

#### Issue: High memory usage
**Diagnosis**:
```bash
# Check memory leaks
node --inspect server.js
# Use Chrome DevTools Memory tab

# Check heap usage
pm2 show snapify | grep heap
```

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection logging
export GC_LOG=true
```

#### Issue: Slow media processing
**Diagnosis**:
```bash
# Check image processing times
grep "processingTime" logs/snapify.log

# Profile sharp operations
npm run media:profile
```

**Solutions**:
```bash
# Optimize image processing
export IMAGE_QUALITY=80
export IMAGE_RESIZE=1200

# Enable parallel processing
export PARALLEL_PROCESSING=true
```

---

## 📦 5. Migration Guides

### 5.1 Migration Overview

#### Migration Checklist
```markdown
- [ ] Backup current system
- [ ] Review migration documentation
- [ ] Test migration in staging
- [ ] Schedule maintenance window
- [ ] Execute migration
- [ ] Verify data integrity
- [ ] Monitor post-migration
```

### 5.2 Migration Types

#### Database Migration
```bash
# Generate migration file
npm run db:generate migration_name

# Run migration
npm run db:migrate

# Rollback migration
npm run db:rollback
```

#### Storage Migration
```bash
# Migrate from local to S3
npm run storage:migrate -- --from=local --to=s3

# Verify migration
npm run storage:verify
```

#### Configuration Migration
```bash
# Export current configuration
npm run config:export > config_backup.json

# Import new configuration
npm run config:import < config_new.json
```

---

## 🗃️ 6. Data Migration Procedures

### 6.1 Data Migration Process

#### Step-by-Step Migration
```bash
# 1. Backup current data
npm run backup:create -- --type=full

# 2. Verify backup integrity
npm run backup:verify

# 3. Prepare target environment
npm run migrate:prepare

# 4. Execute migration
npm run migrate:execute -- --dry-run=false

# 5. Verify migration
npm run migrate:verify
```

### 6.2 Data Migration Tools

#### Database Migration
```bash
# Export database
sqlite3 snapify.db .dump > snapify_backup.sql

# Import database
sqlite3 new_snapify.db < snapify_backup.sql

# Verify data integrity
npm run db:verify
```

#### Media Migration
```bash
# Export media files
npm run media:export -- --path=/backup/media

# Import media files
npm run media:import -- --path=/backup/media

# Verify media integrity
npm run media:verify
```

---

## 📈 7. Version Upgrade Guides

### 7.1 Upgrade Process

#### Major Version Upgrade
```bash
# 1. Review upgrade guide
npm run docs:upgrade -- --version=2.0.0

# 2. Backup current installation
npm run backup:full

# 3. Update dependencies
npm install snapify@2.0.0

# 4. Run migration scripts
npm run migrate:upgrade -- --version=2.0.0

# 5. Verify upgrade
npm run verify:upgrade
```

### 7.2 Version Compatibility

#### Compatibility Matrix
| Version | Node.js | React | Database | Notes |
|---------|---------|-------|----------|-------|
| 1.x | 18+ | 18+ | SQLite 5.0+ | Legacy |
| 2.x | 20+ | 19+ | SQLite 5.1+ | Current |
| 3.x | 22+ | 19+ | PostgreSQL | Future |

### 7.3 Upgrade Checklist
```markdown
- [ ] Review breaking changes
- [ ] Test in staging environment
- [ ] Backup production data
- [ ] Update configuration files
- [ ] Run database migrations
- [ ] Verify all services
- [ ] Monitor post-upgrade
```

---

## 🔄 8. Rollback Procedures

### 8.1 Rollback Process

#### Emergency Rollback
```bash
# 1. Stop current services
pm2 stop snapify

# 2. Restore from backup
npm run restore:backup -- --version=1.5.0

# 3. Start services
pm2 start snapify

# 4. Verify rollback
npm run verify:rollback
```

### 8.2 Rollback Scenarios

#### Database Rollback
```bash
# Rollback last migration
npm run db:rollback -- --steps=1

# Rollback to specific version
npm run db:rollback -- --to=20231201000000
```

#### Configuration Rollback
```bash
# Restore previous configuration
npm run config:restore -- --version=1.5.0

# Verify configuration
npm run config:verify
```

### 8.3 Rollback Best Practices
```markdown
- Always test rollback procedures
- Maintain multiple backup points
- Document rollback steps
- Monitor post-rollback stability
- Communicate with stakeholders
```

---

## 🎯 Conclusion

This comprehensive troubleshooting and migration guide provides detailed procedures for:

- **Common Issues**: Solutions to frequent problems
- **Error Codes**: Complete error reference
- **Debugging**: Advanced troubleshooting techniques
- **Performance**: Optimization and monitoring
- **Migration**: Data and system migration procedures
- **Upgrades**: Version upgrade guidance
- **Rollback**: Emergency recovery procedures

**Next Steps**:
1. Bookmark this guide for quick reference
2. Familiarize yourself with common error patterns
3. Test migration procedures in staging
4. Document any new issues encountered
5. Contribute improvements to this guide

For additional support, refer to our [Developer Guides](DEVELOPER_GUIDES.md) or contact the support team.