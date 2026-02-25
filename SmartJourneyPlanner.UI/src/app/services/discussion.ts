
export interface VoteOption {
  optionText: string;
  voteCount: number;
}

export interface CommentItem {
  user: string;
  text: string;
  createdAt: Date; 
}

export interface DiscussionItem {
  id?: string; 
  title: string;
  description: string;
  user: string;
  type: 'Trip' | 'Other';
  createdAt: Date;
  options: VoteOption[]; 
  comments: CommentItem[]; 
  isConfirmed: boolean;
}