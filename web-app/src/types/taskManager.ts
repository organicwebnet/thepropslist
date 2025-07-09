export interface CardData {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  imageUrl?: string;
  assignedTo?: string[];
  labels?: string[];
  checklist?: { id: string; text: string; checked: boolean }[];
  comments?: { id: string; userId: string; text: string; createdAt: string }[];
  activityLog?: { id: string; type: string; userId: string; timestamp: string; details?: any }[];
  attachments?: string[];
  completed?: boolean;
  propId?: string;
  [key: string]: any;
}

export interface ListData {
  id: string;
  title: string;
  cardIds: string[];
  [key: string]: any;
}

export interface BoardData {
  id: string;
  title: string;
  listIds: string[];
  showId?: string;
  [key: string]: any;
} 