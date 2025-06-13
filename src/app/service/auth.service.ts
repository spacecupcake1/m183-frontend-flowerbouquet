import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { LoginResponse, User } from '../data/user';

export interface AuthenticationState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication service for managing user authentication state and operations.
 * Provides secure authentication methods and state management for the application.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl = 'http://localhost:8080/api/users';

  // Authentication state management
  private authStateSubject = new BehaviorSubject<AuthenticationState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });

  public authState$ = this.authStateSubject.asObservable();

  // Convenience observables
  public isAuthenticated$ = this.authState$.pipe(map(state => state.isAuthenticated));
  public currentUser$ = this.authState$.pipe(map(state => state.user));
  public isLoading$ = this.authState$.pipe(map(state => state.isLoading));
  public error$ = this.authState$.pipe(map(state => state.error));

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize authentication state on service creation
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state by checking current session.
   */
  private initializeAuthState(): void {
    this.updateAuthState({ isLoading: true, error: null });

    this.getCurrentUser().subscribe({
      next: (user) => {
        this.updateAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null
        });
      },
      error: () => {
        this.updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        });
      }
    });
  }

  /**
   * Updates the authentication state.
   */
  private updateAuthState(updates: Partial<AuthenticationState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...updates });
  }

  /**
   * Gets HTTP options with credentials for session-based authentication.
   */
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        // Don't add security headers like X-Content-Type-Options - those are response headers
      }),
      withCredentials: true // Important for session cookies
    };
  }

  /**
   * Authenticates user with username and password.
   */
  login(username: string, password: string): Observable<LoginResponse> {
    this.updateAuthState({ isLoading: true, error: null });

    // Create login data object that matches backend expectations
    const loginData = {
      username: username.trim(),
      password: password // Don't modify password
    };

    console.log('AuthService: Sending login request', { username: loginData.username, password: '***' });

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, loginData, this.getHttpOptions())
      .pipe(
        tap(response => {
          console.log('AuthService: Login response received', response);

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

            this.updateAuthState({
              isAuthenticated: true,
              user,
              isLoading: false,
              error: null
            });

            // Store session info for offline checks (optional)
            this.storeSessionInfo(response);
          }
        }),
        catchError(error => {
          console.error('AuthService: Login error', error);

          this.updateAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: this.extractErrorMessage(error)
          });
          throw error;
        })
      );
  }

  /**
   * Logs out the current user.
   */
  logout(): Observable<any> {
    this.updateAuthState({ isLoading: true, error: null });

    return this.http.post(`${this.baseUrl}/logout`, {}, this.getHttpOptions())
      .pipe(
        tap(() => {
          this.clearAuthState();
        }),
        catchError(error => {
          // Even if logout fails on server, clear local state
          this.clearAuthState();
          return of(null); // Don't throw error for logout
        })
      );
  }

  /**
   * Registers a new user.
   */
  register(userData: any): Observable<any> {
    this.updateAuthState({ isLoading: true, error: null });

    return this.http.post(`${this.baseUrl}/register`, userData, this.getHttpOptions())
      .pipe(
        tap(() => {
          this.updateAuthState({ isLoading: false, error: null });
        }),
        catchError(error => {
          this.updateAuthState({
            isLoading: false,
            error: this.extractErrorMessage(error)
          });
          throw error;
        })
      );
  }

  /**
   * Gets current user information from server.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<any>(`${this.baseUrl}/current`, this.getHttpOptions())
      .pipe(
        map(userData => ({
          id: userData.userId,
          username: userData.username,
          firstname: userData.firstname,
          lastname: userData.lastname,
          email: userData.email,
          roles: userData.roles || [],
          isAdmin: userData.isAdmin || false
        })),
        catchError(error => {
          // User not authenticated
          throw error;
        })
      );
  }

  /**
   * Refreshes current user data.
   */
  refreshUser(): Observable<User> {
    return this.getCurrentUser().pipe(
      tap(user => {
        this.updateAuthState({ user });
      })
    );
  }

  /**
   * Checks if user is currently authenticated (synchronous).
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Gets current user (synchronous).
   */
  getCurrentUserSync(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Checks if current user has admin role.
   */
  isAdmin(): boolean {
    const user = this.getCurrentUserSync();
    return user?.isAdmin || false;
  }

  /**
   * Checks if current user has specific role.
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUserSync();
    return user?.roles?.includes(roleName) || false;
  }

  /**
   * Checks if current user has any of the specified roles.
   */
  hasAnyRole(roleNames: string[]): boolean {
    const user = this.getCurrentUserSync();
    if (!user?.roles) return false;
    return roleNames.some(role => user.roles.includes(role));
  }

  /**
   * Checks if current user has all of the specified roles.
   */
  hasAllRoles(roleNames: string[]): boolean {
    const user = this.getCurrentUserSync();
    if (!user?.roles) return false;
    return roleNames.every(role => user.roles.includes(role));
  }

  /**
   * Gets user display name.
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUserSync();
    if (!user) return '';

    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    } else if (user.firstname) {
      return user.firstname;
    } else {
      return user.username;
    }
  }

  /**
   * Clears authentication state.
   */
  clearAuthState(): void {
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null
    });
    this.clearSessionInfo();
  }

  /**
   * Clears user session (called by interceptor).
   */
  clearUserSession(): void {
    this.clearAuthState();
  }

  /**
   * Stores session information for offline checks.
   */
  private storeSessionInfo(response: LoginResponse): void {
    try {
      // Store minimal session info (not sensitive data)
      const sessionInfo = {
        userId: response.userId,
        username: response.username,
        roles: response.roles,
        isAdmin: response.isAdmin,
        timestamp: Date.now()
      };

      // Use sessionStorage for session-scoped data
      sessionStorage.setItem('auth_session', JSON.stringify(sessionInfo));
    } catch (error) {
      console.warn('Failed to store session info:', error);
    }
  }

  /**
   * Clears stored session information.
   */
  private clearSessionInfo(): void {
    try {
      sessionStorage.removeItem('auth_session');
      localStorage.removeItem('user'); // Clear any legacy data
    } catch (error) {
      console.warn('Failed to clear session info:', error);
    }
  }

  /**
   * Extracts user-friendly error message from HTTP error.
   */
  private extractErrorMessage(error: any): string {
    if (error.error && typeof error.error === 'string') {
      try {
        const errorObj = JSON.parse(error.error);
        return errorObj.message || 'An error occurred';
      } catch {
        return error.error;
      }
    } else if (error.error && error.error.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (error.status === 0) {
      return 'Unable to connect to server';
    } else if (error.status === 401) {
      return 'Invalid credentials';
    } else if (error.status === 403) {
      return 'Access denied';
    } else if (error.status === 429) {
      return 'Too many attempts. Please try again later';
    } else if (error.status >= 500) {
      return 'Server error. Please try again later';
    } else {
      return 'An unexpected error occurred';
    }
  }

  /**
   * Validates session is still active.
   */
  validateSession(): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Auto-refresh session periodically (call this in app component).
   */
  startSessionRefresh(intervalMinutes: number = 25): void {
    setInterval(() => {
      if (this.isAuthenticated()) {
        this.validateSession().subscribe({
          next: (isValid) => {
            if (!isValid) {
              this.clearAuthState();
              this.router.navigate(['/login'], {
                queryParams: { message: 'Session expired' }
              });
            }
          },
          error: () => {
            // Session validation failed
            this.clearAuthState();
          }
        });
      }
    }, intervalMinutes * 60 * 1000);
  }
}
