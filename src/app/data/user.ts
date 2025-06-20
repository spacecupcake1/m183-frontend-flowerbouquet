export interface User {
  id: number;
  userId?: number; // Optional alias
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  lastLogin?: string;
}

export interface LoginResponse {
  message: string;
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}
