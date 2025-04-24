import { BarCodeScanner } from 'expo-barcode-scanner';

export interface QRScanResult {
  type: string;
  data: string;
}

export class QRScannerService {
  private static instance: QRScannerService;

  private constructor() {}

  static getInstance(): QRScannerService {
    if (!QRScannerService.instance) {
      QRScannerService.instance = new QRScannerService();
    }
    return QRScannerService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    return status === 'granted';
  }

  async hasPermissions(): Promise<boolean> {
    const { status } = await BarCodeScanner.getPermissionsAsync();
    return status === 'granted';
  }

  parseQRData(data: string): Record<string, any> {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return { raw: data };
    }
  }

  generateQRData(propData: Record<string, any>): string {
    try {
      return JSON.stringify(propData);
    } catch (error) {
      console.error('Error generating QR data:', error);
      throw error;
    }
  }
} 