interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const SUPPORTED_PLATFORMS = {
  YOUTUBE: ['youtube.com', 'youtu.be'],
  GOOGLE_DRIVE: ['drive.google.com'],
  VIMEO: ['vimeo.com'],
  DAILYMOTION: ['dailymotion.com']
};

export async function validateVideoUrl(url: string): Promise<ValidationResult> {
  // Check if URL is empty or not a string
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'Please provide a valid URL'
    };
  }

  try {
    // Parse and validate URL format using browser's built-in URL API
    const parsedUrl = new URL(url);
    
    // Ensure protocol is http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: 'URL must start with http:// or https://'
      };
    }

    // Check if platform is supported
    const hostname = parsedUrl.hostname.toLowerCase();
    let isSupported = false;
    let platformType = '';

    for (const [platform, domains] of Object.entries(SUPPORTED_PLATFORMS)) {
      if (domains.some(domain => hostname.includes(domain))) {
        isSupported = true;
        platformType = platform;
        break;
      }
    }

    if (!isSupported) {
      return {
        isValid: false,
        error: 'Video must be hosted on YouTube, Google Drive, Vimeo, or Dailymotion'
      };
    }

    // Platform-specific validation
    switch (platformType) {
      case 'YOUTUBE': {
        // Check YouTube URL format
        if (hostname === 'youtube.com') {
          const videoId = parsedUrl.searchParams.get('v');
          if (!videoId) {
            return {
              isValid: false,
              error: 'Invalid YouTube URL format. Expected: youtube.com/watch?v=VIDEO_ID'
            };
          }
        } else if (hostname === 'youtu.be') {
          const videoId = parsedUrl.pathname.slice(1);
          if (!videoId) {
            return {
              isValid: false,
              error: 'Invalid YouTube URL format. Expected: youtu.be/VIDEO_ID'
            };
          }
        }
        break;
      }

      case 'GOOGLE_DRIVE': {
        // Check Google Drive URL format
        const pathParts = parsedUrl.pathname.split('/');
        const fileIdIndex = pathParts.indexOf('d');
        if (fileIdIndex === -1 || !pathParts[fileIdIndex + 1]) {
          return {
            isValid: false,
            error: 'Invalid Google Drive URL format. Expected: drive.google.com/file/d/FILE_ID/view'
          };
        }
        break;
      }

      case 'VIMEO': {
        // Check Vimeo URL format
        const videoId = parsedUrl.pathname.slice(1);
        if (!/^\d+$/.test(videoId)) {
          return {
            isValid: false,
            error: 'Invalid Vimeo URL format. Expected: vimeo.com/VIDEO_ID'
          };
        }
        break;
      }

      case 'DAILYMOTION': {
        // Check Dailymotion URL format
        const videoId = parsedUrl.pathname.slice(1);
        if (!videoId) {
          return {
            isValid: false,
            error: 'Invalid Dailymotion URL format. Expected: dailymotion.com/VIDEO_ID'
          };
        }
        break;
      }
    }

    // Verify URL accessibility
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        return {
          isValid: false,
          error: 'Video is unavailable or requires authentication'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Unable to access video URL. Please check if the video is public and accessible'
      };
    }

    // All validation passed
    return {
      isValid: true
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }
}
