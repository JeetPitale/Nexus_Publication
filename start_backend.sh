#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "------------------------------------------------------"
echo " Starting Research Publications Nexus Backend"
echo "------------------------------------------------------"

# Change to the backend directory
cd "$DIR/backend"

echo "Using Node.js Backend connected to MongoDB"
echo "Backend is running at: http://localhost:8001"
echo "Press Ctrl+C to stop the server."
echo "------------------------------------------------------"

# Start the Node server
npm start
