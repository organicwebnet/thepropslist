# GitHub Actions Status Checker (PowerShell)
# 
# This script checks the status of recent GitHub Actions workflows
# and provides information about any failures.

param(
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$Owner = "organicwebnet",
    [string]$Repo = "thepropslist"
)

if (-not $Token) {
    Write-Host "❌ GITHUB_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Please set your GitHub token: `$env:GITHUB_TOKEN = 'your_token_here'" -ForegroundColor Yellow
    exit 1
}

function Get-GitHubWorkflowRuns {
    param([string]$Endpoint)
    
    $headers = @{
        'Authorization' = "token $Token"
        'User-Agent' = 'GitHub-Actions-Status-Checker'
        'Accept' = 'application/vnd.github.v3+json'
    }
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo$Endpoint" -Headers $headers
        return $response
    }
    catch {
        Write-Host "❌ Error making GitHub API request: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Show-WorkflowStatus {
    Write-Host "🔍 Checking recent workflow runs..." -ForegroundColor Cyan
    Write-Host ""
    
    $runs = Get-GitHubWorkflowRuns -Endpoint "/actions/runs?per_page=10"
    
    if (-not $runs -or -not $runs.workflow_runs) {
        Write-Host "❌ No workflow runs found" -ForegroundColor Red
        return
    }
    
    Write-Host "📊 Found $($runs.workflow_runs.Count) recent workflow runs:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($run in $runs.workflow_runs) {
        $status = $run.status
        $conclusion = $run.conclusion
        $workflowName = $run.name
        $branch = $run.head_branch
        $createdAt = [DateTime]::Parse($run.created_at).ToString("yyyy-MM-dd HH:mm:ss")
        $runUrl = $run.html_url
        
        # Status emoji
        $statusEmoji = switch ($status) {
            "completed" {
                switch ($conclusion) {
                    "success" { "✅" }
                    "failure" { "❌" }
                    "cancelled" { "⏹️" }
                    default { "❓" }
                }
            }
            "in_progress" { "🔄" }
            default { "❓" }
        }
        
        Write-Host "$statusEmoji $workflowName" -ForegroundColor White
        Write-Host "   Branch: $branch" -ForegroundColor Gray
        Write-Host "   Status: $status$(if ($conclusion) { " ($conclusion)" })" -ForegroundColor Gray
        Write-Host "   Created: $createdAt" -ForegroundColor Gray
        Write-Host "   URL: $runUrl" -ForegroundColor Blue
        Write-Host ""
        
        # If it's a failure, get more details
        if ($conclusion -eq "failure") {
            Write-Host "   🔍 Getting failure details..." -ForegroundColor Yellow
            try {
                $jobs = Get-GitHubWorkflowRuns -Endpoint "/actions/runs/$($run.id)/jobs"
                if ($jobs -and $jobs.jobs) {
                    foreach ($job in $jobs.jobs) {
                        if ($job.conclusion -eq "failure") {
                            Write-Host "   ❌ Failed Job: $($job.name)" -ForegroundColor Red
                            Write-Host "   📝 Steps:" -ForegroundColor Yellow
                            foreach ($step in $job.steps) {
                                if ($step.conclusion -eq "failure") {
                                    Write-Host "      - $($step.name): $($step.conclusion)" -ForegroundColor Red
                                }
                            }
                        }
                    }
                }
            }
            catch {
                Write-Host "   ⚠️  Could not get job details: $($_.Exception.Message)" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    }
    
    # Summary
    $failedRuns = $runs.workflow_runs | Where-Object { $_.conclusion -eq "failure" }
    $successRuns = $runs.workflow_runs | Where-Object { $_.conclusion -eq "success" }
    $inProgressRuns = $runs.workflow_runs | Where-Object { $_.status -eq "in_progress" }
    
    Write-Host "📈 Summary:" -ForegroundColor Green
    Write-Host "   ✅ Successful: $($successRuns.Count)" -ForegroundColor Green
    Write-Host "   ❌ Failed: $($failedRuns.Count)" -ForegroundColor Red
    Write-Host "   🔄 In Progress: $($inProgressRuns.Count)" -ForegroundColor Yellow
    
    if ($failedRuns.Count -gt 0) {
        Write-Host ""
        Write-Host "🚨 Action Required:" -ForegroundColor Red
        Write-Host "   There are failed workflow runs that need attention." -ForegroundColor Yellow
        Write-Host "   Check the URLs above for detailed logs and error information." -ForegroundColor Yellow
    }
}

# Main execution
Write-Host "🚀 GitHub Actions Status Checker" -ForegroundColor Cyan
Write-Host "📁 Repository: $Owner/$Repo" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use this script:" -ForegroundColor Yellow
Write-Host "1. Set your GitHub token: `$env:GITHUB_TOKEN = 'your_token_here'" -ForegroundColor Yellow
Write-Host "2. Run: .\scripts\check-github-status.ps1" -ForegroundColor Yellow
Write-Host ""

Show-WorkflowStatus

Write-Host ""
Write-Host "✨ Status check complete!" -ForegroundColor Green
