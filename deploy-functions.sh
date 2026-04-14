#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys functions to Supabase using the access token

TOKEN="sbp_aef921f9ba75b367ba28bf2a669ab6111a75c32d"
PROJECT_ID="aebzmqnuonymevvgqczu"  # Replace with your project ID

# Get project ID from .env if available
if [ -f .env ]; then
  PROJECT_ID=$(grep VITE_SUPABASE_URL .env | cut -d'/' -f3 | cut -d'.' -f1)
fi

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "your-project-id" ]; then
  echo "Error: Could not determine project ID"
  echo "Please set VITE_SUPABASE_URL in .env file"
  exit 1
fi

echo "Deploying to project: $PROJECT_ID"

# Deploy remind-purchasing function
echo "Deploying remind-purchasing function..."
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_ID/functions/remind-purchasing/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "slug": "remind-purchasing",
  "name": "remind-purchasing",
  "body": "$(cat supabase/functions/remind-purchasing/index.ts)"
}
EOF

echo ""
echo "Deploying process-order function..."
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_ID/functions/process-order/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "slug": "process-order",
  "name": "process-order",
  "body": "$(cat supabase/functions/process-order/index.ts)"
}
EOF

echo ""
echo "Deployment complete!"
echo "Functions available at:"
echo "  - https://$PROJECT_ID.supabase.co/functions/v1/remind-purchasing"
echo "  - https://$PROJECT_ID.supabase.co/functions/v1/process-order"
