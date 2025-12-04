# 🚀 SnapifY Production Deployment Guide

## 📋 Overview

This guide provides comprehensive documentation for the SnapifY production deployment system. The system is designed specifically for production server environments and focuses on **reliability, safety, and minimal downtime**.

---

## 🏗️ Deployment Architecture

### **Simplified Production Deployment System**

The deployment system consists of two main components:

1. **ProductionDeploymentSystem.js** - Node.js-based deployment orchestrator
2. **deploy-production.sh** - Bash script for simplified deployments

### **Key Features**

- ✅ **Safe Deployment Strategies**: Rolling, Immediate, and Maintenance modes
- ✅ **Automatic Backups**: Creates backups before every deployment
- ✅ **Health Checks**: Verifies application health post-deployment
- ✅ **Rollback Capability**: Automatic rollback on failure
- ✅ **Comprehensive Logging**: Detailed deployment logs and reports
- ✅ **Service Management**: Handles PM2 and Nginx restarts

---

## 📦 Deployment Components

### **1. ProductionDeploymentSystem.js**

A comprehensive Node.js deployment orchestrator with:

- **Environment Validation**: Checks required variables and permissions
- **Pre-Deployment Checks**: Database connectivity, application health, disk space
- **Backup System**: Creates timestamped backups with automatic cleanup
- **Build Automation**: Runs build process with size validation
- **Deployment Strategies**: Multiple strategies for different scenarios
- **Post-Deployment Verification**: Health checks and smoke tests
- **Rollback System**: Automatic recovery on failure
- **Reporting**: Generates detailed deployment reports

### **2. deploy-production.sh**

A simplified bash script for quick deployments:

- **Environment Validation**: Basic checks before deployment
- **Backup Creation**: Simple file backup system
- **Build Process**: Runs npm build command
- **File Deployment**: Copies files to production
- **Service Restart**: Handles PM2 and Nginx
- **Verification**: Basic health checks
- **Cleanup**: Removes temporary files

---

## 🚀 Deployment Strategies

### **1. Rolling Deployment (Default)**

```bash
node production-deploy/ProductionDeploymentSystem.js deploy
```

**Characteristics:**
- Deploy in small batches
- Minimal downtime
- Safe for production
- Automatic service restarts

**Use Case:** Standard production deployments

### **2. Immediate Deployment**

```bash
# Configure in ProductionDeploymentSystem.js
strategy: 'immediate'
```

**Characteristics:**
- Stop all services first
- Deploy all files at once
- Restart services
- Faster but with downtime

**Use Case:** Emergency fixes, critical updates

### **3. Maintenance Deployment**

```bash
# Configure in ProductionDeploymentSystem.js
strategy: 'maintenance'
```

**Characteristics:**
- Puts site in maintenance mode
- Performs deployment
- Disables maintenance mode
- User-friendly maintenance page

**Use Case:** Major updates, database migrations

---

## 📋 Deployment Commands

### **Using npm scripts (recommended)**

```bash
# Create backup
npm run deploy:backup

# Verify current deployment
npm run deploy:verify

# Perform rollback
npm run deploy:rollback

# Full production deployment
npm run deploy:production

# Simple bash deployment
npm run deploy:simple

# Check service status
npm run deploy:status
```

### **Direct Node.js execution**

```bash
# Full deployment
node production-deploy/ProductionDeploymentSystem.js deploy

# Create backup only
node production-deploy/ProductionDeploymentSystem.js backup

# Verify deployment
node production-deploy/ProductionDeploymentSystem.js verify

# Perform rollback
node production-deploy/ProductionDeploymentSystem.js rollback
```

### **Bash script execution**

```bash
# Simple deployment
bash production-deploy/deploy-production.sh

# With environment variables
PRODUCTION_HOST="snapify.com" bash production-deploy/deploy-production.sh
```

---

## 🔧 Configuration

### **Environment Variables**

Create `.env.production` file:

```env
# Production Host
PRODUCTION_HOST=snapify.com
PRODUCTION_PORT=3000

# Database
DB_CONNECTION=your_database_connection_string
DB_HOST=localhost
DB_USER=production_user
DB_PASS=secure_password

# Security
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_session_secret

# AWS (if used)
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=us-east-1
```

### **Deployment Configuration**

Modify `ProductionDeploymentSystem.js` for custom configuration:

```javascript
// In ProductionDeploymentSystem.js
config: {
  deployment: {
    strategy: 'rolling', // 'rolling', 'immediate', 'maintenance'
    batchSize: 1,
    waitTimeBetweenBatches: 10000,
    rollbackOnFailure: true,
    backupBeforeDeployment: true
  },
  environments: {
    production: {
      maxBackups: 5,
      healthCheckEndpoint: '/health',
      healthCheckInterval: 5000,
      maxHealthCheckAttempts: 3
    }
  }
}
```

