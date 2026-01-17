# Fly.io Deployment Helper Script for Windows PowerShell
# This script helps you deploy your backend to Fly.io

param(
    [switch]$Setup,
    [switch]$Deploy,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Open
)

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "🚀 KKS Online Backend - Fly.io Deployment Helper"
Write-Output ""

if ($Setup) {
    Write-ColorOutput Yellow "📋 Setting up Fly.io app..."
    
    # Check if fly CLI is installed
    try {
        $flyVersion = fly version 2>&1
        Write-ColorOutput Green "✅ Fly CLI is installed"
    } catch {
        Write-ColorOutput Red "❌ Fly CLI not found. Installing..."
        Write-Output "Run: iwr https://fly.io/install.ps1 -useb | iex"
        exit 1
    }
    
    # Initialize Fly.io app
    Write-ColorOutput Yellow "Initializing Fly.io app (this will create fly.toml if it doesn't exist)..."
    fly launch --no-deploy
    
    Write-ColorOutput Green "✅ Setup complete!"
    Write-ColorOutput Yellow "⚠️  Don't forget to set your secrets:"
    Write-Output "   fly secrets set DATABASE_URL=your_database_url"
    Write-Output "   fly secrets set SUPABASE_URL=your_supabase_url"
    Write-Output "   (See DEPLOYMENT.md for full list)"
    Write-Output ""
    Write-ColorOutput Cyan "Next step: Set all required secrets, then run: .\deploy.ps1 -Deploy"
}

if ($Deploy) {
    Write-ColorOutput Yellow "🚀 Deploying to Fly.io..."
    fly deploy
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Deployment successful!"
        Write-Output ""
        Write-ColorOutput Cyan "Your app is live at: https://$(fly status --json | ConvertFrom-Json).Hostname"
    } else {
        Write-ColorOutput Red "❌ Deployment failed. Check the logs above."
        exit 1
    }
}

if ($Status) {
    Write-ColorOutput Yellow "📊 Checking app status..."
    fly status
    Write-Output ""
    Write-ColorOutput Yellow "💰 Current scale:"
    fly scale show
}

if ($Logs) {
    Write-ColorOutput Yellow "📋 Viewing logs (Ctrl+C to exit)..."
    fly logs
}

if ($Open) {
    Write-ColorOutput Yellow "🌐 Opening app in browser..."
    fly open
}

if (-not ($Setup -or $Deploy -or $Status -or $Logs -or $Open)) {
    Write-ColorOutput Yellow "Usage:"
    Write-Output "  .\deploy.ps1 -Setup    # Initialize Fly.io app"
    Write-Output "  .\deploy.ps1 -Deploy   # Deploy your app"
    Write-Output "  .\deploy.ps1 -Status   # Check app status"
    Write-Output "  .\deploy.ps1 -Logs     # View logs"
    Write-Output "  .\deploy.ps1 -Open     # Open app in browser"
    Write-Output ""
    Write-ColorOutput Cyan "For detailed instructions, see DEPLOYMENT.md"
}
