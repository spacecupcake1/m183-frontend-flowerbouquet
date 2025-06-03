export class User {
  public id!: number;
  public username = '';
  public firstname = '';
  public lastname = '';
  public email = '';
  public password = '';
  public roles?: string[];
  public isAdmin?: boolean;
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
