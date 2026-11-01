export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: 'member' | 'admin';
  phone: string | null;
  active: boolean;
  hasPassword: boolean;
  google: boolean;
  createdAt: string;
}

export interface ApiBook {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  year: number;
  copiesTotal: number;
  copiesAvailable: number;
}

export interface ApiLoan {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  bookId: number;
  bookTitle: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewed: boolean;
  status: 'active' | 'overdue' | 'returned';
  daysOverdue: number;
  fine: number;
}

export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiStats {
  users: number;
  activeUsers: number;
  books: number;
  copiesAvailable: number;
  activeLoans: number;
  overdueLoans: number;
  finesCollected: number;
  topBooks: { title: string; loans: number }[];
}

export type Query = Record<string, string | number | boolean | undefined>;
