@echo off
cd /d "c:\Users\kanoo\Desktop\project\ChatApp\frontend"
echo Current directory: %CD%
echo Starting Expo with tunnel mode...
yarn start --tunnel --clear
