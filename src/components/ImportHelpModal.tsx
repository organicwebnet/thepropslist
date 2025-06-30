import React from 'react';
import { X, FileSpreadsheet, FileText, ArrowRight } from 'lucide-react';

interface ImportHelpModalProps {
  onClose: () => void;
}

export function ImportHelpModal({ onClose }: ImportHelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">Import Instructions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Google Sheets Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="h-6 w-6 text-green-400" />
              <h3 className="text-xl font-semibold text-white">Google Sheets Import</h3>
            </div>
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Open Google Sheets and create a new spreadsheet</li>
              <li>Click <span className="text-gray-200 font-medium">File</span> <ArrowRight className="inline h-4 w-4" /> <span className="text-gray-200 font-medium">Import</span></li>
              <li>Select the <span className="text-gray-200 font-medium">Upload</span> tab</li>
              <li>Click <span className="text-gray-200 font-medium">Select a file from your device</span> and choose your exported CSV file</li>
              <li>In the Import options:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-400">
                  <li>Import location: Choose <span className="text-gray-200 font-medium">"Replace current sheet"</span> or <span className="text-gray-200 font-medium">"Insert new sheet"</span></li>
                  <li>Separator type: Select <span className="text-gray-200 font-medium">"Comma"</span></li>
                  <li>Click <span className="text-gray-200 font-medium">"Import data"</span></li>
                </ul>
              </li>
            </ol>

            <div className="bg-[#2A2A2A] p-4 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-200 mb-2">Recommended Formatting</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                <li>Freeze the header row: View <ArrowRight className="inline h-3 w-3" /> Freeze <ArrowRight className="inline h-3 w-3" /> 1 row</li>
                <li>Enable filters: Data <ArrowRight className="inline h-3 w-3" /> Create a filter</li>
                <li>Format currency columns: Select price columns <ArrowRight className="inline h-3 w-3" /> Format <ArrowRight className="inline h-3 w-3" /> Number <ArrowRight className="inline h-3 w-3" /> Currency</li>
              </ul>
            </div>
          </div>

          {/* Google Docs Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Google Docs Template</h3>
            </div>
            <p className="text-gray-300">To create a professional props document:</p>
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Create a new Google Doc</li>
              <li>Set up the document structure:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-400">
                  <li>Title page with show name and production details</li>
                  <li>Table of contents</li>
                  <li>Props summary by act/scene</li>
                  <li>Detailed props list with images and specifications</li>
                  <li>Budget summary</li>
                </ul>
              </li>
              <li>Import data from your Google Sheet:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-gray-400">
                  <li>Add-ons <ArrowRight className="inline h-3 w-3" /> Get add-ons</li>
                  <li>Search for and install "Sheets to Docs"</li>
                  <li>Use the add-on to import your formatted props data</li>
                </ul>
              </li>
            </ol>

            <div className="bg-[#2A2A2A] p-4 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-200 mb-2">Template Tips</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                <li>Use consistent headings for easy navigation</li>
                <li>Include a props checklist for each scene</li>
                <li>Add space for notes and special handling instructions</li>
                <li>Consider adding a prop maintenance schedule for consumables</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
