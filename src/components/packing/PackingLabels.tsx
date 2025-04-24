import React, { useState, useEffect } from 'react';
import { PackingLabel, PackListService } from '../../shared/services/inventory/packListService';

interface PackingLabelsProps {
  packListId: string;
  packListService: PackListService;
  onError?: (error: string) => void;
}

export const PackingLabels: React.FC<PackingLabelsProps> = ({
  packListId,
  packListService,
  onError
}) => {
  const [labels, setLabels] = useState<PackingLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabels();
  }, [packListId]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const generatedLabels = await packListService.generatePackingLabels(packListId);
      setLabels(generatedLabels);
    } catch (err) {
      onError?.('Failed to generate labels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div>Generating labels...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Packing Labels</h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Print Labels
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        {labels.map((label) => (
          <div
            key={label.id}
            className="border rounded p-4 print:break-inside-avoid"
          >
            {/* Container Info */}
            <div className="mb-4">
              <h3 className="font-bold text-lg">{label.containerName}</h3>
              <div className="text-sm text-gray-600">
                <div>Status: {label.containerStatus}</div>
                <div>Props: {label.propCount}</div>
                {label.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {label.labels.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 px-2 py-0.5 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <img
                src={label.qrCode}
                alt={`QR Code for ${label.containerName}`}
                className="w-32 h-32"
              />
            </div>

            {/* URL */}
            <div className="text-center text-sm text-gray-500 break-all">
              {label.url}
            </div>

            {/* Generated Date */}
            <div className="text-center text-xs text-gray-400 mt-2">
              Generated: {label.generatedAt.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-section, .print-section * {
              visibility: visible;
            }
            .print-section {
              position: absolute;
              left: 0;
              top: 0;
            }
            @page {
              margin: 1cm;
            }
          }
        `}
      </style>
    </div>
  );
}; 