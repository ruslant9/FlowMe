@echo off
CHCP 65001 >nul
SETLOCAL

:: --- КОНФИГУРАЦИЯ ---
SET "FRONTEND_DIR=frontend"
SET "BACKEND_DIR=backend"
SET "PUBLIC_DIR=frontend\public"
SET "DEST_DIR=D:\Для AI"

echo ==================================================
echo.
echo      Сбор всех исходников в одну папку (Финальная версия)
echo.
echo ==================================================
echo.

:: 1. Очистка и создание папки назначения
IF EXIST "%DEST_DIR%" (
    echo 🧹 Очистка папки назначения %DEST_DIR%...
    rmdir /S /Q "%DEST_DIR%"
)
echo 🟡 Создание папки назначения %DEST_DIR%...
mkdir "%DEST_DIR%"
echo.

:: 2. Копирование файлов из FRONTEND
echo 📦 Поиск и копирование файлов из %FRONTEND_DIR%...
:: Добавлены в исключения: .env, README.md, .gitignore, react.svg, vite.svg, *.png, *.jpg, *.jpeg, *.gif, *.ico, *.svg (ВСЕ КАРТИНКИ) + src\assets, AnimatedSphere.scss
FOR /F "delims=" %%F in ('dir /s /b /a-d "%FRONTEND_DIR%" ^| findstr /v /i ".env node_modules public package-lock.json README.md .gitignore react.svg vite.svg *.png *.jpg *.jpeg *.gif *.ico *.svg frontend\\src\\assets AnimatedSphere.scss"') DO (
    ECHO "FRONTEND: %%F"
    CALL :copyFile "%%F"
)
echo ✅ Файлы из Frontend скопированы.
echo.

:: 3. Копирование файлов из папки PUBLIC
echo 📦 Копирование файлов из %PUBLIC_DIR%...
:: Добавлены в исключения: react.svg, vite.svg, *.png, *.jpg, *.jpeg, *.gif, *.ico, *.svg (ВСЕ КАРТИНКИ), favicon.svg
FOR /F "delims=" %%F in ('dir /b /a-d "%PUBLIC_DIR%" ^| findstr /v /i "favicon.svg react.svg vite.svg *.png *.jpg *.jpeg *.gif *.ico *.svg"') DO (
    ECHO "PUBLIC: %%F"
    CALL :copyFile "%PUBLIC_DIR%\%%F"
)
echo ✅ Файлы из Public скопированы.
echo.


:: 4. Копирование файлов из BACKEND
echo 📦 Поиск и копирование файлов из %BACKEND_DIR%...
:: Добавлены в исключения: .env, README.md, .gitignore, *.png, *.jpg, *.jpeg, *.gif, *.ico, *.svg (ВСЕ КАРТИНКИ), uploads
FOR /F "delims=" %%F in ('dir /s /b /a-d "%BACKEND_DIR%" ^| findstr /v /i ".env node_modules package-lock.json README.md .gitignore *.png *.jpg *.jpeg *.gif *.ico *.svg backend\\uploads"') DO (
    ECHO "BACKEND: %%F"
    CALL :copyFile "%%F"
)
echo ✅ Файлы из Backend скопированы.
echo.


echo ==================================================
echo.
echo ✨ Готово! Все исходные файлы собраны в %DEST_DIR%
echo.
echo ==================================================
:: pause  - Убрано, чтобы консоль закрывалась автоматически
EXIT

:copyFile
SET "sourceFile=%~1"
SET "destFile=%DEST_DIR%\%~nx1"  :: Append counter if needed
SET "counter="
:checkFile
IF EXIST "%destFile%" (
    SET /A counter+=1
    SET "destFile=%DEST_DIR%\%~n1_%counter%%~x1"
    GOTO :checkFile
)

echo    Копируется: "%sourceFile%" в "%destFile%"
copy "%sourceFile%" "%destFile%" /Y >nul
EXIT /B