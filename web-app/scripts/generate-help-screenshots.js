const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/help-docs');
const BASE_URL = 'http://localhost:5173'; // Adjust for your dev server

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Pages to screenshot with their metadata
const pagesToScreenshot = [
  {
    url: '/',
    filename: 'dashboard.png',
    title: 'Dashboard',
    description: 'Main dashboard showing recent activity and show statistics'
  },
  {
    url: '/props',
    filename: 'props-list.png',
    title: 'Props Inventory',
    description: 'List of all props with filtering and search capabilities'
  },
  {
    url: '/props/add',
    filename: 'add-prop.png',
    title: 'Add New Prop',
    description: 'Form for adding new props with detailed information'
  },
  {
    url: '/shows',
    filename: 'shows-management.png',
    title: 'Show Management',
    description: 'Manage your theater productions and shows'
  },
  {
    url: '/boards',
    filename: 'task-boards.png',
    title: 'Task Boards',
    description: 'Drag-and-drop task management for production workflows'
  },
  {
    url: '/packing-lists',
    filename: 'packing-lists.png',
    title: 'Packing Lists',
    description: 'Organize props into containers for different locations'
  },
  {
    url: '/props/pdf-export',
    filename: 'pdf-export.png',
    title: 'PDF Export',
    description: 'Generate professional prop lists and reports'
  }
];

async function generateScreenshots() {
  console.log('🎬 Starting screenshot generation...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2 // High DPI screenshots
  });
  
  const page = await context.newPage();
  
  // Login if needed (adjust based on your auth setup)
  try {
    await page.goto(`${BASE_URL}/login`);
    // Add login logic here if authentication is required
    console.log('✅ Authentication handled');
  } catch (error) {
    console.log('⚠️  Skipping authentication (may not be required)');
  }
  
  const results = [];
  
  for (const pageConfig of pagesToScreenshot) {
    try {
      console.log(`📸 Capturing ${pageConfig.title}...`);
      
      await page.goto(`${BASE_URL}${pageConfig.url}`);
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any animations to complete
      await page.waitForTimeout(1000);
      
      const screenshotPath = path.join(SCREENSHOTS_DIR, pageConfig.filename);
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled' // Disable animations for consistent screenshots
      });
      
      results.push({
        ...pageConfig,
        success: true,
        path: screenshotPath
      });
      
      console.log(`✅ Captured ${pageConfig.filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to capture ${pageConfig.filename}:`, error.message);
      results.push({
        ...pageConfig,
        success: false,
        error: error.message
      });
    }
  }
  
  await browser.close();
  
  // Generate metadata file
  const metadata = {
    generated: new Date().toISOString(),
    baseUrl: BASE_URL,
    screenshots: results
  };
  
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\n📊 Screenshot Generation Summary:');
  console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  console.log(`📁 Output directory: ${SCREENSHOTS_DIR}`);
  
  return results;
}

// Run if called directly
if (require.main === module) {
  generateScreenshots()
    .then(() => {
      console.log('🎉 Screenshot generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Screenshot generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateScreenshots };
