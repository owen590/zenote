export interface Note {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  name: string;
}

export enum ViewMode {
  LIST = 'LIST',
  EDIT = 'EDIT',
  CARD = 'CARD',
}

export interface AIResponse {
  text: string;
  error?: string;
}

// Mocking the structure for saving files
export interface ExportOptions {
  format: 'md' | 'txt';
  includeTags: boolean;
}