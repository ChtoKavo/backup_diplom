@echo off
REM Скрипт для запуска проекта в режиме разработки локально
REM Автор: Configuration Script
REM Дата: 25 Декабря 2025

setlocal enabledelayedexpansion

title App - Local Development Server
color 0A

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║       App - Local Development Environment            ║
echo ║                                                      ║
echo ║  Backend:  http://localhost:5001                     ║
echo ║  Frontend: http://localhost:3000                     ║
echo ║                                                      ║
echo ║  DB: localhost (admin/qweasdzxc)                     ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Проверяем наличие Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js не найден! Пожалуйста, установите Node.js
    echo 📥 Скачайте с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверяем версию Node.js
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js найден: %NODE_VERSION%
echo.

REM Проверяем MySQL
echo Проверка MySQL подключения...
mysql -u admin -pqweasdzxc -e "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Внимание: MySQL может быть недоступна
    echo   Убедитесь, что:
    echo   - MySQL запущена
    echo   - Пользователь admin создан
    echo   - Пароль qweasdzxc верный
    echo.
    echo   Игнорируем ошибку и продолжаем...
    echo.
) else (
    echo ✅ MySQL подключение: OK
    echo.
)

echo [1/2] 🚀 Запуск Бэкенда (Express on localhost:5001)...
echo.
cd /d "%~dp0\client\express" || (
    echo ❌ Не могу найти папку express
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 📦 Установка зависимостей бэкенда...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Ошибка установки зависимостей
        pause
        exit /b 1
    )
)

echo ✅ Бэкенд готов, открываю новое окно...
start "Backend - localhost:5001" /D "%~dp0\client\express" cmd /k "npm start"

REM Даём время на запуск бэкенда
timeout /t 4 /nobreak

echo.
echo [2/2] ⚛️  Запуск Фронтенда (React on localhost:3000)...
echo.
cd /d "%~dp0\client\client" || (
    echo ❌ Не могу найти папку client
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 📦 Установка зависимостей фронтенда...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Ошибка установки зависимостей
        pause
        exit /b 1
    )
)

echo ✅ Фронтенд готов, открываю новое окно...
start "Frontend - localhost:3000" /D "%~dp0\client\client" cmd /k "npm run dev"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  ✅ Серверы запускаются!                             ║
echo ║                                                      ║
echo ║  Откройте браузер:  http://localhost:3000            ║
echo ║                                                      ║
echo ║  Backend API:       http://localhost:5001            ║
echo ║  API Status:        http://localhost:5001/status     ║
echo ║                                                      ║
echo ║  Закройте окна с серверами, чтобы остановить        ║
echo ╚══════════════════════════════════════════════════════╝
echo.

timeout /t 2

REM Открываем браузер
start http://localhost:3000

pause
