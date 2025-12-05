# Rollback Plans for Debugging Fixes

This document outlines rollback procedures for each implemented fix in case of unexpected issues.

## 1. API URL Configuration Fix (Critical Priority)

**What was changed:**
- Enhanced `getApiUrl()` function in `services/api.ts` with environment-aware defaults and validation
- Added fallback to `http://localhost:3001` for development

**Rollback Procedure:**
```bash
# Revert services/api.ts to previous version
git checkout HEAD~1 services/api.ts

# Or manually revert the API_URL line:
const API_URL = import.meta.env.VITE_API_URL || '';
```

**Risk Assessment:** Low - Original code was functional, just had configuration issues
**Downtime Expected:** None - Can be done during maintenance window

## 2. 401 Authentication Error Handling (Critical Priority)

**What was changed:**
- Enhanced `handleApiRequest()` function with better token refresh logic
- Added monitoring integration
- Improved error detection for various 401 formats

**Rollback Procedure:**
```bash
# Revert the handleApiRequest function in services/api.ts
# Remove monitoring imports and calls
# Restore original token refresh logic
```

**Risk Assessment:** Medium - Could affect authentication flow
**Downtime Expected:** Minimal - Users may need to re-login

## 3. WebSocket Transport Priority Fix (High Priority)

**What was changed:**
- Changed transport priority from `['polling', 'websocket']` to `['websocket', 'polling']` for all devices
- Added mobile-specific optimizations
- Updated API URL usage to use shared configuration

**Rollback Procedure:**
```bash
# Revert services/socketService.ts transport configuration
# Change back to device-specific transport priority:
transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling']
```

**Risk Assessment:** Low - WebSocket connections will still work, just less optimally
**Downtime Expected:** None - Connections will automatically reconnect

## 4. COOP/postMessage Error Handling (High Priority)

**What was changed:**
- Enhanced Google Sign-In initialization with error callbacks
- Added postMessage error detection and user-friendly messages
- Improved global interface declarations

**Rollback Procedure:**
```bash
# Revert App.tsx Google Sign-In initialization
# Remove error_callback from google.accounts.id.initialize()
# Revert global interface declarations to remove optional modifiers
```

**Risk Assessment:** Low - Google Sign-In will still work, just with less error handling
**Downtime Expected:** None

## 5. Google Sign-In Initialization (High Priority)

**What was changed:**
- Added comprehensive error handling and validation
- Enhanced initialization with timeout and retry logic
- Added postMessage error handling integration

**Rollback Procedure:**
```bash
# Revert components/AuthManager.tsx GSI initialization
# Remove validation and error handling code
# Restore basic initialization logic
```

**Risk Assessment:** Low - Basic Google Sign-In functionality remains intact
**Downtime Expected:** None

## 6. Monitoring and Alerting Setup (Medium Priority)

**What was changed:**
- Added new `utils/monitoring.ts` file
- Integrated monitoring calls throughout API, WebSocket, and postMessage services
- Added error tracking, performance metrics, and alerting

**Rollback Procedure:**
```bash
# Remove monitoring imports from all files:
# - services/api.ts
# - services/socketService.ts
# - utils/postMessageUtils.ts

# Delete utils/monitoring.ts file
rm utils/monitoring.ts

# Remove monitoring calls from error handlers
```

**Risk Assessment:** Low - Application functions without monitoring
**Downtime Expected:** None

## General Rollback Guidelines

### Emergency Rollback Process:
1. **Identify the problematic fix** using error logs and monitoring data
2. **Stop the application** to prevent further issues
3. **Revert the specific changes** using the procedures above
4. **Test the rollback** in a staging environment
5. **Deploy the rollback** with minimal downtime
6. **Monitor for resolution** of the original issue

### Testing After Rollback:
- Verify core functionality works
- Check that the original error categories are not reintroduced
- Monitor for any new issues introduced by the rollback
- Validate user authentication and real-time features

### Backup Strategy:
- Always create a backup before implementing fixes
- Use feature flags where possible for gradual rollouts
- Have a staging environment for testing rollbacks

### Communication Plan:
- Notify stakeholders of rollback decision and timeline
- Provide status updates during rollback process
- Document lessons learned for future fixes