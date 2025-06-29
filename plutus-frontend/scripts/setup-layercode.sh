#!/bin/bash

echo "🚀 Setting up Layercode Voice Agent..."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "✅ Created .env.local from template"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🔧 Next steps:"
echo "1. Get your Layercode Pipeline ID from: https://dash.layercode.com"
echo "2. Edit .env.local and replace 'your_pipeline_id_here' with your actual pipeline ID"
echo "3. Make sure your plutus-server is running on port 3000"
echo "4. Run 'npm run dev' to start the frontend"
echo ""
echo "📖 For more help, see: ENVIRONMENT_SETUP.md" 