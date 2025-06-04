import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../data/user';


export interface UserRegistrationData {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface UserLoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  sessionId: string;
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}

// Backend response interface
export interface UserData {
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:8080/api/users';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check authentication status on service initialization
    this.checkAuthenticationStatus();
  }

  /**
   * HTTP options for requests with credentials (sessions)
   */
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Important for session cookies
    };
  }

  /**
   * Convert backend UserData to frontend User model
   */
  private convertToUser(userData: UserData): User {
    return {
      id: userData.userId,
      username: userData.username,
      firstname: userData.firstname,
      lastname: userData.lastname,
      email: userData.email,
      roles: userData.roles || [],
      isAdmin: userData.isAdmin || false
    };
  }

  /**
   * Check if user is currently authenticated
   */
  private checkAuthenticationStatus(): void {
    this.getCurrentUserFromServer().subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      },
      error: () => {
        this.currentUserSubject.next(null);
        this.isLoggedInSubject.next(false);
      }
    });
  }

  /**
   * Register a new user
   */
  registerUser(userData: UserRegistrationData): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData, this.getHttpOptions());
  }

  /**
   * Login user with username and password (matching your component's call)
   */
  login(username: string, password: string): Observable<LoginResponse> {
    const loginData: UserLoginData = { username, password };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginData, this.getHttpOptions())
      .pipe(
        tap(response => {
          if (response && response.userId) {
            const user: User = {
              id: response.userId,
              username: response.username,
              firstname: response.firstname,
              lastname: response.lastname,
              email: response.email,
              roles: response.roles,
              isAdmin: response.isAdmin
            };

            this.currentUserSubject.next(user);
            this.isLoggedInSubject.next(true);
          }
        })
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {}, this.getHttpOptions())
      .pipe(
        tap(() => {
          this.currentUserSubject.next(null);
          this.isLoggedInSubject.next(false);
        })
      );
  }

  /**
   * Get current user data from server
   */
  getCurrentUserFromServer(): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/current`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData))
      );
  }

  /**
   * Get current user data from local state (synchronous)
   */
  getCurrentUserData(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user ID (synchronous)
   */
  getCurrentUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }

  /**
   * Get current user observable
   */
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  /**
   * Check if user is logged in (synchronous)
   */
  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  /**
   * Check if current user is admin (synchronous)
   */
  isAdmin(): boolean {
    const user = this.getCurrentUserData();
    return user?.isAdmin || false;
  }

  /**
   * Check if current user has specific role (synchronous)
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUserData();
    return user?.roles?.includes(roleName) || false;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<UserData[]>(this.baseUrl, this.getHttpOptions())
      .pipe(
        map(users => users.map(userData => this.convertToUser(userData)))
      );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/${id}`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData))
      );
  }

  /**
   * Check if user is admin by ID
   */
  isUserAdmin(id: number): Observable<{ isAdmin: boolean }> {
    return this.http.get<{ isAdmin: boolean }>(`${this.baseUrl}/${id}/is-admin`, this.getHttpOptions());
  }

  // Legacy method for backward compatibility
  createUser(user: any): Observable<any> {
    console.warn('createUser is deprecated, use registerUser instead');
    return this.registerUser(user);
  }
}
