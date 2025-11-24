@echo off
REM UniMate Security Setup Script for Windows
REM Run this script after cloning the repository

echo ========================================
echo UniMate Security Setup
echo ========================================
echo.

REM Check if .env exists
if exist .env (
    echo WARNING: .env file already exists
    set /p "overwrite=Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo Setup cancelled
        exit /b 1
    )
)

REM Copy .env.example to .env
echo Creating .env file from template...
copy .env.example .env >nul 2>&1

if %errorlevel% equ 0 (
    echo [SUCCESS] .env file created successfully
) else (
    echo [ERROR] Failed to create .env file
    exit /b 1
)

echo.
echo ========================================
echo Configuration Required
echo ========================================
echo.
echo Please configure the following in your .env file:
echo.
echo 1. Hugging Face API Key
echo    Get it from: https://huggingface.co/settings/tokens
echo    Variable: EXPO_PUBLIC_HUGGING_FACE_API_KEY
echo.
echo 2. Firebase Configuration
echo    Get it from: https://console.firebase.google.com
echo    Navigate to: Project Settings ^> General ^> Your apps ^> Web app
echo    Variables:
echo    - EXPO_PUBLIC_FIREBASE_API_KEY
echo    - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
echo    - EXPO_PUBLIC_FIREBASE_PROJECT_ID
echo    - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
echo    - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
echo    - EXPO_PUBLIC_FIREBASE_APP_ID
echo.
echo 3. Sentry (Optional)
echo    Get it from: https://sentry.io/settings/projects/
echo    Variable: EXPO_PUBLIC_SENTRY_DSN
echo.

REM Open .env in default editor
set /p "openfile=Open .env file now? (y/N): "
if /i "%openfile%"=="y" (
    if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (
        "%ProgramFiles%\Microsoft VS Code\Code.exe" .env
    ) else (
        notepad .env
    )
)

echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Edit .env and add your API keys
echo 2. Never commit .env to version control
echo 3. Deploy Firebase Security Rules:
echo    firebase deploy --only firestore:rules
echo 4. Read SECURITY.md for complete setup guide
echo.
echo Setup complete! Happy coding!
echo.
pause
