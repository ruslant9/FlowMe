@echo off
CHCP 65001 >nul
SETLOCAL ENABLEDELAYEDEXPANSION

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
FOR /R "%FRONTEND_DIR%" %%F IN (*) DO (
    CALL :shouldCopy "%%F"
)
echo ✅ Файлы из Frontend скопированы.
echo.

:: 3. Копирование файлов из PUBLIC
echo 📦 Копирование файлов из %PUBLIC_DIR%...
FOR %%F IN ("%PUBLIC_DIR%\*") DO (
    CALL :shouldCopy "%%F"
)
echo ✅ Файлы из Public скопированы.
echo.

:: 4. Копирование файлов из BACKEND
echo 📦 Поиск и копирование файлов из %BACKEND_DIR%...
FOR /R "%BACKEND_DIR%" %%F IN (*) DO (
    CALL :shouldCopy "%%F"
)
echo ✅ Файлы из Backend скопированы.
echo.

echo ==================================================
echo.
echo ✨ Готово! Все исходные файлы собраны в %DEST_DIR%
echo.
echo ==================================================
EXIT /B

:: --- Функция проверки — исключение ненужных файлов ---
:shouldCopy
SET "file=%~1"
SET "name=%~nx1"
SET "ext=%~x1"
SET "lowerext=!ext:.=!"
SET "path=%~dp1"

:: Пропуск по расширениям изображений
FOR %%E IN (png jpg jpeg gif ico svg) DO (
    IF /I "!lowerext!"=="%%E" EXIT /B
)

:: Пропуск по названиям
FOR %%N IN (favicon.svg vite.svg react.svg README.md .gitignore package-lock.json) DO (
    IF /I "!name!"=="%%N" EXIT /B
)

:: Пропуск по папкам и конкретным путям
ECHO !file! | findstr /I /C:"node_modules" >nul && EXIT /B
ECHO !file! | findstr /I /C:"uploads" >nul && EXIT /B
ECHO !file! | findstr /I /C:"src\assets" >nul && EXIT /B
ECHO !file! | findstr /I /C:"AnimatedSphere.scss" >nul && EXIT /B

:: Пропуск .env
IF /I "!name!"==".env" EXIT /B

:: Иначе копировать
CALL :copyFile "!file!"
EXIT /B

:: --- Копирование файла с защитой от перезаписи ---
:copyFile
SET "sourceFile=%~1"
SET "destFile=%DEST_DIR%\%~nx1"
SET /A counter=0

:checkFile
IF EXIST "!destFile!" (
    SET /A counter+=1
    SET "destFile=%DEST_DIR%\%~n1_!counter!%~x1"
    GOTO :checkFile
)

echo    Копируется: "!sourceFile!" → "!destFile!"
copy "!sourceFile!" "!destFile!" /Y >nul
EXIT /B
