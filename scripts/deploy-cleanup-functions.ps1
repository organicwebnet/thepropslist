# Deploy Database Cleanup Functions
# This script deploys the new garbage collection and maintenance functions

Write-Host "🚀 Deploying Database Cleanup Functions..." -ForegroundColor Green

# Check if we're in the functions directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the functions directory" -ForegroundColor Red
    exit 1
}

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI version: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    $currentUser = firebase projects:list --json | ConvertFrom-Json
    if (-not $currentUser) {
        Write-Host "❌ Not logged in to Firebase. Please run:" -ForegroundColor Red
        Write-Host "   firebase login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
} catch {
    Write-Host "❌ Error checking Firebase login status" -ForegroundColor Red
    exit 1
}

# Deploy only the cleanup functions
Write-Host "📦 Deploying cleanup functions..." -ForegroundColor Yellow

try {
    # Deploy the specific functions
    firebase deploy --only functions:cleanupOldEmails,functions:cleanupExpiredCodes,functions:cleanupFailedEmails,functions:manualCleanup,functions:databaseHealthCheck
    
    Write-Host "✅ Cleanup functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Deployed Functions:" -ForegroundColor Cyan
    Write-Host "   • cleanupOldEmails (Daily at 2 AM UTC)" -ForegroundColor White
    Write-Host "   • cleanupExpiredCodes (Every 6 hours)" -ForegroundColor White
    Write-Host "   • cleanupFailedEmails (Weekly on Sunday at 3 AM UTC)" -ForegroundColor White
    Write-Host "   • manualCleanup (Admin callable function)" -ForegroundColor White
    Write-Host "   • databaseHealthCheck (Admin callable function)" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Create required Firestore indexes (see documentation)" -ForegroundColor White
    Write-Host "   2. Test the functions using the database-maintenance.js script" -ForegroundColor White
    Write-Host "   3. Monitor the functions in Firebase Console" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Documentation: _docs/DATABASE_MAINTENANCE_AND_GARBAGE_COLLECTION.md" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
