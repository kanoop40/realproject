# Deploy to Render - Step by Step

## Pre-deployment Checklist ✅

1. **Fixed package.json merge conflict** ✅
2. **Updated .gitignore** ✅  
3. **Created render.yaml** ✅
4. **Tested build command** ✅

## Deployment Steps

### 1. Push to GitHub
```bash
# Add all files
git add .

# Commit changes
git commit -m "Fix merge conflicts and prepare for Render deployment"

# Push to GitHub
git push origin main
```

### 2. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `chatapp-backend`
   - **Environment**: `Node`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Root Directory**: `backend` (if backend is in subfolder) or leave empty
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Environment Variables

Add these in Render Dashboard → Environment Variables:

```bash
# Required
NODE_ENV=production
MONGO_URI=mongodb+srv://punchkan2547:kanoop60@cluster0.pco8lhg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=asdfghjklzxcvbnm1234567890

# Optional (has defaults)
PORT=5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
MAX_FILE_SIZE_MB=50
ALLOWED_ORIGINS=*
SOCKET_CORS_ORIGIN=*
```

### 4. Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your app will be available at: `https://chatapp-backend.onrender.com`

### 5. Test Deployment
```bash
# Health check
curl https://chatapp-backend.onrender.com/api/health

# API info
curl https://chatapp-backend.onrender.com/

# Expected response:
{
  "message": "ChatApp Backend API",
  "version": "2.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "users": "/api/users", 
    "chats": "/api/chats",
    "groups": "/api/groups",
    "notifications": "/api/notifications",
    "health": "/api/health"
  }
}
```

## Troubleshooting

### Build Fails
- Check package.json syntax
- Check Node.js version compatibility
- Review build logs in Render Dashboard

### App Crashes
- Check environment variables
- Review application logs
- Verify MongoDB connection

### CORS Issues
- Update ALLOWED_ORIGINS environment variable
- Include your frontend URL

## Important Notes

1. **Free Tier Limitations**:
   - Sleeps after 15 minutes of inactivity
   - Cold starts take 30-60 seconds
   - 512MB RAM limit

2. **File Uploads**:
   - Files uploaded to disk will be lost on redeploy
   - Consider using cloud storage (AWS S3, Cloudinary) for production

3. **Database**:
   - MongoDB Atlas free tier (512MB)
   - Set IP whitelist to 0.0.0.0/0

## Next Steps After Deployment

1. Update frontend API URL to point to Render URL
2. Test all endpoints
3. Create admin user: Use API call or run script locally
4. Monitor application logs and performance
