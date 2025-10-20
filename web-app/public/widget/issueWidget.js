;(function(){
  const WIDGET_ID = 'issue-logger-widget'
  if (window.__issueLoggerInjected) return
  window.__issueLoggerInjected = true

  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas)
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
      s.async = true
      s.onload = () => resolve(window.html2canvas)
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  function injectStyles() {
    if (document.getElementById(WIDGET_ID+'-styles')) return
    const link = document.createElement('link')
    link.id = WIDGET_ID+'-styles'
    link.rel = 'stylesheet'
    link.href = (window.IssueLogger && window.IssueLogger.cssUrl) || '/widget/issueWidget.css'
    document.head.appendChild(link)
  }

  function createFloatingButton() {
    const fab = document.createElement('button')
    fab.className = 'il-fab'
    fab.type = 'button'
    fab.innerHTML = '🐞'
    fab.setAttribute('aria-label', 'Report an issue')
    fab.setAttribute('title', 'Report an issue')
    fab.addEventListener('click', toggleFabMenu)
    fab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleFabMenu()
      }
    })
    document.body.appendChild(fab)
    return fab
  }

  function toggleFabMenu() {
    const existing = document.querySelector('.il-fab-menu')
    if (existing) {
      existing.remove()
      return
    }

    const menu = document.createElement('div')
    menu.className = 'il-fab-menu'
    menu.setAttribute('role', 'menu')
    menu.setAttribute('aria-label', 'Issue reporting options')

    const options = [
      { icon: '📸', text: 'Screenshot', action: startScreenshot, desc: 'Capture a specific area' },
      { icon: '🎥', text: 'Screen Recording', action: startScreenRecording, desc: 'Record screen activity (30s)' },
      { icon: '📝', text: 'Text Report', action: startTextReport, desc: 'Describe the issue' },
      { icon: '⚙️', text: 'Settings', action: showSettings, desc: 'Configure GitHub repository' }
    ]

    options.forEach((option, index) => {
      const item = document.createElement('button')
      item.className = 'il-fab-menu-item'
      item.type = 'button'
      item.innerHTML = `
        <span class="il-fab-icon">${option.icon}</span>
        <div class="il-fab-text">
          <div class="il-fab-title">${option.text}</div>
          <div class="il-fab-desc">${option.desc}</div>
        </div>
      `
      item.setAttribute('role', 'menuitem')
      item.setAttribute('tabindex', index + 1)
      item.addEventListener('click', () => {
        menu.remove()
        option.action()
      })
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          menu.remove()
          option.action()
        } else if (e.key === 'Escape') {
          menu.remove()
        }
      })
      menu.appendChild(item)
    })

    document.body.appendChild(menu)
    
    // Focus first item
    setTimeout(() => {
      const firstItem = menu.querySelector('.il-fab-menu-item')
      if (firstItem) firstItem.focus()
    }, 100)

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && !document.querySelector('.il-fab').contains(e.target)) {
        menu.remove()
        document.removeEventListener('click', closeMenu)
      }
    }
    setTimeout(() => document.addEventListener('click', closeMenu), 100)
  }

  function startScreenshot() {
    startSelection()
  }

  function startScreenRecording() {
    showPanel(null, 'recording')
  }

  function startTextReport() {
    showPanel(null, 'text')
  }

  let overlay, selection, startX, startY, currentRect, panel, previewCanvas

  function startSelection(){
    if (overlay) return
    overlay = document.createElement('div')
    overlay.className = 'il-overlay'
    overlay.addEventListener('mousedown', onMouseDown)
    document.body.appendChild(overlay)
  }

  function onMouseDown(e){
    startX = e.clientX
    startY = e.clientY
    selection = document.createElement('div')
    selection.className = 'il-selection'
    overlay.appendChild(selection)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp, { once: true })
  }

  // Debounce utility
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const debouncedMouseMove = debounce((e) => {
    const x = Math.min(e.clientX, startX)
    const y = Math.min(e.clientY, startY)
    const w = Math.abs(e.clientX - startX)
    const h = Math.abs(e.clientY - startY)
    currentRect = { x, y, w, h }
    Object.assign(selection.style, { left: x+'px', top: y+'px', width: w+'px', height: h+'px' })
  }, 16) // ~60fps

  function onMouseMove(e){
    debouncedMouseMove(e)
  }

  async function onMouseUp(){
    window.removeEventListener('mousemove', onMouseMove)
    await loadHtml2Canvas()
    const canvas = await window.html2canvas(document.body, {
      useCORS: true,
      ignoreElements: (el) => el === overlay || el.closest && el.closest('.il-panel')
    })
    // crop
    const crop = document.createElement('canvas')
    crop.width = currentRect.w
    crop.height = currentRect.h
    const ctx = crop.getContext('2d')
    ctx.drawImage(canvas, currentRect.x, currentRect.y, currentRect.w, currentRect.h, 0, 0, currentRect.w, currentRect.h)
    const dataUrl = crop.toDataURL('image/png')
    showPanel(dataUrl)
  }

  function getBrowserInfo() {
    const userAgent = navigator.userAgent
    const browserName = getBrowserName(userAgent)
    const osName = getOSName(userAgent)
    const screenSize = `${screen.width}x${screen.height}`
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`
    const devicePixelRatio = window.devicePixelRatio || 1
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const language = navigator.language
    const url = window.location.href
    const timestamp = new Date().toISOString()
    
    return {
      browser: browserName,
      os: osName,
      screenSize,
      viewportSize,
      devicePixelRatio,
      timezone,
      language,
      url,
      timestamp,
      userAgent
    }
  }

  function getBrowserName(userAgent) {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edg')) return 'Edge'
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
    return 'Unknown'
  }

  function getOSName(userAgent) {
    if (userAgent.includes('Windows NT')) return 'Windows'
    if (userAgent.includes('Mac OS X')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }

  function formatBrowserInfo(info) {
    return `**Environment Information:**
- **Browser:** ${info.browser}
- **Operating System:** ${info.os}
- **Screen Size:** ${info.screenSize}
- **Viewport Size:** ${info.viewportSize}
- **Device Pixel Ratio:** ${info.devicePixelRatio}
- **Timezone:** ${info.timezone}
- **Language:** ${info.language}
- **URL:** ${info.url}
- **Timestamp:** ${info.timestamp}

**User Agent:** \`${info.userAgent}\`

---
`
  }

  function showPanel(dataUrl, mode = 'screenshot'){
    if (panel) panel.remove()
    panel = document.createElement('div')
    panel.className = 'il-panel'
    
    // Title field
    const titleField = document.createElement('div')
    titleField.className = 'il-field'
    const titleLabel = document.createElement('label')
    titleLabel.textContent = 'Title'
    titleLabel.setAttribute('for', 'il-title')
    const title = document.createElement('input')
    title.id = 'il-title'
    title.type = 'text'
    title.placeholder = 'Brief description of the issue'
    titleField.appendChild(titleLabel)
    titleField.appendChild(title)
    
    // Issue type dropdown
    const typeField = document.createElement('div')
    typeField.className = 'il-field'
    const typeLabel = document.createElement('label')
    typeLabel.textContent = 'Type'
    typeLabel.setAttribute('for', 'il-type')
    const typeSelect = document.createElement('select')
    typeSelect.id = 'il-type'
    typeSelect.innerHTML = `
      <option value="bug">🐛 Bug</option>
      <option value="feature">✨ Feature Request</option>
    `
    typeField.appendChild(typeLabel)
    typeField.appendChild(typeSelect)
    
    // Severity dropdown
    const severityField = document.createElement('div')
    severityField.className = 'il-field'
    const severityLabel = document.createElement('label')
    severityLabel.textContent = 'Severity'
    severityLabel.setAttribute('for', 'il-severity')
    const severitySelect = document.createElement('select')
    severitySelect.id = 'il-severity'
    severitySelect.innerHTML = `
      <option value="low">🟢 Low</option>
      <option value="medium" selected>🟡 Medium</option>
      <option value="critical">🔴 Critical</option>
    `
    severityField.appendChild(severityLabel)
    severityField.appendChild(severitySelect)
    
    // Description field
    const descField = document.createElement('div')
    descField.className = 'il-field'
    const descLabel = document.createElement('label')
    descLabel.textContent = 'Description'
    descLabel.setAttribute('for', 'il-description')
    const desc = document.createElement('textarea')
    desc.id = 'il-description'
    desc.placeholder = 'Describe what happened, steps to reproduce, expected vs actual behavior...'
    desc.rows = 4
    descField.appendChild(descLabel)
    descField.appendChild(desc)
    
    const actions = document.createElement('div')
    actions.className = 'il-actions'
    
    // Add content based on mode
    if (mode === 'screenshot' && dataUrl) {
      previewCanvas = document.createElement('img')
      previewCanvas.className = 'il-preview'
      previewCanvas.src = dataUrl
      panel.appendChild(previewCanvas)
    } else if (mode === 'recording') {
      if (window.currentRecording) {
        // Show video preview if recording exists
        const videoPreview = document.createElement('video')
        videoPreview.className = 'il-video-preview'
        videoPreview.controls = true
        videoPreview.style.cssText = `
          width: 100%;
          max-width: 100%;
          border-radius: 8px;
          background: #000;
          margin-bottom: 16px;
        `
        
        // Convert base64 back to blob URL for video preview
        const binaryString = atob(window.currentRecording)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'video/webm' })
        const videoUrl = URL.createObjectURL(blob)
        videoPreview.src = videoUrl
        
        // Clean up URL when video is removed
        videoPreview.addEventListener('loadstart', () => {
          // Store cleanup function
          window.cleanupVideoUrl = () => URL.revokeObjectURL(videoUrl)
        })
        
        panel.appendChild(videoPreview)
      } else {
        // Show recording status if no recording yet
        const recordingStatus = document.createElement('div')
        recordingStatus.className = 'il-recording-status'
        recordingStatus.innerHTML = `
          <div class="il-recording-icon">🎥</div>
          <div class="il-recording-text">
            <div class="il-recording-title">Screen Recording</div>
            <div class="il-recording-desc">Click "Start Recording" to begin (30 seconds)</div>
          </div>
        `
        panel.appendChild(recordingStatus)
      }
    } else if (mode === 'text') {
      const textStatus = document.createElement('div')
      textStatus.className = 'il-text-status'
      textStatus.innerHTML = `
        <div class="il-text-icon">📝</div>
        <div class="il-text-text">
          <div class="il-text-title">Text Report</div>
          <div class="il-text-desc">Describe the issue in detail below</div>
        </div>
      `
      panel.appendChild(textStatus)
    }
    
    // Add recording button only for recording mode
    if (mode === 'recording') {
      const recBtn = document.createElement('button')
      recBtn.className = 'il-btn secondary'
      recBtn.textContent = 'Start Recording'
      recBtn.addEventListener('click', startRecording)
      actions.appendChild(recBtn)
    }
    
    const submit = document.createElement('button')
    submit.className = 'il-btn'
    submit.textContent = 'Submit Issue'
    const cancel = document.createElement('button')
    cancel.className = 'il-btn secondary'
    cancel.textContent = 'Cancel'
    
    actions.appendChild(cancel)
    actions.appendChild(submit)

    // Add form fields
    panel.appendChild(titleField)
    panel.appendChild(typeField)
    panel.appendChild(severityField)
    panel.appendChild(descField)
    panel.appendChild(actions)
    document.body.appendChild(panel)

    // Store browser info for later use
    const browserInfo = getBrowserInfo()
    const formattedInfo = formatBrowserInfo(browserInfo)

    cancel.addEventListener('click', cleanup)
    submit.addEventListener('click', () => {
      const issueType = typeSelect.value
      const severity = severitySelect.value
      
      // Create proper labels array
      const typeLabel = issueType === 'bug' ? 'bug' : 'enhancement'
      const severityLabel = `severity-${severity}`
      const labels = [typeLabel, severityLabel]
      
      // Combine user description with browser info
      const userDescription = desc.value.trim()
      const finalBody = userDescription + '\n\n' + formattedInfo
      
      submitIssue({ 
        title: title.value, 
        body: finalBody, 
        imageDataUrl: dataUrl, 
        labels: labels,
        videoWebmBase64: window.currentRecording || (panel && panel.dataset.video)
      })
    })
    
    if (mode === 'recording') {
      const recBtn = document.querySelector('.il-btn.secondary')
      if (recBtn) {
        recBtn.addEventListener('click', startRecording)
      }
    }
  }

  function showSettings(){
    const existing = document.querySelector('.il-modal-backdrop')
    if (existing) { existing.remove() }
    
    // Store current focus for restoration
    const previousFocus = document.activeElement
    
    const backdrop = document.createElement('div')
    backdrop.className = 'il-modal-backdrop'
    backdrop.setAttribute('role', 'dialog')
    backdrop.setAttribute('aria-modal', 'true')
    backdrop.setAttribute('aria-labelledby', 'il-modal-title')
    
    const modal = document.createElement('div')
    modal.className = 'il-modal'

    const title = document.createElement('h3')
    title.id = 'il-modal-title'
    title.textContent = 'Issue Logger Settings'
    title.style.marginTop = '0'

    const ownerField = document.createElement('div')
    ownerField.className = 'il-field'
    const ownerLabel = document.createElement('label')
    ownerLabel.textContent = 'GitHub owner (user or org)'
    ownerLabel.setAttribute('for', 'il-owner-input')
    const ownerInput = document.createElement('input')
    ownerInput.id = 'il-owner-input'
    ownerInput.type = 'text'
    ownerInput.placeholder = 'e.g. my-org'
    ownerInput.setAttribute('aria-describedby', 'il-owner-help')

    const repoField = document.createElement('div')
    repoField.className = 'il-field'
    const repoLabel = document.createElement('label')
    repoLabel.textContent = 'GitHub repo'
    repoLabel.setAttribute('for', 'il-repo-input')
    const repoInput = document.createElement('input')
    repoInput.id = 'il-repo-input'
    repoInput.type = 'text'
    repoInput.placeholder = 'e.g. my-app'
    repoInput.setAttribute('aria-describedby', 'il-repo-help')

    const apiField = document.createElement('div')
    apiField.className = 'il-field'
    const apiLabel = document.createElement('label')
    apiLabel.textContent = 'API base URL'
    apiLabel.setAttribute('for', 'il-api-input')
    const apiInput = document.createElement('input')
    apiInput.id = 'il-api-input'
    apiInput.type = 'url'
    apiInput.placeholder = 'e.g. https://issue-logger.mycompany.com'
    apiInput.setAttribute('aria-describedby', 'il-api-help')

    const actions = document.createElement('div')
    actions.className = 'il-actions'
    const cancel = document.createElement('button')
    cancel.className = 'il-btn secondary'
    cancel.textContent = 'Close'
    const save = document.createElement('button')
    save.className = 'il-btn'
    save.textContent = 'Save'

    actions.appendChild(cancel)
    actions.appendChild(save)

    ownerField.appendChild(ownerLabel)
    ownerField.appendChild(ownerInput)
    repoField.appendChild(repoLabel)
    repoField.appendChild(repoInput)
    apiField.appendChild(apiLabel)
    apiField.appendChild(apiInput)

    modal.appendChild(title)
    modal.appendChild(ownerField)
    modal.appendChild(repoField)
    modal.appendChild(apiField)
    modal.appendChild(actions)
    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    const saved = loadSettings()
    ownerInput.value = saved.owner || ''
    repoInput.value = saved.repo || ''
    apiInput.value = saved.apiBaseUrl || (window.IssueLogger && window.IssueLogger.apiBaseUrl) || 'http://localhost:5057'

    // Focus management
    const focusableElements = [ownerInput, repoInput, apiInput, cancel, save]
    let currentFocusIndex = 0
    
    function trapFocus(e) {
      if (e.key === 'Tab') {
        e.preventDefault()
        currentFocusIndex = (currentFocusIndex + (e.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length
        focusableElements[currentFocusIndex].focus()
      } else if (e.key === 'Escape') {
        backdrop.remove()
        previousFocus?.focus()
      }
    }
    
    backdrop.addEventListener('keydown', trapFocus)
    
    // Focus first input
    setTimeout(() => ownerInput.focus(), 100)
    
    cancel.addEventListener('click', () => {
      backdrop.remove()
      previousFocus?.focus()
    })
    save.addEventListener('click', () => {
      const s = { owner: ownerInput.value.trim(), repo: repoInput.value.trim(), apiBaseUrl: apiInput.value.trim() }
      localStorage.setItem('issueLoggerSettings', JSON.stringify(s))
      backdrop.remove()
      previousFocus?.focus()
    })
  }

  function loadSettings(){
    try { return JSON.parse(localStorage.getItem('issueLoggerSettings') || '{}') } catch(_) { return {} }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `il-notification il-notification-${type}`
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 2147483644;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 5000)
  }

  async function startRecording(){
    try {
      // Close the form panel
      if (panel) {
        panel.remove()
        panel = null
      }
      
      // Show recording controls
      showRecordingControls()
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const base64 = await blobToBase64(blob)
        // Store the recording for later use
        window.currentRecording = base64
        hideRecordingControls()
        showNotification('Screen recording completed successfully', 'success')
        // Show the form with the recording attached
        showPanel(null, 'recording')
      }
      recorder.start()
      showNotification('Recording started - click stop when done', 'info')
      
      // Store recorder reference for stop button
      window.currentRecorder = recorder
      window.currentStream = stream
      
      // Start countdown timer
      startCountdown()
      
      // Auto-stop after 30 seconds
      setTimeout(() => { 
        try { 
          if (window.currentRecorder && window.currentRecorder.state === 'recording') {
            window.currentRecorder.stop()
            window.currentStream.getTracks().forEach(t=>t.stop())
          }
        } catch(_){} 
      }, 30000)
    } catch (e) {
      showNotification('Failed to start recording: ' + e.message, 'error')
      hideRecordingControls()
    }
  }

  function showRecordingControls() {
    // Remove existing controls
    hideRecordingControls()
    
    // Create stop button with countdown
    const stopBtn = document.createElement('button')
    stopBtn.className = 'il-recording-control il-stop-btn'
    stopBtn.innerHTML = '⏹️<br><span class="il-countdown">30</span>'
    stopBtn.setAttribute('aria-label', 'Stop recording')
    stopBtn.setAttribute('title', 'Stop recording')
    stopBtn.addEventListener('click', stopRecording)
    
    // Create cancel button
    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'il-recording-control il-cancel-btn'
    cancelBtn.innerHTML = '❌'
    cancelBtn.setAttribute('aria-label', 'Cancel recording')
    cancelBtn.setAttribute('title', 'Cancel recording')
    cancelBtn.addEventListener('click', cancelRecording)
    
    // Position controls next to FAB
    stopBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 90px;
      z-index: 2147483640;
      background: #dc2626;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 56px;
      height: 56px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    cancelBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 160px;
      z-index: 2147483640;
      background: #6b7280;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 56px;
      height: 56px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    document.body.appendChild(stopBtn)
    document.body.appendChild(cancelBtn)
    
    // Store references for cleanup
    window.recordingStopBtn = stopBtn
    window.recordingCancelBtn = cancelBtn
  }

  function hideRecordingControls() {
    if (window.recordingStopBtn) {
      window.recordingStopBtn.remove()
      window.recordingStopBtn = null
    }
    if (window.recordingCancelBtn) {
      window.recordingCancelBtn.remove()
      window.recordingCancelBtn = null
    }
    // Clear countdown timer
    if (window.countdownInterval) {
      clearInterval(window.countdownInterval)
      window.countdownInterval = null
    }
  }

  function startCountdown() {
    let timeLeft = 30
    const countdownElement = document.querySelector('.il-countdown')
    
    if (countdownElement) {
      window.countdownInterval = setInterval(() => {
        timeLeft--
        countdownElement.textContent = timeLeft
        
        // Change color when time is running low
        if (timeLeft <= 5) {
          countdownElement.style.color = '#ef4444' // Red
        } else if (timeLeft <= 10) {
          countdownElement.style.color = '#f59e0b' // Orange
        }
        
        if (timeLeft <= 0) {
          clearInterval(window.countdownInterval)
          window.countdownInterval = null
        }
      }, 1000)
    }
  }

  function stopRecording() {
    try {
      if (window.currentRecorder && window.currentRecorder.state === 'recording') {
        window.currentRecorder.stop()
        window.currentStream.getTracks().forEach(t=>t.stop())
      }
    } catch(e) {
      showNotification('Error stopping recording: ' + e.message, 'error')
    }
  }

  function cancelRecording() {
    try {
      if (window.currentRecorder && window.currentRecorder.state === 'recording') {
        window.currentRecorder.stop()
        window.currentStream.getTracks().forEach(t=>t.stop())
      }
    } catch(e) {}
    
    // Clear the recording
    window.currentRecording = null
    hideRecordingControls()
    showNotification('Recording cancelled', 'info')
  }

  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function submitIssue({ title, body, imageDataUrl, labels }){
    try {
      if (!title) { 
        showNotification('Please enter a title for the issue', 'error')
        return 
      }
      
      // Show loading state
      const submitBtn = document.querySelector('.il-panel .il-btn:not(.secondary)')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Submitting...'
      }
      
      const saved = loadSettings()
      const endpoint = saved.apiBaseUrl || (window.IssueLogger && window.IssueLogger.apiBaseUrl) || 'http://localhost:5057'
      const payload = {
        title,
        body,
        imageDataUrl,
        labels: Array.isArray(labels) ? labels : (labels || '').split(',').map(s=>s.trim()).filter(Boolean),
        owner: saved.owner || (window.IssueLogger && window.IssueLogger.owner),
        repo: saved.repo || (window.IssueLogger && window.IssueLogger.repo),
        videoWebmBase64: window.currentRecording || (panel && panel.dataset.video)
      }
      
      const res = await fetch(endpoint + '/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data && data.error || 'Failed to create issue')
      }
      
      cleanup()
      const url = data.issue && data.issue.html_url
      if (url) {
        showNotification(`Issue created successfully! View it here: ${url}`, 'success')
      } else {
        showNotification('Issue created successfully!', 'success')
      }
    } catch(e) {
      showNotification('Failed to submit issue: ' + e.message, 'error')
      // Restore button state
      const submitBtn = document.querySelector('.il-panel .il-btn:not(.secondary)')
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Submit issue'
      }
    }
  }

  function cleanup(){
    if (overlay) { overlay.remove(); overlay = null }
    selection = null
    currentRect = null
    if (panel) { 
      // Clean up video URL if it exists
      if (window.cleanupVideoUrl) {
        window.cleanupVideoUrl()
        window.cleanupVideoUrl = null
      }
      panel.remove(); 
      panel = null 
    }
  }

  injectStyles()
  createFloatingButton()
})()


