# PowerShell script to fix expo-notifications error
Write-Host "🧹 Cleaning up ChatApp project..." -ForegroundColor Yellow

# Navigate to project directory
Set-Location "c:\Users\kanoo\Desktop\project\ChatApp\ChatAppNew"

# Remove node_modules
Write-Host "📦 Removing node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
    Write-Host "✅ node_modules removed" -ForegroundColor Green
}

# Remove package-lock.json
Write-Host "🔒 Removing package-lock.json..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json"
    Write-Host "✅ package-lock.json removed" -ForegroundColor Green
}

# Install dependencies
Write-Host "⬇️ Installing dependencies..." -ForegroundColor Cyan
npm install

# Check if installation was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now run: npx expo start --tunnel" -ForegroundColor Yellow
} else {
    Write-Host "❌ Installation failed. Please check the errors above." -ForegroundColor Red
}

Write-Host "🎉 Setup completed!" -ForegroundColor Green
Read-Host "Press Enter to exit"
