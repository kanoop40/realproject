#!/bin/bash

# Script to update all UI colors to black and white theme
# Run this script from the ChatAppNew directory

echo "🎨 Updating UI theme to Black & White..."

# Define colors to replace
declare -A OLD_COLORS=(
    ["#F5C842"]="COLORS.background"
    ["#FFA500"]="COLORS.primary" 
    ["#E6B800"]="COLORS.primaryLight"
    ["#FFD700"]="COLORS.accent"
    ["#007AFF"]="COLORS.accent"
    ["#FF3B30"]="COLORS.error"
    ["#28A745"]="COLORS.success"
    ["#34c759"]="COLORS.success"
    ["#4CAF50"]="COLORS.success"
    ["#ffc107"]="COLORS.warning"
    ["#d32f2f"]="COLORS.error"
    ["#333"]="COLORS.textPrimary"
    ["#666"]="COLORS.textSecondary"
    ["#999"]="COLORS.textTertiary"
    ["#fff"]="COLORS.textInverse"
    ["#ffffff"]="COLORS.background"
    ["#e1e1e1"]="COLORS.backgroundTertiary"
    ["#f0f0f0"]="COLORS.backgroundSecondary"
    ["#f5f5f5"]="COLORS.backgroundTertiary"
    ["#f8f9fa"]="COLORS.backgroundSecondary"
    ["#ddd"]="COLORS.border"
    ["#eee"]="COLORS.border"
    ["#e0e0e0"]="COLORS.border"
)

# Files to update (add more as needed)
FILES=(
    "screens/user/ChatScreen.js"
    "screens/user/PrivateChatScreen.js" 
    "screens/user/GroupChatScreen.js"
    "screens/user/ProfileScreen.js"
    "screens/user/NewSearchUserScreen.js"
    "screens/admin/AdminScreen.js"
    "screens/admin/AddUserScreen.js"
    "screens/admin/UserDetailScreen.js"
    "screens/LoginScreen.js"
    "screens/WelcomeScreen.js"
)

# Function to update colors in a file
update_file() {
    local file="$1"
    echo "Updating $file..."
    
    if [[ ! -f "$file" ]]; then
        echo "⚠️  File not found: $file"
        return
    fi
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Replace old colors with new ones
    for old_color in "${!OLD_COLORS[@]}"; do
        new_color="${OLD_COLORS[$old_color]}"
        sed -i "s|$old_color|$new_color|g" "$file"
    done
    
    echo "✅ Updated $file"
}

# Add theme import to files that don't have it
add_theme_import() {
    local file="$1"
    if ! grep -q "COLORS.*theme" "$file"; then
        # Find the last import line and add theme import after it
        local last_import_line=$(grep -n "^import.*from" "$file" | tail -1 | cut -d: -f1)
        if [[ -n "$last_import_line" ]]; then
            sed -i "${last_import_line}a\\import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';" "$file"
            echo "Added theme import to $file"
        fi
    fi
}

# Update each file
for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        add_theme_import "$file"
        update_file "$file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo ""
echo "🎉 Theme update complete!"
echo "📝 Backup files created with .backup extension"
echo "🔍 Please review changes and test the app"
echo ""
echo "To restore backups if needed:"
echo "find . -name '*.backup' -exec bash -c 'mv \"\$1\" \"\${1%.backup}\"' _ {} \\;"
