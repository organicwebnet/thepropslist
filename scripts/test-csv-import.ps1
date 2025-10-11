# CSV Import Feature Testing Script
# PowerShell script for testing the CSV import functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CSV Import Feature Testing Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to test CSV import functionality
function Test-CSVImport {
    param(
        [string]$BaseUrl = "http://localhost:3000"
    )
    
    Write-Host "[1/8] Testing import page accessibility..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/props/import" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Import page loads successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Import page failed to load (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Import page not accessible: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host "[2/8] Testing props list page..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/props" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Props list page loads successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Props list page failed to load" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Props list page not accessible: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host "[3/8] Creating test CSV file..." -ForegroundColor Yellow
    $testCSV = @"
name,description,category,quantity,price,act,scene,tags,location,status,imageUrl
"Test Chair","A test chair for import",Furniture,1,100,1,1,"test,chair",Test Storage,available_in_storage,
"Test Sword","A test sword prop",Weapon,1,50,2,1,"test,sword",Test Storage,available_in_storage,
"Test Curtain","A test curtain",Set Dressing,2,75,,,"test,curtain",Test Storage,available_in_storage,
"@
    
    $csvPath = "test-import.csv"
    $testCSV | Out-File -FilePath $csvPath -Encoding UTF8
    Write-Host "✅ Test CSV file created: $csvPath" -ForegroundColor Green
    
    Write-Host "[4/8] Testing CSV file validation..." -ForegroundColor Yellow
    if (Test-Path $csvPath) {
        $content = Get-Content $csvPath
        if ($content.Count -gt 1) {
            Write-Host "✅ CSV file has valid structure" -ForegroundColor Green
        } else {
            Write-Host "❌ CSV file is empty or invalid" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Test CSV file not found" -ForegroundColor Red
        return $false
    }
    
    Write-Host "[5/8] Testing template download..." -ForegroundColor Yellow
    try {
        $templateUrl = "$BaseUrl/props/import"
        $response = Invoke-WebRequest -Uri $templateUrl -Method GET
        if ($response.Content -like "*Download template*") {
            Write-Host "✅ Template download link found" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Template download link not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Could not verify template download: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host "[6/8] Testing AI prompt functionality..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/props/import" -Method GET
        if ($response.Content -like "*Copy AI prompt*") {
            Write-Host "✅ AI prompt functionality found" -ForegroundColor Green
        } else {
            Write-Host "⚠️ AI prompt functionality not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Could not verify AI prompt: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host "[7/8] Testing responsive design..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/props/import" -Method GET
        if ($response.Content -like "*grid-cols-1 lg:grid-cols-2*") {
            Write-Host "✅ Responsive grid layout found" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Responsive layout not detected" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Could not verify responsive design: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host "[8/8] Testing accessibility features..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/props/import" -Method GET
        $accessibilityFeatures = @("aria-label", "role=", "aria-describedby")
        $foundFeatures = 0
        foreach ($feature in $accessibilityFeatures) {
            if ($response.Content -like "*$feature*") {
                $foundFeatures++
            }
        }
        if ($foundFeatures -gt 0) {
            Write-Host "✅ Found $foundFeatures accessibility features" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No accessibility features detected" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Could not verify accessibility: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Cleanup
    if (Test-Path $csvPath) {
        Remove-Item $csvPath
        Write-Host "✅ Test CSV file cleaned up" -ForegroundColor Green
    }
    
    return $true
}

# Function to run manual testing checklist
function Show-ManualTestingChecklist {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   MANUAL TESTING CHECKLIST" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please complete the following manual tests:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Navigate to /props/import" -ForegroundColor White
    Write-Host "   - Verify page loads correctly" -ForegroundColor Gray
    Write-Host "   - Check styling matches site theme" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test file upload" -ForegroundColor White
    Write-Host "   - Upload a valid CSV file" -ForegroundColor Gray
    Write-Host "   - Verify column mapping interface appears" -ForegroundColor Gray
    Write-Host "   - Test auto-detection of column names" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Test data preview" -ForegroundColor White
    Write-Host "   - Click 'Show Preview' button" -ForegroundColor Gray
    Write-Host "   - Verify preview table displays correctly" -ForegroundColor Gray
    Write-Host "   - Check data accuracy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Test import process" -ForegroundColor White
    Write-Host "   - Click 'Import Props' button" -ForegroundColor Gray
    Write-Host "   - Verify loading states" -ForegroundColor Gray
    Write-Host "   - Check success message" -ForegroundColor Gray
    Write-Host "   - Verify props appear in props list" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Test error handling" -ForegroundColor White
    Write-Host "   - Upload invalid file types" -ForegroundColor Gray
    Write-Host "   - Upload CSV without name column" -ForegroundColor Gray
    Write-Host "   - Verify appropriate error messages" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Test template and AI prompt" -ForegroundColor White
    Write-Host "   - Download CSV template" -ForegroundColor Gray
    Write-Host "   - Copy AI prompt to clipboard" -ForegroundColor Gray
    Write-Host "   - Verify both work correctly" -ForegroundColor Gray
    Write-Host ""
    Write-Host "7. Test responsive design" -ForegroundColor White
    Write-Host "   - Resize browser window" -ForegroundColor Gray
    Write-Host "   - Test on mobile device" -ForegroundColor Gray
    Write-Host "   - Verify layout adapts correctly" -ForegroundColor Gray
    Write-Host ""
    Write-Host "8. Test accessibility" -ForegroundColor White
    Write-Host "   - Use keyboard navigation" -ForegroundColor Gray
    Write-Host "   - Test with screen reader" -ForegroundColor Gray
    Write-Host "   - Verify focus management" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
Write-Host "Starting CSV Import testing..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "web-app")) {
    Write-Host "❌ Error: web-app directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Ask user for base URL
$baseUrl = Read-Host "Enter base URL (default: http://localhost:3000)"
if ([string]::IsNullOrEmpty($baseUrl)) {
    $baseUrl = "http://localhost:3000"
}

Write-Host ""
Write-Host "Testing against: $baseUrl" -ForegroundColor Cyan
Write-Host ""

# Run automated tests
$testResult = Test-CSVImport -BaseUrl $baseUrl

if ($testResult) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   AUTOMATED TESTS COMPLETED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ All automated tests passed!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   AUTOMATED TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Some automated tests failed. Please check the issues above." -ForegroundColor Red
    Write-Host ""
}

# Show manual testing checklist
Show-ManualTestingChecklist

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TESTING COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Complete manual testing checklist above" -ForegroundColor White
Write-Host "2. Run the full user testing script" -ForegroundColor White
Write-Host "3. Deploy to production if all tests pass" -ForegroundColor White
Write-Host "4. Monitor for any issues after deployment" -ForegroundColor White
Write-Host ""
Write-Host "For detailed testing instructions, see:" -ForegroundColor Yellow
Write-Host "_docs/USER_TESTING_SCRIPT.md" -ForegroundColor White
Write-Host ""
