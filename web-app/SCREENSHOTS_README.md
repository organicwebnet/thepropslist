# 📸 Automated Screenshot Generation for Help Documentation

This system automatically generates screenshots of your application for use in the help documentation.

## 🚀 Quick Start

### 1. Generate Screenshots
```bash
# Start your dev server first
npm run dev

# In another terminal, generate screenshots
npm run screenshots
```

### 2. Using Playwright Tests
```bash
# Run the screenshot test suite
npm run screenshots:test
```

## 📁 File Structure

```
web-app/
├── scripts/
│   └── generate-help-screenshots.js    # Main screenshot generator
├── tests/
│   └── screenshot-generator.spec.ts    # Playwright test for screenshots
├── screenshots/
│   └── help-docs/                      # Generated screenshots
│       ├── dashboard.png
│       ├── props-list.png
│       ├── add-prop.png
│       ├── shows-management.png
│       ├── task-boards.png
│       ├── packing-lists.png
│       ├── pdf-export.png
│       └── metadata.json               # Generation metadata
└── src/pages/
    └── HelpPage.tsx                    # Uses the generated screenshots
```

## ⚙️ Configuration

### Screenshot Settings
Edit `scripts/generate-help-screenshots.js` to customize:

- **Viewport size**: Currently set to 1280x720
- **Device scale factor**: Set to 2 for high-DPI screenshots
- **Base URL**: Adjust if your dev server runs on a different port
- **Pages to capture**: Add/remove pages in the `pagesToScreenshot` array

### Authentication
If your app requires authentication, update the login section in the script:

```javascript
// Login if needed
await page.goto(`${BASE_URL}/login`);
await page.fill('[data-testid="email"]', 'your-test-email@example.com');
await page.fill('[data-testid="password"]', 'your-test-password');
await page.click('[data-testid="login-button"]');
await page.waitForURL('/dashboard'); // Wait for redirect
```

## 🎯 Usage in Help Documentation

The help page automatically uses the generated screenshots:

```tsx
<Screenshot 
  src="/screenshots/help-docs/dashboard.png" 
  alt="Dashboard Interface"
  caption="The main dashboard showing recent activity and statistics"
/>
```

## 🔄 Automation Options

### 1. CI/CD Integration
Add to your GitHub Actions or CI pipeline:

```yaml
- name: Generate Help Screenshots
  run: |
    npm run dev &
    sleep 10  # Wait for dev server to start
    npm run screenshots
```

### 2. Pre-commit Hook
Generate screenshots before commits:

```bash
# Add to package.json scripts
"precommit": "npm run screenshots"
```

### 3. Scheduled Updates
Set up a cron job to regenerate screenshots:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/web-app && npm run screenshots
```

## 🛠️ Troubleshooting

### Common Issues

1. **Dev server not running**
   ```bash
   # Make sure dev server is running on localhost:5173
   npm run dev
   ```

2. **Authentication required**
   - Update the login logic in the script
   - Or use a test account with persistent session

3. **Screenshots not updating**
   - Clear browser cache
   - Check file permissions in screenshots directory
   - Verify the dev server is serving the latest version

4. **Missing pages**
   - Add new pages to the `pagesToScreenshot` array
   - Ensure the URLs are accessible without authentication

### Debug Mode
Run with debug output:

```bash
DEBUG=1 npm run screenshots
```

## 📊 Screenshot Metadata

Each generation creates a `metadata.json` file with:

```json
{
  "generated": "2025-01-27T10:30:00.000Z",
  "baseUrl": "http://localhost:5173",
  "screenshots": [
    {
      "url": "/",
      "filename": "dashboard.png",
      "title": "Dashboard",
      "description": "Main dashboard showing recent activity",
      "success": true,
      "path": "/path/to/screenshot.png"
    }
  ]
}
```

## 🎨 Customization

### Different Viewports
Generate screenshots for different devices:

```javascript
// Desktop
await page.setViewportSize({ width: 1280, height: 720 });

// Tablet
await page.setViewportSize({ width: 768, height: 1024 });

// Mobile
await page.setViewportSize({ width: 375, height: 667 });
```

### Custom Styling
Add CSS to hide elements during screenshots:

```javascript
await page.addStyleTag({
  content: `
    .debug-info { display: none !important; }
    .floating-elements { display: none !important; }
  `
});
```

## 🔧 Advanced Features

### Selective Screenshots
Generate only specific screenshots:

```javascript
// In the script, filter pagesToScreenshot
const pagesToScreenshot = pagesToScreenshot.filter(page => 
  page.filename.includes('dashboard') || page.filename.includes('props')
);
```

### Screenshot Comparison
Compare screenshots between versions:

```bash
# Generate baseline screenshots
npm run screenshots

# After changes, generate new screenshots
npm run screenshots

# Compare using image-diff tools
```

## 📝 Best Practices

1. **Consistent Data**: Use the same test data for consistent screenshots
2. **Clean State**: Reset the application state between screenshots
3. **High Quality**: Use high DPI settings for crisp screenshots
4. **Descriptive Names**: Use clear, descriptive filenames
5. **Version Control**: Commit screenshots to track UI changes over time

## 🚀 Future Enhancements

- [ ] Automatic screenshot comparison
- [ ] Visual regression testing
- [ ] Multi-language screenshot generation
- [ ] Interactive screenshot annotations
- [ ] Screenshot optimization and compression
