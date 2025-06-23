import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../data/user';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  message: string;
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  sessionId?: string;
}

interface LogoutResponse {
  message: string;
  username?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Updated to use environment configuration for consistency
  private readonly API_URL = `${environment.apiUrl}/users`;

  // BehaviorSubjects for reactive authentication state
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  public currentUser = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize authentication state on service creation
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from session
   */
  private initializeAuthState(): void {
    this.http.get<User>(`${this.API_URL}/current`, {
      withCredentials: true
    }).subscribe({
      next: (user) => {
        if (user) {
          this.setAuthState(user);
          console.log('Existing session found:', user.username);
        }
      },
      error: () => {
        this.clearAuthState();
        console.log('No existing session found');
      }
    });
  }

  /**
   * User login - overloaded to support both parameter styles
   */
  login(username: string, password: string): Observable<LoginResponse>;
  login(credentials: { username: string; password: string }): Observable<LoginResponse>;
  login(usernameOrCredentials: string | { username: string; password: string }, password?: string): Observable<LoginResponse> {
    let loginData: LoginRequest;

    if (typeof usernameOrCredentials === 'string') {
      // Called with separate parameters
      loginData = {
        username: usernameOrCredentials.trim(),
        password: password!
      };
    } else {
      // Called with credentials object
      loginData = {
        username: usernameOrCredentials.username.trim(),
        password: usernameOrCredentials.password
      };
    }

    console.log('Making login request to:', `${this.API_URL}/login`);

    return this.http.post<LoginResponse>(`${this.API_URL}/login`, loginData, {
      withCredentials: true // Important for session-based auth
    }).pipe(
      tap(response => {
        // Convert LoginResponse to User object
        const user: User = {
          id: response.userId,
          userId: response.userId,
          username: response.username,
          email: response.email,
          firstname: response.firstname,
          lastname: response.lastname,
          roles: response.roles,
          isAdmin: response.isAdmin
        };

        // Update authentication state
        this.setAuthState(user);
        console.log('Login successful:', response.message);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * User logout
   */
  logout(): Observable<LogoutResponse> {
    return this.http.post<LogoutResponse>(`${this.API_URL}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(response => {
        // Clear authentication state
        this.clearAuthState();
        console.log('Logout successful:', response.message);
      }),
      catchError(error => {
        // Even if logout request fails, clear local state
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user from server
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/current`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Check if current user is admin (synchronous)
   */
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.isAdmin || false;
  }

  /**
   * Get current user value (synchronous)
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles?.includes(role) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;

    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    const user = this.currentUserSubject.value;
    if (!user) return '';

    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }

    return user.username || 'User';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    const user = this.currentUserSubject.value;
    if (!user) return '?';

    if (user.firstname && user.lastname) {
      return `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
    }

    return user.username?.charAt(0).toUpperCase() || '?';
  }

  /**
   * Update user in state (for profile updates)
   */
  updateUserInState(updatedUser: User): void {
    this.setAuthState(updatedUser);
  }

  /**
   * Set authentication state
   */
  private setAuthState(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication state
   */
  clearAuthState(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get user capabilities for UI
   */
  getUserCapabilities(): { canManageUsers: boolean; canViewReports: boolean; canEditFlowers: boolean; } {
    const user = this.currentUserSubject.value;
    const isAdmin = user?.isAdmin || false;
    const hasAdminRole = this.hasRole('ROLE_ADMIN');

    return {
      canManageUsers: isAdmin || hasAdminRole,
      canViewReports: isAdmin || hasAdminRole,
      canEditFlowers: isAdmin || hasAdminRole
    };
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage: string;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid username or password';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Service not found. Please check your connection.';
          break;
        case 429:
          errorMessage = 'Too many attempts. Please try again later';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }

    console.error('Auth Service Error:', error);
    console.error('Error Details:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Debug method for development
   */
  debugAuthState(): void {
    console.log('=== Auth Service Debug ===');
    console.log('API URL:', this.API_URL);
    console.log('Current User:', this.currentUserSubject.value);
    console.log('Is Authenticated:', this.isAuthenticatedSubject.value);
    console.log('Is Admin:', this.isAdmin());
    console.log('User Display Name:', this.getUserDisplayName());
    console.log('User Capabilities:', this.getUserCapabilities());
    console.log('==========================');
  }
}
