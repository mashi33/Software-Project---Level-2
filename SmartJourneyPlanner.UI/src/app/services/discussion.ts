
export interface VoteOption {
  optionText: string;
  voteCount: number;
}

export interface CommentItem {
  user: string;
  text: string;
  createdAt: Date; // Removed '?' because the chat logic requires a date for sorting/dividers
}

export interface DiscussionItem {
  id?: string; // Optional because new items don't have an ID yet
  title: string;
  description: string;
  user: string;
  type: 'Trip' | 'Other';
  createdAt: Date;
  options: VoteOption[]; 
  comments: CommentItem[]; // CHANGED: Now uses the CommentItem interface instead of 'any'
  isConfirmed: boolean;
}