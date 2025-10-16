import React, { useState } from 'react';
import { SimplePdfService, type SimplePdfOptions } from '../services/pdf/SimplePdfService';
import { FieldMappingService, type UserPermissions } from '../services/pdf/FieldMappingService';
import type { Prop } from '../../types/props';

const DebugPdfExport: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testPdfGeneration = async () => {
    setLoading(true);
    setResult('Starting test...\n');

    try {
      // Create test data with proper types
      const testProps: Prop[] = [
        {
          id: '1',
          name: 'Test Prop 1',
          description: 'A test prop for PDF generation',
          status: 'Available' as any,
          location: 'Storage Room A',
          act: 1,
          scene: 1,
          quantity: 1,
          condition: 'Good',
          category: 'Furniture' as any,
          showId: 'test-show',
          userId: 'test-user',
          price: 100,
          source: 'bought' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Test Prop 2',
          description: 'Another test prop',
          status: 'In Use' as any,
          location: 'Stage Left',
          act: 2,
          scene: 3,
          quantity: 2,
          condition: 'Excellent',
          category: 'Hand Prop' as any,
          showId: 'test-show',
          userId: 'test-user',
          price: 50,
          source: 'made' as any,
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

      setResult(prev => prev + 'Calling PDF service...\n');

      const pdfService = SimplePdfService.getInstance();
      const result = await pdfService.generatePropsListPdf(
        testProps,
        testShowData,
        testUserPermissions,
        testOptions
      );

      setResult(prev => prev + `Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n`);
      setResult(prev => prev + `HTML length: ${result.html.length}\n`);
      setResult(prev => prev + `CSS length: ${result.css.length}\n`);
      
      if (result.success) {
        setResult(prev => prev + `HTML preview: ${result.html.substring(0, 500)}...\n`);
      } else {
        setResult(prev => prev + `Error: ${result.error}\n`);
      }

    } catch (error) {
      setResult(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug PDF Export</h1>
      <button
        onClick={testPdfGeneration}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Result:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
};

export default DebugPdfExport;