---

## 🛡️ Safety Features

### **Automatic Backups**

- Creates timestamped backups before deployment
- Keeps last 5 backups by default
- Backup directory: `production-deploy/backups/`

### **Health Checks**

- Verifies database connectivity
- Checks application health endpoints
- Multiple retry attempts
- Automatic rollback on failure

### **Rollback System**

- Automatic rollback on deployment failure
- Manual rollback command available
- Restores from most recent backup
- Restarts services after rollback

### **File Integrity**

- Verifies critical files post-deployment
- Checks file permissions
- Validates file sizes

---

## 📊 Monitoring and Reporting

### **Deployment Reports**

- Generated after every deployment
- Location: `production-deploy/reports/`
- Format: JSON with detailed metrics
- Includes timing, events, and status

### **Log Files**

- Comprehensive logging during deployment
- Timestamps for all events
- Success/failure tracking
- Performance metrics

---

## 🚧 Troubleshooting

### **Common Issues and Solutions**

#### **1. Deployment fails with permission errors**

```bash
# Solution: Run with appropriate permissions
sudo chown -R $USER:$USER .
sudo chmod -R 755 production-deploy/
```

#### **2. Build process fails**

```bash
# Solution: Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### **3. Service restart fails**

```bash
# Solution: Manual service management
pm2 restart all
sudo systemctl restart nginx
```

#### **4. Health checks fail**

```bash
# Solution: Check application logs
pm2 logs
journalctl -u nginx -f
```

---

## 🎯 Best Practices

### **Pre-Deployment Checklist**

1. ✅ **Test in staging environment first**
2. ✅ **Create manual backup** (`npm run deploy:backup`)
3. ✅ **Check current deployment status** (`npm run deploy:status`)
4. ✅ **Verify database connectivity**
5. ✅ **Check disk space** (`df -h`)
6. ✅ **Notify team about deployment**
7. ✅ **Schedule during low-traffic period**

### **Post-Deployment Checklist**

1. ✅ **Verify deployment success** (`npm run deploy:verify`)
2. ✅ **Check application logs** (`pm2 logs`)
3. ✅ **Test critical user flows**
4. ✅ **Monitor performance metrics**
5. ✅ **Check error reporting**
6. ✅ **Notify team about completion**
7. ✅ **Document any issues**

---

## 📈 Performance Optimization

### **Deployment Performance Tips**

1. **Use rolling deployment** for minimal downtime
2. **Schedule during off-peak hours** for major updates
3. **Monitor build sizes** to prevent bloat
4. **Clean up old backups** regularly
5. **Use maintenance mode** for major changes

### **Build Optimization**

```bash
# Analyze build performance
npm run build -- --profile

# Optimize dependencies
npm prune --production
```

---

## 🔄 Rollback Procedures

### **Automatic Rollback**

- Triggered automatically on deployment failure
- Uses most recent backup
- Restarts all services

### **Manual Rollback**

```bash
# Manual rollback command
npm run deploy:rollback

# Or using Node.js directly
node production-deploy/ProductionDeploymentSystem.js rollback
```

### **Emergency Rollback**

If automated rollback fails:

1. **Stop current services**:
   ```bash
   pm2 stop all
   sudo systemctl stop nginx
   ```

2. **Restore from backup manually**:
   ```bash
   # Find latest backup
   ls -t production-deploy/backups/

   # Restore files (example)
   cp -r production-deploy/backups/latest/* .
   ```

3. **Restart services**:
   ```bash
   pm2 start ecosystem.config.cjs
   sudo systemctl start nginx
   ```

---

## 📚 Deployment Examples

### **Standard Production Deployment**

```bash
# Update code
git pull origin main

# Install dependencies
npm install

# Run full deployment
npm run deploy:production
```

### **Emergency Hotfix Deployment**

```bash
# Quick deployment using bash script
npm run deploy:simple
```

### **Maintenance Mode Deployment**

```bash
# Configure maintenance strategy
# Edit ProductionDeploymentSystem.js to set strategy: 'maintenance'

# Run deployment
npm run deploy:production
```

### **Rollback to Previous Version**

```bash
# Perform rollback
npm run deploy:rollback
```

---

## 🎯 Conclusion

This production deployment system provides a **safe, reliable, and efficient** way to deploy SnapifY updates to production servers. The system is designed with **multiple safety mechanisms** to prevent downtime and data loss.

**Key Benefits:**
- ✅ Minimal downtime with rolling deployments
- ✅ Automatic backups and rollback capability
- ✅ Comprehensive health checking
- ✅ Detailed logging and reporting
- ✅ Multiple deployment strategies
- ✅ Production-optimized workflows

For any deployment issues, refer to the troubleshooting section or consult the development team.