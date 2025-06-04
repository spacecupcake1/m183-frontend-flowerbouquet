export interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  password?: string; // Optional since we don't send passwords to frontend
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
