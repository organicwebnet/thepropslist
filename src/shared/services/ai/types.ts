export interface VisionAPIResponse {
  labels: string[];
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
}

export interface VisionAPIService {
  analyzeImage(imageData: File | string): Promise<VisionAPIResponse>;
  detectText(imageData: File | string): Promise<string[]>;
}

export interface SpeechToTextResponse {
  text: string;
  confidence: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface SpeechService {
  startRecording(): Promise<void>;
  stopRecording(): Promise<SpeechToTextResponse>;
  transcribeAudioFile(file: File): Promise<SpeechToTextResponse>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotService {
  sendMessage(message: string): Promise<string>;
  getConversationHistory(): ChatMessage[];
  clearConversation(): void;
}

export interface AIService {
  visionAPI: VisionAPIService;
  speechToText: SpeechService;
  chatbot: ChatbotService;
} 