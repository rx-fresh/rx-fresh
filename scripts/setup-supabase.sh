#!/bin/bash

# Supabase Setup Script for RX Fresh
echo "Setting up Supabase for RX Fresh..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    npm install -g supabase
fi

# Initialize Supabase project (if not already done)
if [ ! -d "supabase" ]; then
    echo "Initializing Supabase project..."
    supabase init
fi

# Start local Supabase (optional for development)
echo "Do you want to start local Supabase instance? (y/n)"
read -r start_local

if [ "$start_local" = "y" ] || [ "$start_local" = "Y" ]; then
    echo "Starting local Supabase..."
    supabase start
    echo "Local Supabase started at: http://localhost:54323"
    echo "Studio UI available at: http://localhost:54323/project/default"
fi

echo "Setting up database schema..."

# Apply database schema
if [ -f "supabase/schema.sql" ]; then
    echo "Applying database schema..."
    supabase db reset --db-url "$SUPABASE_DB_URL" || echo "Please run this manually: supabase db reset"
else
    echo "Schema file not found. Please ensure supabase/schema.sql exists."
fi

# Deploy Edge Functions
echo "Do you want to deploy Edge Functions? (y/n)"
read -r deploy_functions

if [ "$deploy_functions" = "y" ] || [ "$deploy_functions" = "Y" ]; then
    echo "Deploying Edge Functions..."
    supabase functions deploy search-proxy
    supabase functions deploy validate-session
fi

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with Supabase credentials"
echo "2. Set up authentication providers in Supabase Dashboard"
echo "3. Configure email templates for magic links"
echo "4. Test the authentication flow"
echo ""
echo "Environment variables needed:"
echo "- VITE_SUPABASE_URL"
echo "- VITE_SUPABASE_ANON_KEY" 
echo "- SUPABASE_SERVICE_ROLE_KEY"
