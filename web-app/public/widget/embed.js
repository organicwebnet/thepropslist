// Simple embed script for the Issue Logger widget
// Usage: <script src="https://your-domain.com/widget/embed.js"></script>

(function() {
  // Configuration - modify these values for your setup
  const config = {
    apiBaseUrl: 'http://localhost:5057',
    owner: '', // Optional: default GitHub owner/org
    repo: '',  // Optional: default repository name
    cssUrl: '/widget/issueWidget.css' // Optional: custom CSS URL
  }

  // Set global configuration
  window.IssueLogger = config

  // Load the widget script
  const script = document.createElement('script')
  script.src = config.apiBaseUrl + '/widget/issueWidget.js'
  script.async = true
  document.head.appendChild(script)
})()
