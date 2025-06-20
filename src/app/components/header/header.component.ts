import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/app/data/user';
import { AuthService } from 'src/app/service/auth.service';
import { UserService } from 'src/app/service/user.service';

/**
 * Header component with role-based navigation and authentication state management.
 * Implements secure UI patterns where elements are hidden based on user permissions.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  isLoggedIn = false;
  isAdmin = false;
  isLoading = false;

  private userSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService, // Use AuthService as primary authentication service
    private userService: UserService, // Keep for utility methods if needed
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes from AuthService
    this.userSubscription = this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser = user;
      this.isAdmin = user?.isAdmin || false;
    });

    this.authSubscription = this.authService.isAuthenticated$.subscribe((loggedIn: boolean) => {
      this.isLoggedIn = loggedIn;
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.userSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  /**
   * Handles user logout with proper session cleanup.
   */
  onLogout(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    this.authService.logout().subscribe({
      next: () => {
        // Clear any sensitive data from local state
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isAdmin = false;

        // Navigate to login page
        this.router.navigate(['/login'], {
          queryParams: { message: 'You have been logged out successfully' }
        });
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout fails, clear local state and redirect
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.router.navigate(['/login']);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Navigation methods with role-based access control.
   */

  navigateToProfile(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/profile']);
    }
  }

  navigateToAdminPanel(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin']);
    }
  }

  navigateToUserManagement(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin/users']);
    }
  }

  navigateToSettings(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/settings']);
    }
  }

  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Permission checking methods for template usage.
   */

  canViewAdminPanel(): boolean {
    return this.isLoggedIn && this.isAdmin;
  }

  canViewUserManagement(): boolean {
    return this.isLoggedIn && this.isAdmin;
  }

  canViewProfile(): boolean {
    return this.isLoggedIn;
  }

  canViewSettings(): boolean {
    return this.isLoggedIn;
  }

  hasRole(roleName: string): boolean {
    return this.authService.hasRole(roleName);
  }

  /**
   * Gets display name for the current user.
   */
  getUserDisplayName(): string {
    return this.userService.getUserDisplayName(this.currentUser);
  }

  /**
   * Gets user initials for avatar display.
   */
  getUserInitials(): string {
    return this.userService.getUserInitials(this.currentUser);
  }

  /**
   * Gets CSS classes for user avatar based on role.
   */
  getAvatarClasses(): string {
    const baseClasses = 'user-avatar';

    if (this.isAdmin) {
      return `${baseClasses} admin-avatar`;
    } else if (this.hasRole('ROLE_MODERATOR')) {
      return `${baseClasses} moderator-avatar`;
    } else {
      return `${baseClasses} user-avatar`;
    }
  }

  /**
   * Handle click outside dropdown to close it.
   */
  onDropdownBlur(): void {
    // Add small delay to allow click events to process
    setTimeout(() => {
      const dropdown = document.querySelector('.user-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }, 150);
  }

  /**
   * Toggle user dropdown menu.
   */
  toggleUserDropdown(): void {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  /**
   * Security helper: Sanitize display values to prevent XSS in templates.
   */
  sanitizeForDisplay(value: string): string {
    if (!value) return '';

    // Basic HTML escape for display
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Get current user synchronously for template usage
   */
  getCurrentUser(): User | null {
    return this.authService.getCurrentUserValue();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
