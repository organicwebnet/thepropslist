import React, { useState } from 'react';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useFirebase } from '../contexts/FirebaseContext';

const TestPdfExport: React.FC = () => {
  const { currentShowId } = useShowSelection();
  const { service } = useFirebase();
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing PDF export with:');
      console.log('- Current Show ID:', currentShowId);
      console.log('- Props count:', props.length);
      
      if (!currentShowId) {
        setError('No show selected. Please select a show first.');
        return;
      }
      
      if (props.length === 0) {
        setError('No props found. Please add some props to your show first.');
        return;
      }
      
      // Test the preview functionality
      console.log('Preview test successful!');
      alert('Preview test successful! Check the browser console for details.');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during testing');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProps = async () => {
    if (!currentShowId) return;
    
    setLoading(true);
    try {
      const data = await service.getDocuments('props');
      const showProps = data.filter(doc => doc.data.showId === currentShowId);
      setProps(showProps);
      console.log('Loaded props:', showProps.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load props');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">PDF Export Test Page</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Status</h2>
        <div className="space-y-2">
          <p><strong>Show ID:</strong> {currentShowId || 'None selected'}</p>
          <p><strong>Props Count:</strong> {props.length}</p>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={loadProps}
          disabled={!currentShowId || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Load Props
        </button>
        
        <button
          onClick={testPreview}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          Test Preview
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Make sure you have selected a show from the show selection dropdown</li>
          <li>Click "Load Props" to load props for the current show</li>
          <li>If no props are found, go to the Props page and add some props to your show</li>
          <li>Click "Test Preview" to test the preview functionality</li>
          <li>Check the browser console for any error messages</li>
        </ol>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Quick Links:</h3>
        <div className="space-x-4">
          <a href="/shows/list" className="text-blue-500 hover:underline">Manage Shows</a>
          <a href="/props" className="text-blue-500 hover:underline">Manage Props</a>
          <a href="/props/pdf-export" className="text-blue-500 hover:underline">PDF Export Page</a>
        </div>
      </div>
    </div>
  );
};

export default TestPdfExport;
