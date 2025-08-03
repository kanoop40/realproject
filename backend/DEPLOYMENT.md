# Deployment Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. "Cannot find module" Errors

**Problem:** Missing dependencies during build
```
Error: Cannot find module './debug'
Error: Cannot find module 'express'
```

**Solutions:**
```bash
# Method 1: Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Method 2: Verify package.json
npm audit fix
npm update

# Method 3: Install missing packages explicitly
npm install debug express mongoose socket.io
```

### 2. Render.com Specific Issues

**Build Configuration in Render Dashboard:**
- **Build Command:** `rm -rf node_modules package-lock.json && npm install --verbose`
- **Start Command:** `npm start`
- **Node Version:** 20.12.0
- **Environment:** Node

**Environment Variables Required:**
```
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=10000
```

### 3. Package.json Validation

Ensure your package.json has:
```json
{
  "name": "chatapp-backend",
  "version": "2.0.0",
  "main": "index.js",
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  },
  "scripts": {
    "start": "node index.js",
    "build": "npm install --production --verbose"
  }
}
```

### 4. Dependencies Check

Critical dependencies that must be installed:
- express
- debug (explicitly added)
- mongoose
- socket.io
- dotenv
- cors
- helmet

### 5. File Structure Verification

Ensure these files exist:
```
backend/
├── index.js (main entry point)
├── package.json
├── .nvmrc (contains: 20.12.0)
├── .npmrc
├── render.yaml
└── node_modules/ (auto-generated)
```

### 6. Local Testing

Before deploying, test locally:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Start application
npm start

# Check if it runs without errors
curl http://localhost:5000/api/health
```

### 7. Render.com Deploy Steps

1. **Connect Repository**
   - Link your GitHub repository
   - Select `backend` folder as root directory

2. **Configure Build**
   - Build Command: `npm install --verbose`
   - Start Command: `npm start`
   - Environment: Node.js
   - Node Version: 20.x

3. **Environment Variables**
   - Add all required env vars in Render Dashboard
   - Don't include quotes around values

4. **Deploy**
   - Trigger deploy from Dashboard
   - Monitor build logs for errors
   - Check application logs after deployment

### 8. Debug Commands

If still having issues:
```bash
# Check Node/NPM versions
node --version
npm --version

# Verify package installation
npm list --depth=0

# Check for vulnerabilities
npm audit

# Force reinstall everything
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --force
```

### 9. Render.com Environment

In Render Dashboard, verify:
- **Runtime:** Node.js
- **Region:** Singapore (closest to Thailand)
- **Plan:** Free tier
- **Build logs:** No missing dependency errors
- **Application logs:** Server starts successfully

### 10. Emergency Reset

If all else fails:
1. Delete the service in Render
2. Create new service
3. Use render.yaml configuration
4. Ensure package.json is correct
5. Redeploy with clean state
