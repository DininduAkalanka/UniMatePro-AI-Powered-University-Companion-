#!/bin/bash

# UniMate Security Setup Script
# Run this script after cloning the repository

echo "🔒 UniMate Security Setup"
echo "=========================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Copy .env.example to .env
echo "📝 Creating .env file from template..."
cp .env.example .env

if [ $? -eq 0 ]; then
    echo "✅ .env file created successfully"
else
    echo "❌ Failed to create .env file"
    exit 1
fi

echo ""
echo "⚙️  Configuration Required"
echo "=========================="
echo ""
echo "Please configure the following in your .env file:"
echo ""
echo "1. 🤖 Hugging Face API Key"
echo "   Get it from: https://huggingface.co/settings/tokens"
echo "   Variable: EXPO_PUBLIC_HUGGING_FACE_API_KEY"
echo ""
echo "2. 🔥 Firebase Configuration"
echo "   Get it from: https://console.firebase.google.com"
echo "   Navigate to: Project Settings > General > Your apps > Web app"
echo "   Variables:"
echo "   - EXPO_PUBLIC_FIREBASE_API_KEY"
echo "   - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "   - EXPO_PUBLIC_FIREBASE_PROJECT_ID"
echo "   - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "   - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "   - EXPO_PUBLIC_FIREBASE_APP_ID"
echo ""
echo "3. 🐛 Sentry (Optional)"
echo "   Get it from: https://sentry.io/settings/projects/"
echo "   Variable: EXPO_PUBLIC_SENTRY_DSN"
echo ""

# Open .env in default editor
read -p "Open .env file now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo "Please open .env manually in your editor"
    fi
fi

echo ""
echo "📋 Next Steps"
echo "============="
echo ""
echo "1. Edit .env and add your API keys"
echo "2. Never commit .env to version control"
echo "3. Deploy Firebase Security Rules:"
echo "   firebase deploy --only firestore:rules"
echo "4. Read SECURITY.md for complete setup guide"
echo ""
echo "✨ Setup complete! Happy coding!"
