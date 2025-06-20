import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../data/user'; // Import the consistent User interface

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface AuthResponse {
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/users';

  // BehaviorSubject to track current user state
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  // Track authentication state
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize with user from session storage if available
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    // Initialize authentication state
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(!!storedUser);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    // Validate session on service initialization
    if (storedUser) {
      this.validateSession().subscribe({
        next: (isValid) => {
          if (!isValid) {
            this.clearAuthState();
          }
        },
        error: () => {
          this.clearAuthState();
        }
      });
    }
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials, {
      withCredentials: true // Important for session-based auth
    }).pipe(
      tap(response => {
        // Convert AuthResponse to User interface (data/user.ts)
        const user: User = {
          id: response.userId, // Map userId to id
          username: response.username,
          firstname: response.firstname,
          lastname: response.lastname,
          email: response.email || '', // Fallback to empty string if not provided
          roles: response.roles,
          isAdmin: response.isAdmin
        };

        this.setAuthState(user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearAuthState();
      }),
      catchError((error) => {
        // Even if logout fails on server, clear local state
        this.clearAuthState();
        return of({ message: 'Logged out locally' });
      })
    );
  }

  /**
   * Get current user information from server
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<any>(`${this.baseUrl}/current`, {
      withCredentials: true
    }).pipe(
      map(response => {
        // Convert server response to User interface (data/user.ts)
        const user: User = {
          id: response.userId || response.id, // Handle both possible field names
          username: response.username,
          firstname: response.firstname,
          lastname: response.lastname,
          email: response.email || '',
          roles: response.roles || [],
          isAdmin: response.isAdmin || false,
          lastLogin: response.lastLogin
        };
        return user;
      }),
      tap(user => {
        // Update stored user with fresh data from server
        this.setAuthState(user);
      }),
      catchError(error => {
        if (error.status === 401) {
          this.clearAuthState();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate current session with server
   */
  validateSession(): Observable<boolean> {
    if (!this.isAuthenticated()) {
      return of(false);
    }

    return this.getCurrentUser().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value && !!this.currentUserSubject.value;
  }

  /**
   * Get current user synchronously (for guards and services)
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user synchronously with proper typing
   */
  getCurrentUserSync(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUserValue();
    return user?.roles?.includes(role) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUserValue();
    if (!user?.roles) return false;

    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Check if user has all specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    const user = this.getCurrentUserValue();
    if (!user?.roles) return false;

    return roles.every(role => user.roles.includes(role));
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  /**
   * Get user's display name
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUserValue();
    if (user) {
      return `${user.firstname} ${user.lastname}`.trim();
    }
    return '';
  }

  /**
   * Get user's username
   */
  getUsername(): string {
    const user = this.getCurrentUserValue();
    return user?.username || '';
  }

  /**
   * Get user's ID
   */
  getUserId(): number | null {
    const user = this.getCurrentUserValue();
    return user?.id || null;
  }

  /**
   * Set authentication state
   */
  private setAuthState(user: User): void {
    // Store user in session storage for persistence across browser tabs
    this.storeUser(user);

    // Update subjects
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication state
   */
  clearAuthState(): void {
    // Clear stored user data
    this.clearStoredUser();

    // Update subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Store user in session storage
   */
  private storeUser(user: User): void {
    try {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user in session storage:', error);
    }
  }

  /**
   * Get stored user from session storage
   */
  private getStoredUser(): User | null {
    try {
      const storedUser = sessionStorage.getItem('currentUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.warn('Failed to parse stored user:', error);
      this.clearStoredUser();
      return null;
    }
  }

  /**
   * Clear stored user data
   */
  private clearStoredUser(): void {
    try {
      sessionStorage.removeItem('currentUser');
      // Also clear any legacy localStorage data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token'); // In case of previous token-based implementation
    } catch (error) {
      console.warn('Failed to clear stored user data:', error);
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = error.error?.error || 'Invalid credentials';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 429:
          errorMessage = error.error?.message || 'Too many requests. Please try again later.';
          break;
        case 400:
          if (error.error?.details) {
            // Validation errors
            const details = error.error.details;
            errorMessage = Object.values(details).join(', ');
          } else {
            errorMessage = error.error?.error || 'Invalid request';
          }
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 0:
          errorMessage = 'Unable to connect to server. Please check your connection.';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Auth Service Error:', error);
    return throwError(() => ({
      ...error,
      userMessage: errorMessage
    }));
  };

  /**
   * Auto-refresh session periodically (call this in app component)
   */
  startSessionRefresh(intervalMinutes: number = 25): void {
    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        if (this.isAuthenticated()) {
          this.validateSession().subscribe({
            next: (isValid) => {
              if (!isValid) {
                clearInterval(interval);
                this.clearAuthState();
                this.router.navigate(['/login'], {
                  queryParams: { message: 'Session expired. Please log in again.' }
                });
              }
            },
            error: () => {
              clearInterval(interval);
              this.clearAuthState();
            }
          });
        } else {
          clearInterval(interval);
        }
      }, intervalMinutes * 60 * 1000);
    }
  }

  /**
   * Force refresh current user data
   */
  refreshUser(): Observable<User> {
    return this.getCurrentUser();
  }

  /**
   * Check if user has permission for specific action (integrates with PermissionService)
   */
  hasPermission(permission: string): boolean {
    // This method can be enhanced based on your permission system
    const user = this.getCurrentUserValue();
    if (!user) return false;

    // Basic role-based permissions
    if (user.roles.includes('ROLE_ADMIN')) {
      return true; // Admins have all permissions
    }

    // Add more specific permission logic here
    switch (permission) {
      case 'view_flowers':
      case 'add_to_cart':
        return user.roles.includes('ROLE_USER');
      case 'manage_flowers':
      case 'create_flower':
      case 'edit_flower':
      case 'delete_flower':
        return user.roles.includes('ROLE_ADMIN');
      default:
        return false;
    }
  }
}
