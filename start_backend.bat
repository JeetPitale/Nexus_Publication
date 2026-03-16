@echo off
echo ------------------------------------------------------
echo  Starting Research Publications Nexus Backend
echo ------------------------------------------------------

:: Change to the backend directory
cd /d "%~dp0backend"

:: Check if XAMPP PHP exists in the default Windows location, otherwise use system PHP
SET PHP_CMD=php
IF EXIST "C:\xampp\php\php.exe" (
    SET PHP_CMD="C:\xampp\php\php.exe"
)

echo Using PHP: %PHP_CMD%
echo Backend is running at: http://localhost:8000
echo Press Ctrl+C to stop the server.
echo ------------------------------------------------------

:: Start the PHP server
%PHP_CMD% -S localhost:8000
pause
