# Issue-Logger Integration Setup Guide

This guide explains how to set up and configure the Issue-Logger integration for The Props List web application.

## Overview

The Issue-Logger integration provides two main features:

1. **Automatic Error Reporting**: Errors caught by the application are automatically sent to GitHub as issues
2. **Manual Issue Reporting**: Users can manually report issues using the floating action button (🐞) widget

## Prerequisites

1. **Issue-Logger Server**: You need to deploy the Issue-Logger server component
2. **GitHub Repository**: A repository where issues will be created
3. **GitHub Personal Access Token**: With permissions to create issues

## Step 1: Deploy Issue-Logger Server

1. Clone the Issue-Logger repository:
   ```bash
   git clone https://github.com/organicwebnet/Issue-Logger.git
   cd Issue-Logger
   ```

2. Navigate to the server directory:
   ```bash
   cd server
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```env
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_OWNER=your_github_username_or_org
   GITHUB_REPO=your_repository_name
   PORT=5057
   NODE_ENV=production
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Deploy to your hosting platform (Heroku, Railway, DigitalOcean, etc.)

## Step 2: Configure GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with these permissions:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)
3. Copy the token and add it to your Issue-Logger server `.env` file

## Step 3: Configure Web Application

1. Copy the environment template:
   ```bash
   cp Copy.env .env
   ```

2. Edit `.env` and configure the Issue-Logger settings:
   ```env
   # Issue-Logger Configuration
   VITE_ISSUE_LOGGER_ENABLED=true
   VITE_ISSUE_LOGGER_API_URL=https://your-issue-logger-server.com
   VITE_ISSUE_LOGGER_OWNER=your-github-username
   VITE_ISSUE_LOGGER_REPO=your-repository-name
   ```

## Step 4: Test the Integration

1. Start your web application:
   ```bash
   npm run dev
   ```

2. **Test Manual Reporting**:
   - Look for the floating action button (🐞) in the bottom-right corner
   - Click it to open the issue reporting menu
   - Try creating a test issue with a screenshot

3. **Test Automatic Error Reporting**:
   - Open browser developer tools
   - Trigger an error (e.g., by modifying code temporarily)
   - Check your GitHub repository for the automatically created issue

## Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_ISSUE_LOGGER_ENABLED` | Enable/disable the widget | No | `false` |
| `VITE_ISSUE_LOGGER_API_URL` | URL of your Issue-Logger server | Yes | - |
| `VITE_ISSUE_LOGGER_OWNER` | GitHub username or organization | Yes | - |
| `VITE_ISSUE_LOGGER_REPO` | GitHub repository name | Yes | - |

### Widget Features

The Issue-Logger widget provides:

- **📸 Screenshot Capture**: Select any area of the screen to capture
- **🎥 Screen Recording**: Record up to 30 seconds of screen activity
- **📝 Text Reports**: Create issues with detailed descriptions
- **⚙️ Settings**: Configure repository settings through the UI

### Automatic Error Reporting

The integration automatically reports:

- **Error Boundaries**: React component errors
- **JavaScript Errors**: Unhandled exceptions
- **API Errors**: Failed network requests
- **Permission Errors**: Access denied scenarios

Each automatic report includes:

- Error message and stack trace
- Browser information
- User context (if available)
- Timestamp and URL
- Severity level

## Troubleshooting

### Widget Not Appearing

1. Check that `VITE_ISSUE_LOGGER_ENABLED=true` in your `.env` file
2. Verify the widget files are in `public/widget/` directory
3. Check browser console for JavaScript errors
4. Ensure the Issue-Logger server is running and accessible

### Issues Not Being Created

1. Verify GitHub token has correct permissions
2. Check Issue-Logger server logs for errors
3. Ensure CORS is properly configured for your domain
4. Verify repository name and owner are correct

### CORS Errors

If you see CORS errors, update your Issue-Logger server `.env` file:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,http://localhost:5173
```

## Security Considerations

1. **Rate Limiting**: The Issue-Logger server includes rate limiting (10 requests per 15 minutes)
2. **Input Validation**: All inputs are validated and sanitized
3. **CORS Protection**: Only configured origins can access the API
4. **Token Security**: Keep your GitHub token secure and never commit it to version control

## Production Deployment

1. **Environment Variables**: Set all required environment variables in your hosting platform
2. **HTTPS**: Ensure both your web app and Issue-Logger server use HTTPS in production
3. **Monitoring**: Monitor the Issue-Logger server for errors and performance
4. **Backup**: Consider backing up your GitHub token and server configuration

## Support

If you encounter issues:

1. Check the [Issue-Logger repository](https://github.com/organicwebnet/Issue-Logger) for documentation
2. Review the server logs for error messages
3. Test the Issue-Logger server independently using the demo page
4. Verify all environment variables are correctly set

## Example Issues

When working correctly, you should see issues created in your GitHub repository with:

- **Title**: `[SEVERITY] Error message`
- **Labels**: `bug`, `severity-medium`, `platform-web`, `auto-reported`
- **Body**: Detailed error information including stack trace, browser info, and context
- **Attachments**: Screenshots or screen recordings (for manual reports)
