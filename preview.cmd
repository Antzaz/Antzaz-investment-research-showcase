@echo off
setlocal

for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="pre-release-showcase" (
  echo.
  echo ERROR: Local preview must be run from pre-release-showcase.
  echo Current branch: %BRANCH%
  echo.
  exit /b 1
)

where py >nul 2>&1
if %errorlevel%==0 (
  set "PYTHON=py"
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    set "PYTHON=python"
  ) else (
    echo.
    echo ERROR: Python was not found. Install Python or add it to PATH.
    echo.
    exit /b 1
  )
)

set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%"

echo.
echo PRIVATE PRE-RELEASE SHOWCASE
echo Branch: %BRANCH%
echo URL:    %URL%
echo Bound to localhost only. Nothing is deployed publicly.
echo Press Ctrl+C to stop the preview server.
echo.

start "" "%URL%"
%PYTHON% -m http.server %PORT% --bind 127.0.0.1
