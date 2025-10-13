import React, { useState } from 'react';
import { SimplePdfService, type SimplePdfOptions } from '../services/pdf/SimplePdfService';
import { FieldMappingService, type UserPermissions } from '../services/pdf/FieldMappingService';
import type { Prop } from '../../types/props';

const TestPdfExport: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testPdfGeneration = async () => {
    setLoading(true);
    setResult('Starting test...\n');

    try {
      // Create test data
      const testProps: Prop[] = [
        {
          id: '1',
          name: 'Test Prop 1',
          description: 'A test prop for PDF generation',
          status: 'Available',
          location: 'Storage Room A',
          act: '1',
          scene: '1',
          quantity: 1,
          condition: 'Good',
          category: 'Furniture',
          showId: 'test-show',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Test Prop 2',
          description: 'Another test prop',
          status: 'In Use',
          location: 'Stage Left',
          act: '2',
          scene: '3',
          quantity: 2,
          condition: 'Excellent',
          category: 'Props',
          showId: 'test-show',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      const testShowData = {
        id: 'test-show',
        name: 'Test Show',
        venue: 'Test Theater',
        description: 'A test show for PDF generation',
      };

      const testUserPermissions: UserPermissions = {
        role: 'admin',
        permissions: ['view', 'export', 'edit'],
        showId: 'test-show',
        isOwner: true,
        isAdmin: true,
      };

      const testOptions: SimplePdfOptions = {
        selectedFields: {
          name: true,
          status: true,
          location: true,
          act: true,
          scene: true,
          quantity: true,
          condition: true,
        },
        title: 'Test Props List',
        showData: testShowData,
      };

      setResult(prev => prev + 'Test data created\n');
      setResult(prev => prev + `Props count: ${testProps.length}\n`);
      setResult(prev => prev + `Selected fields: ${Object.keys(testOptions.selectedFields).filter(k => testOptions.selectedFields[k]).join(', ')}\n`);

      // Test PDF generation
      const pdfService = SimplePdfService.getInstance();
      const pdfResult = await pdfService.generatePropsListPdf(
        testProps,
        testShowData,
        testUserPermissions,
        testOptions
      );

      setResult(prev => prev + `PDF generation result: ${pdfResult.success ? 'SUCCESS' : 'FAILED'}\n`);
      
      if (pdfResult.success) {
        setResult(prev => prev + `HTML length: ${pdfResult.html.length}\n`);
        setResult(prev => prev + `CSS length: ${pdfResult.css.length}\n`);
        
        // Show first 500 characters of HTML
        setResult(prev => prev + `HTML preview: ${pdfResult.html.substring(0, 500)}...\n`);
        
        // Create a downloadable file
        const blob = new Blob([pdfResult.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-props-list.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setResult(prev => prev + 'Test file downloaded!\n');
      } else {
        setResult(prev => prev + `Error: ${pdfResult.error}\n`);
      }

    } catch (error) {
      setResult(prev => prev + `Exception: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PDF Export Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test PDF Generation</h2>
          <button
            onClick={testPdfGeneration}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
            {result || 'Click "Run Test" to see results...'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestPdfExport;