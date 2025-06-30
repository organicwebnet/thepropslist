export interface CardLabel {
  id: string;
  name: string;
  color: string;
}

export interface CustomTimestamp {
  toDate: () => Date;
}

export interface MemberData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarInitials?: string;
}

export interface ChecklistItemData {
  id: string;
  text: string;
  completed: boolean;
}

export interface ChecklistData {
  id: string;
  title: string;
  items: ChecklistItemData[];
}

export interface CommentData {
  id: string;
  userId: string;
  userName: string;
  userAvatarInitials?: string;
  text: string;
  createdAt: string; // ISO string
}

export interface ActivityData {
  id: string;
  text: string;
  date: string; // ISO string
}

export interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  description?: string;
  dueDate?: string | CustomTimestamp | null;
  imageUrl?: string;
  linkUrl?: string;
  createdAt?: string | CustomTimestamp;
  assignedTo?: string[]; // user IDs
  labels?: CardLabel[];
  members?: MemberData[];
  checklists?: ChecklistData[];
  comments?: CommentData[];
  activity?: ActivityData[];
  attachments?: AttachmentData[];
  images?: string[];
  completed?: boolean;
  propId?: string; // Link to a prop for status sync
}

export interface ListData {
  id: string;
  name: string;
  order: number;
  boardId?: string;
}

export interface BoardData {
  id: string;
  name: string;
  ownerId?: string;
  showId?: string;
}

export interface AttachmentData {
  id: string;
  name: string;
  title?: string; // Optional title
  url: string;
  type: 'image' | 'video' | 'document' | 'other';
} 
