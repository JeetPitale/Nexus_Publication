#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "------------------------------------------------------"
echo " Starting Research Publications Nexus Backend"
echo "------------------------------------------------------"

# Change to the backend directory
cd "$DIR/backend"

# Check if XAMPP PHP exists, otherwise use system PHP
PHP_CMD="php"
if [ -f "/Applications/XAMPP/xamppfiles/bin/php" ]; then
    PHP_CMD="/Applications/XAMPP/xamppfiles/bin/php"
fi

echo "Using PHP: $PHP_CMD"
echo "Backend is running at: http://localhost:8000"
echo "Press Ctrl+C to stop the server."
echo "------------------------------------------------------"

# Start the PHP server
$PHP_CMD -S localhost:8000
