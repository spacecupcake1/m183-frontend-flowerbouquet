import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../data/user';
import { AuthService } from '../../service/auth.service';
import { Flower, FlowerService } from '../../service/flower.service';
import { RoleService } from '../../service/role.guard';
import { UserService } from '../../service/user.service';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  badge?: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
}

/**
 * Integrated main component with flower functionality and security features.
 * Combines flower bouquet business logic with secure authentication and authorization.
 */
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {

  // Flower-related properties
  flowers: Flower[] = [];
  searchTerm: string = '';

  // Security and user properties
  isAuthenticated = false;
  currentUser: User | null = null;
  isAdmin = false;
  isLoading = true;

  // Dashboard data for authenticated users
  quickStats: QuickStat[] = [];
  showQuickActions = false;
  quickActions: any[] = [];

  // Dashboard cards configuration
  dashboardCards: DashboardCard[] = [
    {
      title: 'My Profile',
      description: 'Manage your account settings and preferences',
      icon: 'account_circle',
      route: '/profile',
      color: 'blue',
      requiresAuth: true
    },
    {
      title: 'Browse Flowers',
      description: 'Explore our beautiful flower collection',
      icon: 'local_florist',
      route: '/main',
      color: 'green'
    },
    {
      title: 'Custom Arrangements',
      description: 'Create your personalized flower arrangements',
      icon: 'palette',
      route: '/custom',
      color: 'purple',
      requiresAuth: true
    },
    {
      title: 'My Orders',
      description: 'View your order history and track deliveries',
      icon: 'shopping_bag',
      route: '/checkout',
      color: 'orange',
      requiresAuth: true
    },
    {
      title: 'Admin Panel',
      description: 'Manage users, roles, and system settings',
      icon: 'admin_panel_settings',
      route: '/admin',
      color: 'red',
      requiresAuth: true,
      requiredRoles: ['ROLE_ADMIN'],
      badge: 'Admin'
    },
    {
      title: 'Flower Management',
      description: 'Manage flower inventory and catalog',
      icon: 'inventory',
      route: '/admin/flowers',
      color: 'indigo',
      requiresAuth: true,
      requiredRoles: ['ROLE_ADMIN', 'ROLE_MODERATOR'],
      badge: 'Management'
    }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private flowerService: FlowerService,
    private authService: AuthService,
    private userService: UserService,
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupAuthSubscription();
    this.loadFlowers();
    this.setupQuickActions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Setup authentication state subscription.
   */
  private setupAuthSubscription(): void {
    const authSub = this.authService.authState$.subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentUser = state.user;
      this.isAdmin = this.authService.isAdmin();
      this.isLoading = state.isLoading;

      if (this.isAuthenticated) {
        this.loadUserSpecificData();
      }
    });
    this.subscriptions.push(authSub);

    // Also subscribe to UserService for compatibility
    const userSub = this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
    this.subscriptions.push(userSub);
  }

  /**
   * Load user-specific data when authenticated.
   */
  private loadUserSpecificData(): void {
    this.loadQuickStats();
  }

  /**
   * Load quick statistics for authenticated users.
   */
  private loadQuickStats(): void {
    // Mock stats - in real app, these would come from API calls
    this.quickStats = [
      {
        label: 'Favorite Flowers',
        value: this.flowers.filter(f => f.availablity === 'Available').length,
        icon: 'favorite',
        color: 'pink',
        change: '+3',
        changeDirection: 'up'
      },
      {
        label: 'Total Orders',
        value: 12,
        icon: 'shopping_cart',
        color: 'blue',
        change: '+2',
        changeDirection: 'up'
      },
      {
        label: 'Spent This Month',
        value: '€245',
        icon: 'payment',
        color: 'green',
        change: '+8%',
        changeDirection: 'up'
      }
    ];

    // Add admin-specific stats
    if (this.isAdmin) {
      this.quickStats.push({
        label: 'Total Flowers',
        value: this.flowers.length,
        icon: 'inventory',
        color: 'orange',
        change: '+5',
        changeDirection: 'up'
      });
    }
  }

  /**
   * Setup quick actions menu.
   */
  private setupQuickActions(): void {
    this.quickActions = [
      {
        label: 'Quick Order',
        icon: 'add_shopping_cart',
        action: 'quick-order'
      },
      {
        label: 'Custom Bouquet',
        icon: 'palette',
        action: 'custom-bouquet'
      },
      {
        label: 'My Profile',
        icon: 'person',
        action: 'profile'
      }
    ];
  }

  // ========== FLOWER FUNCTIONALITY ==========

  /**
   * Load flowers from service with fallback to mock data.
   */
  loadFlowers(): void {
    this.flowerService.getFlowers()
      .subscribe({
        next: (data) => {
          this.flowers = data;
          this.loadQuickStats(); // Update stats after loading flowers
        },
        error: (error) => {
          console.error('Error loading flowers:', error);
          // Fallback to mock data if server is not available
          this.flowers = this.getMockFlowers();
          this.loadQuickStats();
        }
      });
  }

  /**
   * Search flowers based on search term.
   */
  onSearch(): void {
    if (this.searchTerm.length > 0) {
      this.flowerService.searchFlowers(this.searchTerm)
        .subscribe({
          next: (data) => this.flowers = data,
          error: (error) => {
            console.error('Error searching flowers:', error);
            this.flowers = this.getMockFlowers().filter(f =>
              f.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
          }
        });
    } else {
      this.loadFlowers();
    }
  }

  /**
   * Filter flowers by availability.
   */
  onFilter(): void {
    this.flowerService.filterFlowers('Available')
      .subscribe({
        next: (data) => this.flowers = data,
        error: (error) => {
          console.error('Error filtering flowers:', error);
          this.flowers = this.getMockFlowers().filter(f => f.availablity === 'Available');
        }
      });
  }

  /**
   * Navigate to flower details page.
   */
  viewFlowerDetails(id: number): void {
    this.router.navigate(['/detail', id]);
  }

  // ========== USER MANAGEMENT (Enhanced with Security) ==========

  /**
   * Check if user is logged in.
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated || this.userService.isLoggedIn();
  }

  /**
   * Check if current user is admin.
   */
  isAdminUser(): boolean {
    return this.isAdmin || this.userService.isAdmin();
  }

  /**
   * Get current user data.
   */
  getCurrentUser(): User | null {
    return this.currentUser || this.userService.getCurrentUserData();
  }

  /**
   * Get current user ID.
   */
  getCurrentUserId(): number | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  /**
   * Navigate to login page.
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to register page.
   */
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Secure logout with proper cleanup.
   */
  logout(): void {
    // Use AuthService if available, otherwise fallback to UserService
    const logoutService = this.authService || this.userService;

    logoutService.logout().subscribe({
      next: () => {
        console.log('Logout successful');
        this.clearLocalState();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still clear local state even if server request fails
        this.clearLocalState();
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Clear local component state.
   */
  private clearLocalState(): void {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.quickStats = [];
  }

  // ========== ADMIN FUNCTIONS (Enhanced with Security) ==========

  /**
   * Navigate to admin panel with security check.
   */
  goToAdminPanel(): void {
    if (this.isAdminUser()) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/unauthorized']);
    }
  }

  /**
   * Navigate to flower management admin panel.
   */
  goToFlowerAdmin(): void {
    if (this.isAdminUser() || this.roleService.hasRole('ROLE_MODERATOR')) {
      this.router.navigate(['/admin/flowers']);
    } else {
      this.router.navigate(['/unauthorized']);
    }
  }

  // ========== DASHBOARD FUNCTIONALITY ==========

  /**
   * Get cards visible to current user based on authentication and roles.
   */
  getVisibleCards(): DashboardCard[] {
    return this.dashboardCards.filter(card => {
      // Check authentication requirement
      if (card.requiresAuth && !this.isLoggedIn()) {
        return false;
      }

      // Check role requirements
      if (card.requiredRoles && card.requiredRoles.length > 0) {
        return this.roleService.hasAnyRole(card.requiredRoles);
      }

      return true;
    });
  }

  /**
   * Get welcome message based on user role.
   */
  getWelcomeMessage(): string {
    if (!this.currentUser) return 'Welcome to FlowerBouquet';

    if (this.isAdminUser()) {
      return 'Manage your flower business and oversee all operations from your admin dashboard.';
    } else if (this.roleService.hasRole('ROLE_MODERATOR')) {
      return 'Help maintain our beautiful flower catalog and assist customers.';
    } else {
      return 'Create beautiful flower arrangements and explore our collection.';
    }
  }

  /**
   * Navigation helper.
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Toggle quick actions menu.
   */
  toggleQuickActions(): void {
    this.showQuickActions = !this.showQuickActions;
  }

  /**
   * Execute quick action.
   */
  executeQuickAction(action: any): void {
    this.showQuickActions = false;

    switch (action.action) {
      case 'quick-order':
        this.router.navigate(['/checkout']);
        break;
      case 'custom-bouquet':
        this.router.navigate(['/custom']);
        break;
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      default:
        console.log('Unknown action:', action.action);
    }
  }

  // ========== IMAGE HANDLING ==========

  /**
   * Constructs the full image URL for display.
   */
  getImageUrl(imageUrl: string): string {
    console.log('Original imageUrl:', imageUrl);

    if (!imageUrl) {
      return 'assets/images/placeholder.jpg';
    }

    // If imageUrl already starts with 'assets/', return as is
    if (imageUrl.startsWith('assets/')) {
      console.log('Already has assets prefix:', imageUrl);
      return imageUrl;
    }

    // If imageUrl starts with 'http' or 'https', it's an external URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('External URL:', imageUrl);
      return imageUrl;
    }

    // If imageUrl starts with '/', remove it and prepend 'assets/'
    if (imageUrl.startsWith('/')) {
      const result = 'assets' + imageUrl;
      console.log('Removed leading slash:', result);
      return result;
    }

    // If imageUrl starts with 'images/', prepend 'assets/'
    if (imageUrl.startsWith('images/')) {
      const result = 'assets/' + imageUrl;
      console.log('Added assets prefix:', result);
      return result;
    }

    // Otherwise, assume it's just a filename and prepend 'assets/images/'
    const result = 'assets/images/' + imageUrl;
    console.log('Added full path:', result);
    return result;
  }

  /**
   * Handle image loading errors.
   */
  onImageError(event: any): void {
    console.warn('Failed to load image:', event.target.src);
    // Set a fallback image
    event.target.src = 'assets/images/placeholder.jpg';
  }

  // ========== PERMISSION CHECKS ==========

  /**
   * Check if user can perform specific action.
   */
  canPerformAction(action: string): boolean {
    return this.roleService.canPerformAction(action);
  }

  /**
   * Check if user has specific role.
   */
  hasRole(roleName: string): boolean {
    return this.roleService.hasRole(roleName);
  }

  /**
   * Get user display name.
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
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
   * Get user initials for avatar.
   */
  getUserInitials(): string {
    const user = this.getCurrentUser();
    if (!user) return '';

    if (user.firstname && user.lastname) {
      return `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
    } else if (user.firstname) {
      return user.firstname.substring(0, 2).toUpperCase();
    } else {
      return user.username.substring(0, 2).toUpperCase();
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Mock flowers data for fallback.
   */
  private getMockFlowers(): Flower[] {
    return [
      {
        id: 1,
        name: 'Rose',
        imageUrl: 'images/Rose.jpg',
        info: 'A beautiful red rose symbolizing love and passion.',
        meaning: 'Love and passion',
        availablity: 'Available',
        color: 'Red',
        price: 25
      },
      {
        id: 2,
        name: 'Tulip',
        imageUrl: 'images/Tulip.jpg',
        info: 'A vibrant tulip representing perfect love.',
        meaning: 'Perfect love',
        availablity: 'Unavailable',
        color: 'Yellow',
        price: 15
      },
      {
        id: 3,
        name: 'Sunflower',
        imageUrl: 'images/Sunflower.jpg',
        info: 'A bright sunflower symbolizing loyalty and devotion.',
        meaning: 'Loyalty and devotion',
        availablity: 'Available',
        color: 'Yellow',
        price: 20
      },
      {
        id: 4,
        name: 'Lily',
        imageUrl: 'images/Lily.jpg',
        info: 'An elegant lily representing purity and rebirth.',
        meaning: 'Purity and rebirth',
        availablity: 'Available',
        color: 'White',
        price: 30
      },
      {
        id: 5,
        name: 'Orchid',
        imageUrl: 'images/Orchid.jpg',
        info: 'An exotic orchid symbolizing luxury and strength.',
        meaning: 'Luxury and strength',
        availablity: 'Available',
        color: 'Purple',
        price: 45
      }
    ];
  }

  /**
   * Get change direction icon for stats.
   */
  getChangeIcon(direction?: string): string {
    switch (direction) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }
}
