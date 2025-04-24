declare module 'html-to-draftjs' {
  import { ContentBlock } from 'draft-js';
  
  interface ContentBlockResponse {
    contentBlocks: ContentBlock[];
    entityMap: {};
  }

  export default function htmlToDraft(html: string): ContentBlockResponse;
} 