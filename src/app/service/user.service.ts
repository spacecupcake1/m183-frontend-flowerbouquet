import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../data/user';
import { ValidationService } from './validation.service';

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

export interface UserData {
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin?: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  fieldErrors?: { [key: string]: string };
}

/**
 * Enhanced UserService with comprehensive security features and error handling.
 * Integrates with AuthService and provides user management capabilities.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:8080/api/users';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private validationService: ValidationService
  ) {
    this.initializeUserState();
  }

  /**
   * Initialize user state on service creation.
   */
  private initializeUserState(): void {
    this.checkAuthenticationStatus();
  }

  /**
   * HTTP options for requests with credentials (sessions).
   */
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }),
      withCredentials: true
    };
  }

  /**
   * Convert backend UserData to frontend User model.
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
   * Check if user is currently authenticated.
   */
  private checkAuthenticationStatus(): void {
    this.setLoading(true);
    this.getCurrentUserFromServer().subscribe({
      next: (user) => {
        this.updateUserState(user, true);
        this.setLoading(false);
      },
      error: () => {
        this.updateUserState(null, false);
        this.setLoading(false);
      }
    });
  }

  /**
   * Update user state and notify subscribers.
   */
  private updateUserState(user: User | null, isLoggedIn: boolean): void {
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(isLoggedIn);
  }

  /**
   * Set loading state.
   */
  private setLoading(loading: boolean): void {
    this.isLoadingSubject.next(loading);
  }

  /**
   * Register a new user with comprehensive validation.
   */
  registerUser(userData: UserRegistrationData): Observable<any> {
    // Client-side validation
    const validationErrors = this.validateRegistrationData(userData);
    if (Object.keys(validationErrors).length > 0) {
      return throwError(() => ({
        error: {
          error: 'Validation failed',
          fieldErrors: validationErrors
        }
      }));
    }

    // Sanitize inputs
    const sanitizedData = this.sanitizeRegistrationData(userData);

    this.setLoading(true);
    return this.http.post(`${this.baseUrl}/register`, sanitizedData, this.getHttpOptions())
      .pipe(
        tap(() => this.setLoading(false)),
        catchError(error => {
          this.setLoading(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Login user with username and password.
   */
  login(username: string, password: string): Observable<LoginResponse> {
    // Client-side validation
    if (!this.validationService.isValidUsername(username)) {
      return throwError(() => ({
        error: { message: 'Invalid username format' }
      }));
    }

    if (!password || password.length < 6) {
      return throwError(() => ({
        error: { message: 'Password must be at least 6 characters' }
      }));
    }

    // Sanitize username (don't sanitize password)
    const sanitizedUsername = this.validationService.sanitizeInput(username);
    const loginData: UserLoginData = {
      username: sanitizedUsername,
      password
    };

    this.setLoading(true);
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

            this.updateUserState(user, true);
          }
          this.setLoading(false);
        }),
        catchError(error => {
          this.setLoading(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout user with session cleanup.
   */
  logout(): Observable<any> {
    this.setLoading(true);
    return this.http.post(`${this.baseUrl}/logout`, {}, this.getHttpOptions())
      .pipe(
        tap(() => {
          this.clearUserSession();
          this.setLoading(false);
        }),
        catchError(error => {
          // Even if logout fails, clear local state
          this.clearUserSession();
          this.setLoading(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get current user data from server.
   */
  getCurrentUserFromServer(): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/current`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData))
      );
  }

  /**
   * Get current user data from local state (synchronous).
   */
  getCurrentUserData(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user ID (synchronous).
   */
  getCurrentUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }

  /**
   * Get current user observable.
   */
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  /**
   * Check if user is logged in (synchronous).
   */
  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  /**
   * Check if current user is admin (synchronous).
   */
  isAdmin(): boolean {
    const user = this.getCurrentUserData();
    return user?.isAdmin || false;
  }

  /**
   * Check if current user has specific role (synchronous).
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUserData();
    return user?.roles?.includes(roleName) || false;
  }

  /**
   * Check if current user has any of the specified roles.
   */
  hasAnyRole(roleNames: string[]): boolean {
    const user = this.getCurrentUserData();
    if (!user?.roles) return false;
    return roleNames.some(role => user.roles.includes(role));
  }

  /**
   * Get all users (admin only).
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<UserData[]>(this.baseUrl, this.getHttpOptions())
      .pipe(
        map(users => users.map(userData => this.convertToUser(userData)))
      );
  }

  /**
   * Get user by ID.
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/${id}`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData))
      );
  }

  /**
   * Update user by ID.
   */
  updateUser(id: number, userData: Partial<UserRegistrationData>): Observable<User> {
    // Validate and sanitize update data
    const sanitizedData = this.sanitizeUpdateData(userData);

    return this.http.put<UserData>(`${this.baseUrl}/${id}`, sanitizedData, this.getHttpOptions())
      .pipe(
        map(updatedUser => this.convertToUser(updatedUser)),
        tap(updatedUser => {
          // If updating current user, update local state
          const currentUser = this.getCurrentUserData();
          if (currentUser && currentUser.id === updatedUser.id) {
            this.updateUserState(updatedUser, true);
          }
        })
      );
  }

  /**
   * Delete user by ID (admin only).
   */
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getHttpOptions());
  }

  /**
   * Add role to user (admin only).
   */
  addRoleToUser(userId: number, roleName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${userId}/roles/${roleName}`, {}, this.getHttpOptions());
  }

  /**
   * Remove role from user (admin only).
   */
  removeRoleFromUser(userId: number, roleName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${userId}/roles/${roleName}`, this.getHttpOptions());
  }

  /**
   * Get current user profile.
   */
  getCurrentUserProfile(): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/profile`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData))
      );
  }

  /**
   * Update current user profile.
   */
  updateCurrentUserProfile(userData: Partial<UserRegistrationData>): Observable<User> {
    const sanitizedData = this.sanitizeUpdateData(userData);

    return this.http.put<UserData>(`${this.baseUrl}/profile`, sanitizedData, this.getHttpOptions())
      .pipe(
        map(updatedUser => this.convertToUser(updatedUser)),
        tap(updatedUser => {
          this.updateUserState(updatedUser, true);
        })
      );
  }

  /**
   * Check if user is admin by ID.
   */
  isUserAdmin(id: number): Observable<{ isAdmin: boolean }> {
    return this.http.get<{ isAdmin: boolean }>(`${this.baseUrl}/${id}/is-admin`, this.getHttpOptions());
  }

  /**
   * Clear user session and local state.
   */
  clearUserSession(): void {
    this.updateUserState(null, false);

    // Clear any stored session data
    try {
      sessionStorage.removeItem('auth_session');
      localStorage.removeItem('user');
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  /**
   * Refresh current user data from server.
   */
  refreshCurrentUser(): Observable<User> {
    return this.getCurrentUserFromServer().pipe(
      tap(user => {
        this.updateUserState(user, true);
      })
    );
  }

  /**
   * Validate registration data on client side.
   */
  private validateRegistrationData(userData: UserRegistrationData): { [key: string]: string } {
    const errors: { [key: string]: string } = {};

    // Username validation
    if (!userData.username) {
      errors['username'] = 'Username is required';
    } else if (!this.validationService.isValidUsername(userData.username)) {
      errors['username'] = 'Username must be 3-50 characters long and contain only letters, numbers, hyphens, and underscores';
    }

    // Firstname validation
    if (!userData.firstname) {
      errors['firstname'] = 'First name is required';
    } else if (!this.validationService.isValidName(userData.firstname)) {
      errors['firstname'] = 'First name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes';
    }

    // Lastname validation
    if (!userData.lastname) {
      errors['lastname'] = 'Last name is required';
    } else if (!this.validationService.isValidName(userData.lastname)) {
      errors['lastname'] = 'Last name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes';
    }

    // Email validation
    if (!userData.email) {
      errors['email'] = 'Email is required';
    } else if (!this.validationService.isValidEmail(userData.email)) {
      errors['email'] = 'Please enter a valid email address';
    }

    // Password validation
    if (!userData.password) {
      errors['password'] = 'Password is required';
    } else if (userData.password.length < 8) {
      errors['password'] = 'Password must be at least 8 characters long';
    }

    return errors;
  }

  /**
   * Sanitize registration data.
   */
  private sanitizeRegistrationData(userData: UserRegistrationData): UserRegistrationData {
    return {
      username: this.validationService.sanitizeInput(userData.username).trim(),
      firstname: this.validationService.sanitizeInput(userData.firstname).trim(),
      lastname: this.validationService.sanitizeInput(userData.lastname).trim(),
      email: this.validationService.sanitizeInput(userData.email).trim().toLowerCase(),
      password: userData.password // Don't sanitize passwords
    };
  }

  /**
   * Sanitize update data.
   */
  private sanitizeUpdateData(userData: Partial<UserRegistrationData>): Partial<UserRegistrationData> {
    const sanitized: Partial<UserRegistrationData> = {};

    if (userData.username) {
      sanitized.username = this.validationService.sanitizeInput(userData.username).trim();
    }
    if (userData.firstname) {
      sanitized.firstname = this.validationService.sanitizeInput(userData.firstname).trim();
    }
    if (userData.lastname) {
      sanitized.lastname = this.validationService.sanitizeInput(userData.lastname).trim();
    }
    if (userData.email) {
      sanitized.email = this.validationService.sanitizeInput(userData.email).trim().toLowerCase();
    }
    if (userData.password) {
      sanitized.password = userData.password; // Don't sanitize passwords
    }

    return sanitized;
  }

  /**
   * Get user display name.
   */
  getUserDisplayName(user?: User): string {
    const targetUser = user || this.getCurrentUserData();
    if (!targetUser) return '';

    if (targetUser.firstname && targetUser.lastname) {
      return `${targetUser.firstname} ${targetUser.lastname}`;
    } else if (targetUser.firstname) {
      return targetUser.firstname;
    } else {
      return targetUser.username;
    }
  }

  /**
   * Get user initials for avatar.
   */
  getUserInitials(user?: User): string {
    const targetUser = user || this.getCurrentUserData();
    if (!targetUser) return '';

    if (targetUser.firstname && targetUser.lastname) {
      return `${targetUser.firstname.charAt(0)}${targetUser.lastname.charAt(0)}`.toUpperCase();
    } else if (targetUser.firstname) {
      return targetUser.firstname.substring(0, 2).toUpperCase();
    } else {
      return targetUser.username.substring(0, 2).toUpperCase();
    }
  }

  // Legacy method for backward compatibility
  createUser(user: any): Observable<any> {
    console.warn('createUser is deprecated, use registerUser instead');
    return this.registerUser(user);
  }
}
