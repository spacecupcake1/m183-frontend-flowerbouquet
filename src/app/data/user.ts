export interface User {
  id?: number;
  userId?: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  roles: string[];
  isAdmin: boolean;
  emailVerified?: boolean;
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
  enabled?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
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
