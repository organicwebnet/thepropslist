import { FirebaseError } from '../firebase/types';

export interface QRCodeData {
  type: 'container' | 'prop' | 'location';
  id: string;
  packListId?: string;
  url: string;
  name?: string;
  category?: string;
  location?: string;
}

export interface QRCodeOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
}

export interface QRCodeService {
  generateQRCode(data: QRCodeData, options?: QRCodeOptions): Promise<string>;
  scanQRCode(imageData: Blob): Promise<QRCodeData>;
  generateBatchQRCodes(dataList: QRCodeData[], options?: QRCodeOptions): Promise<string[]>;
  validateQRCode(data: QRCodeData): boolean;
}

export class PropQRCodeService implements QRCodeService {
  private defaultOptions: QRCodeOptions = {
    size: 300,
    errorCorrectionLevel: 'M',
    margin: 4,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  };

  async generateQRCode(data: QRCodeData, options: QRCodeOptions = {}): Promise<string> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const qrData = this.formatQRData(data);
      
      // Using a third-party QR code library (you'll need to install one)
      // For example: qrcode, qrcode-generator, etc.
      // This is a placeholder for the actual implementation
      const qrCodeImage = await this.generateQRCodeImage(qrData, mergedOptions);
      
      return qrCodeImage;
    } catch (error) {
      throw new FirebaseError(
        'qr-code/generation-failed',
        'Failed to generate QR code',
        error
      );
    }
  }

  async scanQRCode(imageData: Blob): Promise<QRCodeData> {
    try {
      // Using a QR code scanning library (you'll need to install one)
      // For example: jsQR, zxing-js, etc.
      // This is a placeholder for the actual implementation
      const scannedData = await this.decodeQRCode(imageData);
      
      return this.parseQRData(scannedData);
    } catch (error) {
      throw new FirebaseError(
        'qr-code/scan-failed',
        'Failed to scan QR code',
        error
      );
    }
  }

  async generateBatchQRCodes(dataList: QRCodeData[], options: QRCodeOptions = {}): Promise<string[]> {
    try {
      return Promise.all(
        dataList.map(data => this.generateQRCode(data, options))
      );
    } catch (error) {
      throw new FirebaseError(
        'qr-code/batch-generation-failed',
        'Failed to generate batch QR codes',
        error
      );
    }
  }

  validateQRCode(data: QRCodeData): boolean {
    // Required fields validation
    if (!data.id || !data.name || !data.category) {
      return false;
    }

    // Validate id format (assuming UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.id)) {
      return false;
    }

    // Additional validation rules can be added here
    return true;
  }

  private formatQRData(data: QRCodeData): string {
    // Create a URL-safe format for the QR code data
    const urlSafeData = {
      ...data,
      v: '1', // Version number for future compatibility
      t: Date.now() // Timestamp for tracking when the QR code was generated
    };
    return JSON.stringify(urlSafeData);
  }

  private parseQRData(rawData: string): QRCodeData {
    try {
      const parsed = JSON.parse(rawData);
      if (!this.validateQRCode(parsed)) {
        throw new Error('Invalid QR code data format');
      }
      return parsed;
    } catch (error) {
      throw new FirebaseError(
        'qr-code/invalid-data',
        'Invalid QR code data format',
        error
      );
    }
  }

  private async generateQRCodeImage(data: string, options: QRCodeOptions): Promise<string> {
    // Placeholder for actual QR code generation
    // You would implement this using your chosen QR code library
    return 'data:image/png;base64,...';
  }

  private async decodeQRCode(imageData: Blob): Promise<string> {
    // Placeholder for actual QR code scanning
    // You would implement this using your chosen QR code scanning library
    return '{"propId":"...","name":"...","category":"..."}';
  }
} 