import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../data/user';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  message: string;
  user: User;
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
  private readonly API_URL = '/api/users';

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
    // Use a simple HTTP call without going through interceptors to avoid circular dependency
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

    return this.http.post<LoginResponse>(`${this.API_URL}/login`, loginData, {
      withCredentials: true // Important for session-based auth
    }).pipe(
      tap(response => {
        // Update authentication state
        this.setAuthState(response.user);
        console.log('Login successful:', response.message);
      }),
      catchError(this.handleError)
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
        return throwError(error);
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
      catchError(this.handleError)
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
   * Get user role display
   */
  getUserRoleDisplay(): string {
    const user = this.currentUserSubject.value;
    if (!user) return '';

    if (this.isAdmin()) {
      return 'Administrator';
    }

    if (user.roles && user.roles.length > 0) {
      return user.roles.map(role =>
        role.replace('ROLE_', '').toLowerCase()
      ).join(', ');
    }

    return 'User';
  }

  /**
   * Check if user account is verified
   */
  isUserVerified(): boolean {
    const user = this.currentUserSubject.value;
    return user?.emailVerified || false;
  }

  /**
   * Set authentication state (called after successful login or user refresh)
   */
  setAuthState(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication state (called on logout or auth failure)
   */
  clearAuthState(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Refresh user data from server
   */
  refreshUser(): Observable<User> {
    return this.getCurrentUser().pipe(
      tap(user => {
        this.setAuthState(user);
      }),
      catchError(error => {
        this.clearAuthState();
        return throwError(error);
      })
    );
  }

  /**
   * Update user data in state (after profile update)
   */
  updateUserInState(updatedUser: User): void {
    this.currentUserSubject.next(updatedUser);
  }

  /**
   * Check if session is valid
   */
  checkSession(): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (user) {
          this.setAuthState(user);
          return true;
        } else {
          this.clearAuthState();
          return false;
        }
      }),
      catchError(() => {
        this.clearAuthState();
        return [false];
      })
    );
  }

  /**
   * Force logout (clear state and optionally redirect)
   */
  forceLogout(redirectToLogin: boolean = true): void {
    this.clearAuthState();

    if (redirectToLogin) {
      this.router.navigate(['/login'], {
        queryParams: { message: 'Session expired. Please log in again.' }
      });
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any): void {
    console.error('Authentication error:', error);

    if (error.status === 401 || error.status === 403) {
      this.forceLogout();
    }
  }

  /**
   * Get authentication headers for manual requests
   */
  getAuthHeaders(): { [header: string]: string } {
    // For session-based auth, credentials are handled by cookies
    // This method exists for compatibility but returns empty headers
    return {};
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdmin(): boolean {
    return this.isAdmin() && this.isAuthenticated();
  }

  /**
   * Check if user can access specific feature
   */
  canAccess(requiredRoles: string[]): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }

    if (requiredRoles.length === 0) {
      return true; // No specific roles required, just authentication
    }

    return this.hasAnyRole(requiredRoles);
  }

  /**
   * Get user permissions/capabilities
   */
  getUserCapabilities(): string[] {
    const user = this.currentUserSubject.value;
    if (!user) return [];

    const capabilities: string[] = ['read'];

    if (user.roles?.includes('ROLE_USER')) {
      capabilities.push('create_bouquet', 'purchase');
    }

    if (user.roles?.includes('ROLE_ADMIN')) {
      capabilities.push('admin', 'manage_flowers', 'manage_users', 'view_analytics');
    }

    if (user.roles?.includes('ROLE_MODERATOR')) {
      capabilities.push('moderate_content', 'manage_orders');
    }

    return capabilities;
  }

  /**
   * Check if user has specific capability
   */
  hasCapability(capability: string): boolean {
    return this.getUserCapabilities().includes(capability);
  }

  /**
   * Handle HTTP errors - simplified to avoid circular dependencies
   */
  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid credentials or session expired';
          // Don't call handleAuthError here to avoid potential circular calls
          this.clearAuthState();
          break;
        case 403:
          errorMessage = 'Access denied';
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

    console.error('Auth Service Error:', errorMessage);
    return throwError(errorMessage);
  }

  /**
   * Debug method for development
   */
  debugAuthState(): void {
    console.log('=== Auth Service Debug ===');
    console.log('Current User:', this.currentUserSubject.value);
    console.log('Is Authenticated:', this.isAuthenticatedSubject.value);
    console.log('Is Admin:', this.isAdmin());
    console.log('User Display Name:', this.getUserDisplayName());
    console.log('User Capabilities:', this.getUserCapabilities());
    console.log('==========================');
  }
}
