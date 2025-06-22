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

    const confirmLogout = confirm('Are you sure you want to log out?');
    if (!confirmLogout) return;

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
   * Navigate to main page
   */
  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  /**
   * Navigate to profile page (authenticated users only)
   */
  navigateToProfile(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/profile']);
    } else {
      alert('Please log in to view your profile.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Navigate to settings page (authenticated users only)
   */
  navigateToSettings(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/settings']);
    } else {
      alert('Please log in to access settings.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Navigate to flower management (admin only)
   */
  navigateToFlowerManagement(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin/flowers']);
    } else {
      alert('Admin access required.');
      this.router.navigate(['/unauthorized']);
    }
  }

  /**
   * Navigate to admin panel (admin only)
   */
  navigateToAdminPanel(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin']);
    } else {
      alert('Admin access required.');
      this.router.navigate(['/unauthorized']);
    }
  }

  /**
   * Navigate to user management (admin only)
   */
  navigateToUserManagement(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin/users']);
    } else {
      alert('Admin access required.');
      this.router.navigate(['/unauthorized']);
    }
  }

  /**
   * Navigate to login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to register page
   */
  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Navigate to bouquet/cart page (authenticated users only)
   */
  navigateToBouquet(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/customizing']);
    } else {
      alert('Please log in to view your bouquet.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Navigate to checkout page (authenticated users only)
   */
  navigateToCheckout(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/checkout']);
    } else {
      alert('Please log in to proceed with checkout.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Permission check methods for template usage
   */
  canViewProfile(): boolean {
    return this.isLoggedIn;
  }

  canViewSettings(): boolean {
    return this.isLoggedIn;
  }

  canViewAdminPanel(): boolean {
    return this.isAdmin;
  }

  canViewFlowerManagement(): boolean {
    return this.isAdmin;
  }

  canViewUserManagement(): boolean {
    return this.isAdmin;
  }

  canViewBouquet(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUser?.roles?.includes(role) || false;
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    if (!this.currentUser) return '';

    if (this.currentUser.firstname && this.currentUser.lastname) {
      return `${this.currentUser.firstname} ${this.currentUser.lastname}`;
    }

    return this.currentUser.username || 'User';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    if (!this.currentUser) return '?';

    if (this.currentUser.firstname && this.currentUser.lastname) {
      return `${this.currentUser.firstname.charAt(0)}${this.currentUser.lastname.charAt(0)}`.toUpperCase();
    }

    return this.currentUser.username?.charAt(0).toUpperCase() || '?';
  }

  /**
   * Get user role display
   */
  getUserRoleDisplay(): string {
    if (!this.currentUser) return '';

    if (this.isAdmin) {
      return 'Administrator';
    }

    if (this.currentUser.roles && this.currentUser.roles.length > 0) {
      return this.currentUser.roles.map(role =>
        role.replace('ROLE_', '').toLowerCase()
      ).join(', ');
    }

    return 'User';
  }

  /**
   * Check if user account is verified
   */
  isUserVerified(): boolean {
    return this.currentUser?.emailVerified || false;
  }

  /**
   * Debug method for development
   */
  debugUserInfo(): void {
    console.log('=== Header Component Debug ===');
    console.log('Current User:', this.currentUser);
    console.log('Is Logged In:', this.isLoggedIn);
    console.log('Is Admin:', this.isAdmin);
    console.log('User Display Name:', this.getUserDisplayName());
    console.log('User Roles:', this.currentUser?.roles);
    console.log('===============================');
  }
}
