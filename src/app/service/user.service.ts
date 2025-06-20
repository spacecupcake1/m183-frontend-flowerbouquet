import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from '../data/user';
import { AuthService } from './auth.service';
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

export interface UserData {
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin?: boolean;
}

export interface ProfileUpdateData {
  firstname?: string;
  lastname?: string;
  email?: string;
}

export interface ApiError {
  error: string;
  message: string;
  fieldErrors?: { [key: string]: string };
}

/**
 * Enhanced UserService with comprehensive security features and error handling.
 * Works in conjunction with AuthService for authentication management.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = 'http://localhost:8080/api/users';
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private validationService: ValidationService,
    private authService: AuthService
  ) {}

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
      id: userData.userId, // Map userId to id for consistency
      username: userData.username,
      firstname: userData.firstname,
      lastname: userData.lastname,
      email: userData.email,
      roles: userData.roles || [],
      isAdmin: userData.isAdmin || false
    };
  }

  /**
   * Set loading state.
   */
  private setLoading(loading: boolean): void {
    this.isLoadingSubject.next(loading);
  }

  // ========== AUTHENTICATION DELEGATION METHODS ==========
  // These delegate to AuthService for consistency

  /**
   * Get current user ID - Fixed to use .id instead of .userId
   */
  getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUserValue();
    return user ? user.id : null; // Fixed: use .id not .userId
  }

  /**
   * Get current user data from AuthService
   */
  getCurrentUserData(): User | null {
    return this.authService.getCurrentUserValue();
  }

  /**
   * Get current user observable from AuthService
   */
  getCurrentUser(): Observable<User | null> {
    return this.authService.currentUser;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Check if current user has specific role
   */
  hasRole(roleName: string): boolean {
    return this.authService.hasRole(roleName);
  }

  /**
   * Check if current user has any of the specified roles
   */
  hasAnyRole(roleNames: string[]): boolean {
    return this.authService.hasAnyRole(roleNames);
  }

  /**
   * Clear user session (delegate to AuthService)
   */
  clearUserSession(): void {
    this.authService.clearAuthState();
  }

  // ========== USER DISPLAY UTILITY METHODS ==========

  /**
   * Get user display name - Updated signature to handle null properly
   */
  getUserDisplayName(user?: User | null): string {
    // Convert null to undefined and handle both cases
    const targetUser = user ?? this.authService.getCurrentUserValue() ?? undefined;
    if (!targetUser) return '';
    return `${targetUser.firstname} ${targetUser.lastname}`.trim();
  }

  /**
   * Get user initials - Updated signature to handle null properly
   */
  getUserInitials(user?: User | null): string {
    // Convert null to undefined and handle both cases
    const targetUser = user ?? this.authService.getCurrentUserValue() ?? undefined;
    if (!targetUser) return '';
    const first = targetUser.firstname ? targetUser.firstname.charAt(0).toUpperCase() : '';
    const last = targetUser.lastname ? targetUser.lastname.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }

  // ========== PROFILE MANAGEMENT ==========

  /**
   * Update current user profile
   */
  updateCurrentUserProfile(updateData: ProfileUpdateData): Observable<User> {
    // Sanitize input data
    const sanitizedData = this.sanitizeUpdateData(updateData);

    return this.http.put<any>(`${this.baseUrl}/profile`, sanitizedData, this.getHttpOptions())
      .pipe(
        map(response => {
          // Convert response to User interface
          const user: User = {
            id: response.userId || response.id,
            username: response.username,
            firstname: response.firstname,
            lastname: response.lastname,
            email: response.email,
            roles: response.roles || [],
            isAdmin: response.isAdmin || false,
            lastLogin: response.lastLogin
          };

          // Update AuthService with new user data
          this.authService['setAuthState'](user); // Access private method if available

          return user;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get current user profile from server
   */
  getCurrentUserProfile(): Observable<User> {
    return this.http.get<UserData>(`${this.baseUrl}/profile`, this.getHttpOptions())
      .pipe(
        map(userData => this.convertToUser(userData)),
        catchError(this.handleError)
      );
  }

  // ========== ADMIN USER MANAGEMENT ==========

  /**
   * Get all users (admin only) - FIXED ENDPOINT
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}`, this.getHttpOptions()) // Changed from /admin/users to just /api/users
      .pipe(
        map(users => users.map(user => ({
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          roles: user.roles || [],
          isAdmin: user.isAdmin || false
        }))),
        catchError(this.handleError)
      );
  }

  /**
   * Get user by ID (admin only) - FIXED ENDPOINT
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`, this.getHttpOptions()) // Changed from /admin/users/${id} to /api/users/${id}
      .pipe(
        map(user => ({
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          roles: user.roles || [],
          isAdmin: user.isAdmin || false
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Update user (admin only) - FIXED ENDPOINT
   */
  updateUser(userId: number, userData: Partial<UserRegistrationData>): Observable<User> {
    const sanitizedData = this.sanitizeUpdateData(userData);

    return this.http.put<User>(`${this.baseUrl}/${userId}`, sanitizedData, this.getHttpOptions()) // Changed from /admin/users/${userId} to /api/users/${userId}
      .pipe(
        map(user => ({
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          roles: user.roles || [],
          isAdmin: user.isAdmin || false
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Delete user (admin only) - FIXED ENDPOINT
   */
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${userId}`, this.getHttpOptions()) // Changed from /admin/users/${userId} to /api/users/${userId}
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Register new user (admin only) - FIXED TO USE REGISTER ENDPOINT
   */
  registerUser(userData: UserRegistrationData): Observable<User> {
    // Validate and sanitize data
    const validationErrors = this.validateRegistrationData(userData);
    if (Object.keys(validationErrors).length > 0) {
      return throwError(() => ({
        error: { fieldErrors: validationErrors }
      }));
    }

    const sanitizedData = this.sanitizeRegistrationData(userData);

    return this.http.post<any>(`${this.baseUrl}/register`, sanitizedData, this.getHttpOptions()) // Use the register endpoint
      .pipe(
        map(response => ({
          id: response.userId || 0,
          username: response.username || '',
          firstname: response.firstname || '',
          lastname: response.lastname || '',
          email: response.email || '',
          roles: response.roles || ['ROLE_USER'],
          isAdmin: response.isAdmin || false
        })),
        catchError(this.handleError)
      );
  }

  /**
   * Add role to user (admin only)
   */
  addRoleToUser(userId: number, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users/${userId}/roles`, { role }, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Remove role from user (admin only)
   */
  removeRoleFromUser(userId: number, role: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/users/${userId}/roles/${role}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Check if user is admin by ID (admin only)
   */
  isUserAdmin(id: number): Observable<{ isAdmin: boolean }> {
    return this.http.get<{ isAdmin: boolean }>(`${this.baseUrl}/admin/users/${id}/is-admin`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // ========== LOGIN/LOGOUT (LEGACY - USE AUTHSERVICE INSTEAD) ==========

  /**
   * Login user - DEPRECATED: Use AuthService.login() instead
   */
  login(username: string, password: string): Observable<any> {
    console.warn('UserService.login() is deprecated. Use AuthService.login() instead.');
    return this.authService.login({ username, password });
  }

  /**
   * Logout user - DEPRECATED: Use AuthService.logout() instead
   */
  logout(): Observable<any> {
    console.warn('UserService.logout() is deprecated. Use AuthService.logout() instead.');
    return this.authService.logout();
  }

  // ========== VALIDATION AND SANITIZATION ==========

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

  // ========== LEGACY COMPATIBILITY ==========

  /**
   * Legacy method for backward compatibility
   */
  createUser(user: any): Observable<any> {
    console.warn('createUser is deprecated, use registerUser instead');
    return this.registerUser(user);
  }

  /**
   * Get current user from server - Legacy method
   */
  getCurrentUserFromServer(): Observable<User> {
    return this.authService.getCurrentUser();
  }

  /**
   * Refresh current user data
   */
  refreshCurrentUser(): Observable<User> {
    return this.authService.refreshUser();
  }

  // ========== ERROR HANDLING ==========

  /**
   * Handle HTTP errors.
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad request';
          break;
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 500:
          errorMessage = 'Internal server error';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('UserService Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
