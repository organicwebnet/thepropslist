#!/bin/bash

# Props Bible Web App Deployment Script
echo "🚀 Starting deployment process..."

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Firebase Hosting
echo "🌐 Deploying to Firebase Hosting..."
cd ..
firebase deploy --only hosting:app

if [ $? -eq 0 ]; then
    echo "🎉 Deployment completed successfully!"
    echo "🌍 App is live at: https://props-bible-app-1c1cb.web.app"
else
    echo "❌ Deployment failed."
    exit 1
fi

