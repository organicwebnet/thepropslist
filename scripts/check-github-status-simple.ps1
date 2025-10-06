# Simple GitHub Actions Status Checker
# This script checks the status of recent GitHub Actions workflows

param(
    [string]$Owner = "organicwebnet",
    [string]$Repo = "thepropslist",
    [int]$Count = 10
)

Write-Host "🔍 Checking GitHub Actions Status for $Owner/$Repo" -ForegroundColor Cyan
Write-Host ""

try {
    # Get recent workflow runs
    $url = "https://api.github.com/repos/$Owner/$Repo/actions/runs?per_page=$Count"
    Write-Host "📡 Fetching data from: $url" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{
        'Accept' = 'application/vnd.github.v3+json'
        'User-Agent' = 'GitHub-Status-Checker'
    }
    
    Write-Host "📊 Recent Workflow Runs:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($run in $response.workflow_runs) {
        $status = $run.status
        $conclusion = $run.conclusion
        $workflowName = $run.name
        $createdAt = [DateTime]::Parse($run.created_at).ToString("yyyy-MM-dd HH:mm:ss")
        $runUrl = $run.html_url
        
        # Color coding
        $statusColor = switch ($conclusion) {
            "success" { "Green" }
            "failure" { "Red" }
            "cancelled" { "Yellow" }
            default { "White" }
        }
        
        $statusIcon = switch ($conclusion) {
            "success" { "✅" }
            "failure" { "❌" }
            "cancelled" { "⏹️" }
            default { "⏳" }
        }
        
        Write-Host "$statusIcon $workflowName" -ForegroundColor $statusColor
        Write-Host "   Status: $status | Conclusion: $conclusion" -ForegroundColor Gray
        Write-Host "   Created: $createdAt" -ForegroundColor Gray
        Write-Host "   URL: $runUrl" -ForegroundColor Blue
        Write-Host ""
    }
    
    # Summary
    $successCount = ($response.workflow_runs | Where-Object { $_.conclusion -eq "success" }).Count
    $failureCount = ($response.workflow_runs | Where-Object { $_.conclusion -eq "failure" }).Count
    $totalCount = $response.workflow_runs.Count
    
    Write-Host "📈 Summary:" -ForegroundColor Yellow
    Write-Host "   Total Runs: $totalCount" -ForegroundColor White
    Write-Host "   ✅ Successful: $successCount" -ForegroundColor Green
    Write-Host "   ❌ Failed: $failureCount" -ForegroundColor Red
    
    if ($failureCount -gt 0) {
        Write-Host ""
        Write-Host "🚨 There are $failureCount failed workflows!" -ForegroundColor Red
        Write-Host "   Check the URLs above for detailed error information." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "🎉 All recent workflows are successful!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error checking GitHub Actions status:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 This script doesn't require authentication for public repositories." -ForegroundColor Yellow
    Write-Host "   If you're getting rate limit errors, wait a few minutes and try again." -ForegroundColor Yellow
}