import React, { useState, useEffect } from 'react';
import { MessageSquare, GitPullRequest, Bug, Lightbulb, Send, Upload, X } from 'lucide-react';
import { WysiwygEditor } from './WysiwygEditor';

// GitHub repository details - update these with your actual repo info
const GITHUB_REPO_OWNER = 'organicweb';
const GITHUB_REPO = 'props-bible';
const GITHUB_LABELS = {
  bug: 'bug',
  feature: 'enhancement',
  feedback: 'feedback'
};

interface FeedbackFormProps {
  onClose: () => void;
  userEmail?: string;
}

type FeedbackType = 'bug' | 'feature' | 'feedback';

export function FeedbackForm({ onClose, userEmail }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Collect device information on component mount
  useEffect(() => {
    const browser = getBrowserInfo();
    const os = getOSInfo();
    const screen = `${window.screen.width}x${window.screen.height}`;
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    
    setDeviceInfo(
      `Browser: ${browser}\nOS: ${os}\nScreen: ${screen}\nViewport: ${viewport}\nUser Agent: ${navigator.userAgent}`
    );
  }, []);

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    
    if (ua.indexOf("Chrome") > -1) browserName = "Chrome";
    else if (ua.indexOf("Safari") > -1) browserName = "Safari";
    else if (ua.indexOf("Firefox") > -1) browserName = "Firefox";
    else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) browserName = "Internet Explorer";
    else if (ua.indexOf("Edge") > -1) browserName = "Edge";
    else if (ua.indexOf("Opera") > -1) browserName = "Opera";
    
    return browserName;
  };

  const getOSInfo = () => {
    const ua = navigator.userAgent;
    let os = "Unknown";
    
    if (ua.indexOf("Win") > -1) os = "Windows";
    else if (ua.indexOf("Mac") > -1) os = "MacOS";
    else if (ua.indexOf("Linux") > -1) os = "Linux";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) os = "iOS";
    
    return os;
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('Screenshot must be less than 5MB');
        return;
      }
      
      setScreenshot(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // For now, we'll log the submission and redirect to GitHub
      console.log('Feedback submission:', {
        type,
        title,
        description,
        email,
        timestamp: new Date().toISOString(),
        deviceInfo,
        hasScreenshot: !!screenshot
      });
      
      // Simulate a short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create GitHub issue body with device info
      let body = `## Description\n${description}\n\n`;
      
      if (screenshot) {
        body += `## Screenshot\n_User has attached a screenshot. Please check the follow-up comment for the image._\n\n`;
      }
      
      body += `## Device Information\n\`\`\`\n${deviceInfo}\n\`\`\`\n\n`;
      body += `## Details\n**Type:** ${type}\n**Email:** ${email || 'Not provided'}\n**Date:** ${new Date().toLocaleString()}\n\n_Submitted from Props Bible app_`;
      
      // Create GitHub issue URL with proper labels
      const issueUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(GITHUB_LABELS[type])}`;
      
      // Open GitHub issue creation page in a new tab
      window.open(issueUrl, '_blank');
      
      setSubmitStatus('success');
      
      // Reset form after successful submission
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'bug':
        return <Bug className="h-5 w-5 text-red-500" />;
      case 'feature':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center">
            <GitPullRequest className="h-5 w-5 mr-2 text-[var(--highlight-color)]" />
            Submit Feedback
          </h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Feedback Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setType('feedback')}
                className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
                  type === 'feedback' 
                    ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500' 
                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]/80'
                }`}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
                  type === 'bug' 
                    ? 'bg-red-500/10 text-red-500 ring-1 ring-red-500' 
                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]/80'
                }`}
              >
                <Bug className="h-4 w-4 mr-2" />
                Bug
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
                  type === 'feature' 
                    ? 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500' 
                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]/80'
                }`}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Feature
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder={type === 'bug' ? 'Brief description of the issue' : 'Summary of your suggestion'}
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description <span className="text-primary">*</span>
            </label>
            <WysiwygEditor
              value={description}
              onChange={(value) => setDescription(value)}
              placeholder={type === 'bug' ? 'Steps to reproduce, expected vs. actual behavior...' : 'Details about your idea...'}
              minHeight={150}
            />
          </div>
          
          {type === 'bug' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Screenshot
              </label>
              {screenshotPreview ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-[var(--border-color)]">
                  <img 
                    src={screenshotPreview} 
                    alt="Screenshot preview" 
                    className="max-h-48 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-black/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-[var(--border-color)] rounded-lg">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-10 w-10 text-[var(--text-secondary)]" />
                    <div className="flex text-sm text-[var(--text-secondary)]">
                      <label
                        htmlFor="screenshot"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                      >
                        <span>Upload a screenshot</span>
                        <input
                          id="screenshot"
                          name="screenshot"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="To follow up on your feedback (optional)"
            />
          </div>
          
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--input-bg)]/50 p-2 rounded">
            <p>Device information will be automatically included with your feedback.</p>
          </div>
          
          {submitStatus === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-md text-red-500 text-sm">
              {errorMessage}
            </div>
          )}
          
          {submitStatus === 'success' && (
            <div className="p-3 bg-green-500/10 border border-green-500 rounded-md text-green-500 text-sm">
              Your feedback has been submitted! Thank you for helping improve the app.
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !title || !description}
              className={`inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors ${
                isSubmitting || !title || !description
                  ? 'bg-primary/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit {getTypeIcon()}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 