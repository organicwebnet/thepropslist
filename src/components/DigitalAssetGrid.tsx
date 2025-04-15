import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import type { DigitalAsset } from '../types';

interface DigitalAssetGridProps {
  assets: DigitalAsset[];
  showQRCodes?: boolean;
}

export function DigitalAssetGrid({ assets, showQRCodes = false }: DigitalAssetGridProps) {
  const [qrCodes, setQrCodes] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (showQRCodes) {
      assets.forEach(async (asset) => {
        try {
          const qrCode = await QRCode.toDataURL(asset.url, {
            width: 100,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setQrCodes(prev => ({ ...prev, [asset.id]: qrCode }));
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      });
    }
  }, [assets, showQRCodes]);

  if (assets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-4"
        >
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-grow min-w-0">
              <h3 className="text-white font-medium truncate">{asset.title}</h3>
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-primary hover:text-primary/80 text-sm mt-1"
              >
                <span>Open File</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {showQRCodes && qrCodes[asset.id] && (
            <div className="flex justify-center">
              <img
                src={qrCodes[asset.id]}
                alt={`QR Code for ${asset.title}`}
                className="w-24 h-24"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}