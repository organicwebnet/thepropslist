import { FirebaseError } from '../firebase/types.ts';

export interface VisionAPIResponse {
  labels: string[];
  description: string;
  categories: string[];
  confidence: number;
}

export interface VisionAPIService {
  identifyProp(imageData: Blob): Promise<VisionAPIResponse>;
  generateDescription(imageData: Blob): Promise<string>;
  suggestCategories(imageData: Blob): Promise<string[]>;
}

export class GoogleVisionService implements VisionAPIService {
  private apiKey: string;
  private baseUrl = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async identifyProp(imageData: Blob): Promise<VisionAPIResponse> {
    try {
      const base64Image = await this.blobToBase64(imageData);
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64Image
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
              { type: 'IMAGE_PROPERTIES' },
              { type: 'TEXT_DETECTION' }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new FirebaseError(
          'vision-api/request-failed',
          'Failed to process image with Vision API'
        );
      }

      const data = await response.json();
      const result = data.responses[0];

      return {
        labels: result.labelAnnotations?.map((label: any) => label.description) || [],
        description: this.generateDescriptionFromAnnotations(result),
        categories: this.extractCategories(result),
        confidence: result.labelAnnotations?.[0]?.score || 0
      };
    } catch (error) {
      throw new FirebaseError(
        'vision-api/process-failed',
        'Failed to process image',
        error
      );
    }
  }

  async generateDescription(imageData: Blob): Promise<string> {
    const result = await this.identifyProp(imageData);
    return result.description;
  }

  async suggestCategories(imageData: Blob): Promise<string[]> {
    const result = await this.identifyProp(imageData);
    return result.categories;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private generateDescriptionFromAnnotations(result: any): string {
    const labels = result.labelAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];
    const text = result.textAnnotations?.[0]?.description || '';

    let description = 'This prop appears to be ';

    if (objects.length > 0) {
      description += `a ${objects[0].name.toLowerCase()}`;
    } else if (labels.length > 0) {
      description += `a ${labels[0].description.toLowerCase()}`;
    }

    if (labels.length > 1) {
      description += ` with ${labels[1].description.toLowerCase()} characteristics`;
    }

    if (text) {
      description += `. It contains text that reads "${text}"`;
    }

    return description.trim();
  }

  private extractCategories(result: any): string[] {
    const categories = new Set<string>();
    const labels = result.labelAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];

    // Map Vision API labels to prop categories
    const categoryMappings: Record<string, string> = {
      'Furniture': 'Furniture',
      'Weapon': 'Weapons',
      'Clothing': 'Costumes',
      'Food': 'Food/Drink',
      'Book': 'Books/Documents',
      'Musical Instrument': 'Musical Instruments',
      'Tool': 'Tools/Equipment'
    };

    // Check labels and objects against our category mappings
    [...labels, ...objects].forEach(item => {
      const description = item.description || item.name;
      for (const [key, category] of Object.entries(categoryMappings)) {
        if (description.toLowerCase().includes(key.toLowerCase())) {
          categories.add(category);
        }
      }
    });

    return Array.from(categories);
  }
} 
