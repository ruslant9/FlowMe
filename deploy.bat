@echo off
chcp 65001 > nul
title Deploy FlowMe to Render.com

:: --- СКРИПТ АВТОМАТИЧЕСКОГО ДЕПЛОЯ НА GITHUB ---

cls

echo ==========================================================
echo.
echo    FlowMe Deployment Script
echo    Repository: https://github.com/ruslant9/FlowMe
echo.
echo ==========================================================
echo.

D:
cd "D:\онлайн сайт\social-app"

if not exist .git (
    echo.
    echo [ERROR] Git-репозиторий не найден в папке:
    echo "D:\онлайн сайт\social-app"
    echo Пожалуйста, убедитесь, что вы выполнили шаги по инициализации репозитория.
    echo.
    pause
    exit /b
)

echo [INFO] Текущий статус репозитория:
echo.
git status
echo.
echo ==========================================================
echo.

echo [ACTION] Добавляем все файлы в отслеживание (git add .)...
git add .
echo [SUCCESS] Файлы добавлены.
echo.

echo [INPUT] Введите описание изменений (для коммита) и нажмите Enter:
set /p commit_message=" > "

if "%commit_message%"=="" set commit_message="Update and deploy project"

:: --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Дополнительные кавычки вокруг сообщения ---
echo [ACTION] Создаем коммит с сообщением: %commit_message% ...
git commit -m "%commit_message%"
echo [SUCCESS] Коммит создан.
echo.

echo [ACTION] Отправляем изменения на GitHub (git push origin main)...
echo.
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ошибка при отправке на GitHub!
    echo Проверьте сообщения об ошибках выше.
) else (
    echo.
    echo [SUCCESS] Изменения успешно отправлены на GitHub!
    echo Render.com автоматически начнет процесс развертывания.
)

echo.
echo ==========================================================
echo.
echo Нажмите любую клавишу для выхода...
pause > nul