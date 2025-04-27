#!/bin/bash
# Deployment script for Options AMM app

# Ensure the script exits if any command fails
set -e

# Display banner
echo "===================================="
echo "Options AMM Deployment Script"
echo "===================================="

# Set environment variables if needed
if [ ! -f .env.local ]; then
  echo "Creating .env.local file with default values..."
  cat > .env.local << EOF
# Contract addresses
NEXT_PUBLIC_OPTION_AMM_ADDRESS=0x170D1256a2CB057dAcDEEBBCcB6DDd0b19f660Fe
NEXT_PUBLIC_USDC_ADDRESS=0x828A4f80312F62D4BbAbCD9438Dc3B6fD1d69A34

# Network configuration
NEXT_PUBLIC_FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
NEXT_PUBLIC_FLARE_CHAIN_ID=114

# WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=782f79947e03ce155a9226b7e15a8ccf

# App metadata
NEXT_PUBLIC_APP_NAME=Options AMM
NEXT_PUBLIC_APP_DESCRIPTION=Options trading platform on Flare Network
NEXT_PUBLIC_APP_URL=https://options-amm.app
NEXT_PUBLIC_APP_ICON=https://walletconnect.com/walletconnect-logo.png
EOF
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the application
echo "Building the application..."
npm run clean-build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful!"
  echo "To start the application, run: npm start"
  echo "To deploy to production, run: npm run deploy (requires additional setup)"
else
  echo "Build failed. Check the errors above."
  exit 1
fi