import React, { useEffect } from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';

const HelpPage: React.FC = () => {
  useEffect(() => {
    // Redirect to the marketing site help documentation
    window.location.href = 'https://thepropslist.uk/help/';
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to Help Documentation</h1>
        <p className="text-gray-600 mb-6">
          You're being redirected to our comprehensive help documentation on the marketing site.
        </p>
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <span>If you're not redirected automatically,</span>
          <a 
            href="https://thepropslist.uk/help/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 hover:underline"
          >
            <span>click here</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;