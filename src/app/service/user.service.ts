import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User } from '../data/user';
import { AuthService } from './auth.service';
import { ValidationService } from './validation.service';

interface UserRegistrationDTO {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private validationService: ValidationService
  ) {}

  /**
   * Register new user
   */
  register(userData: UserRegistrationDTO): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  /**
   * Alternative method name for registration (for compatibility)
   */
  registerUser(userData: UserRegistrationDTO): Observable<any> {
    return this.register(userData);
  }

  /**
   * Get current user data (synchronous)
   */
  getCurrentUserData(): User | null {
    return this.authService.getCurrentUserValue();
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    const user = this.getCurrentUserData();
    return user?.id || user?.userId || null;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    return this.authService.logout();
  }

  /**
   * Update user profile
   */
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/profile`, userData, {
      withCredentials: true
    }).pipe(
      tap(updatedUser => {
        // Update user in auth service state
        this.authService.updateUserInState(updatedUser);
      })
    );
  }

  /**
   * Alternative method name for profile update (for compatibility)
   */
  updateCurrentUserProfile(userData: Partial<User>): Observable<User> {
    return this.updateProfile(userData);
  }

  /**
   * Change user password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/change-password`, {
      currentPassword,
      newPassword
    }, {
      withCredentials: true
    });
  }

  /**
   * Admin: Get all users
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/admin/all`, {
      withCredentials: true
    });
  }

  /**
   * Admin: Update user
   */
  updateUser(userId: number, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/admin/${userId}`, userData, {
      withCredentials: true
    });
  }

  /**
   * Admin: Delete user
   */
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/admin/${userId}`, {
      withCredentials: true
    });
  }

  /**
   * Admin: Add role to user
   */
  addRoleToUser(userId: number, role: string): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${userId}/roles`, { role }, {
      withCredentials: true
    });
  }

  /**
   * Admin: Remove role from user
   */
  removeRoleFromUser(userId: number, role: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/admin/${userId}/roles/${role}`, {
      withCredentials: true
    });
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  /**
   * Login user (wrapper for AuthService login)
   */
  login(username: string, password: string): Observable<any> {
    return this.authService.login(username, password);
  }

  /**
   * Get user display name (with no parameters - uses current user)
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  /**
   * Get user initials (with optional user parameter)
   */
  getUserInitials(user?: User): string {
    if (user) {
      if (user.firstname && user.lastname) {
        return `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
      }
      return user.username?.charAt(0).toUpperCase() || '?';
    }
    return this.authService.getUserInitials();
  }

  /**
   * Validate user registration data
   */
  validateRegistrationData(userData: UserRegistrationDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate username
    if (!userData.username) {
      errors.push('Username is required');
    } else if (!this.validationService.validateUsername(userData.username)) {
      errors.push('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens');
    }

    // Validate firstname
    if (!userData.firstname) {
      errors.push('First name is required');
    } else if (!this.validationService.validateName(userData.firstname)) {
      errors.push('First name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes');
    }

    // Validate lastname
    if (!userData.lastname) {
      errors.push('Last name is required');
    } else if (!this.validationService.validateName(userData.lastname)) {
      errors.push('Last name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes');
    }

    // Validate email
    if (!userData.email) {
      errors.push('Email is required');
    } else if (!this.validationService.validateEmail(userData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate password
    const passwordValidation = this.validationService.validatePassword(userData.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Clean and sanitize user registration data
   */
  sanitizeRegistrationData(userData: UserRegistrationDTO): UserRegistrationDTO {
    return {
      username: this.validationService.sanitizeInput(userData.username),
      firstname: this.validationService.sanitizeInput(userData.firstname),
      lastname: this.validationService.sanitizeInput(userData.lastname),
      email: this.validationService.sanitizeInput(userData.email),
      password: userData.password // Don't sanitize password - just validate
    };
  }

  /**
   * Validate login data
   */
  validateLoginData(username: string, password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!username) {
      errors.push('Username is required');
    }

    if (!password) {
      errors.push('Password is required');
    }

    // Basic validation for login (less strict than registration)
    if (username && username.length < 3) {
      errors.push('Username is too short');
    }

    if (password && password.length < 8) {
      errors.push('Password is too short');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Check if current user can perform admin actions
   */
  canPerformAdminActions(): boolean {
    return this.isAdmin() && this.isLoggedIn();
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): Observable<any> {
    return this.http.get(`${this.API_URL}/preferences`, {
      withCredentials: true
    });
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: any): Observable<any> {
    return this.http.put(`${this.API_URL}/preferences`, preferences, {
      withCredentials: true
    });
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/password-reset-request`, { email });
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/password-reset`, {
      token,
      newPassword
    });
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.API_URL}/verify-email`, { token });
  }

  /**
   * Resend email verification
   */
  resendEmailVerification(): Observable<any> {
    return this.http.post(`${this.API_URL}/resend-verification`, {}, {
      withCredentials: true
    });
  }

  /**
   * Get user activity log (admin only)
   */
  getUserActivityLog(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/admin/${userId}/activity`, {
      withCredentials: true
    });
  }

  /**
   * Admin: Lock/unlock user account
   */
  toggleUserLock(userId: number, locked: boolean): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${userId}/lock`, { locked }, {
      withCredentials: true
    });
  }

  /**
   * Admin: Enable/disable user account
   */
  toggleUserEnabled(userId: number, enabled: boolean): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${userId}/enable`, { enabled }, {
      withCredentials: true
    });
  }

  /**
   * Admin: Reset user password
   */
  adminResetPassword(userId: number, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${userId}/reset-password`, {
      newPassword
    }, {
      withCredentials: true
    });
  }

  /**
   * Get user statistics (admin only)
   */
  getUserStatistics(): Observable<any> {
    return this.http.get(`${this.API_URL}/admin/statistics`, {
      withCredentials: true
    });
  }

  /**
   * Get user role display
   */
  getUserRoleDisplay(user?: User): string {
    const targetUser = user || this.getCurrentUserData();
    if (!targetUser) return '';

    if (targetUser.isAdmin) {
      return 'Administrator';
    }

    if (targetUser.roles && targetUser.roles.length > 0) {
      return targetUser.roles.map(role =>
        role.replace('ROLE_', '').toLowerCase()
      ).join(', ');
    }

    return 'User';
  }

  /**
   * Check if user is verified
   */
  isUserVerified(user?: User): boolean {
    const targetUser = user || this.getCurrentUserData();
    return targetUser?.emailVerified || false;
  }

  /**
   * Get available roles (admin only)
   */
  getAvailableRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/admin/roles`, {
      withCredentials: true
    });
  }

  /**
   * Admin: Get user by ID
   */
  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/admin/${userId}`, {
      withCredentials: true
    });
  }

  /**
   * Admin: Search users
   */
  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/admin/search`, {
      params: { query },
      withCredentials: true
    });
  }
}
