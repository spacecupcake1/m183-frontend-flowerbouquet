import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/app/data/user';
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
  private loginSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.isAdmin || false;
    });

    this.loginSubscription = this.userService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.userSubscription?.unsubscribe();
    this.loginSubscription?.unsubscribe();
  }

  /**
   * Handles user logout with proper session cleanup.
   */
  onLogout(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    this.userService.logout().subscribe({
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
    return this.currentUser?.roles?.includes(roleName) || false;
  }

  /**
   * Gets display name for the current user.
   */
  getUserDisplayName(): string {
    if (!this.currentUser) return '';

    const firstname = this.currentUser.firstname || '';
    const lastname = this.currentUser.lastname || '';
    const username = this.currentUser.username || '';

    if (firstname && lastname) {
      return `${firstname} ${lastname}`;
    } else if (firstname) {
      return firstname;
    } else {
      return username;
    }
  }

  /**
   * Gets user initials for avatar display.
   */
  getUserInitials(): string {
    if (!this.currentUser) return '';

    const firstname = this.currentUser.firstname || '';
    const lastname = this.currentUser.lastname || '';
    const username = this.currentUser.username || '';

    if (firstname && lastname) {
      return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
    } else if (firstname) {
      return firstname.substring(0, 2).toUpperCase();
    } else {
      return username.substring(0, 2).toUpperCase();
    }
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
}
