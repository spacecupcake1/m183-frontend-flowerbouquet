import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../data/user';
import { AuthService } from '../../service/auth.service';
import { Flower, FlowerService } from '../../service/flower.service';
import { PermissionService } from '../../service/permission.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  flowers: Flower[] = [];
  isLoading = false;
  error: string | null = null;

  private subscription = new Subscription();

  constructor(
    private router: Router,
    public authService: AuthService,
    public permissionService: PermissionService,
    private flowerService: FlowerService
  ) {}

  ngOnInit(): void {
    console.log('MainComponent ngOnInit');

    // Subscribe to authentication state
    this.subscription.add(
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
        console.log('Current user:', user);
        if (user) {
          this.loadFlowers();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadFlowers(): void {
    if (!this.permissionService.canView('flower-catalog')) {
      console.log('User cannot view flower catalog');
      return;
    }

    console.log('Loading flowers...');
    this.isLoading = true;
    this.error = null;

    this.subscription.add(
      this.flowerService.getAllFlowers().subscribe({
        next: (flowers) => {
          console.log('Flowers loaded:', flowers);
          this.flowers = flowers;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading flowers:', error);
          this.error = 'Failed to load flowers';
          this.isLoading = false;
        }
      })
    );
  }

  // ========== FLOWER NAVIGATION METHODS (FIXED) ==========

  /**
   * Navigate to flower details page - FIXED: Use flower.id not entire object
   */
  openFlowerDetail(flower: Flower): void {
    console.log('Opening flower detail for:', flower);

    if (!flower) {
      console.error('Flower is null or undefined');
      return;
    }

    if (!flower.id) {
      console.error('Flower ID is missing:', flower);
      alert('Unable to view flower details - ID missing');
      return;
    }

    // FIXED: Use flower.id (number) instead of flower (object)
    console.log('Navigating to flower ID:', flower.id);
    this.router.navigate(['/flowers', flower.id]);
  }

  /**
   * Navigate to flower list/browse page
   */
  viewFlowers(): void {
    console.log('Viewing flowers');
    if (this.permissionService.canView('flower-catalog')) {
      this.router.navigate(['/flowers']);
    } else {
      alert('You need to be logged in to view flowers.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Create new flower (admin only)
   */
  createFlower(): void {
    console.log('Creating flower');
    if (this.permissionService.canPerform('create-flower')) {
      this.router.navigate(['/admin/flowers'], { queryParams: { create: true } });
    } else {
      alert('Admin privileges required.');
    }
  }

  /**
   * Manage flowers (admin only)
   */
  manageFlowers(): void {
    console.log('Managing flowers');
    if (this.permissionService.canPerform('edit-flower')) {
      this.router.navigate(['/admin/flowers']);
    } else {
      alert('Admin privileges required.');
    }
  }

  /**
   * Navigate to admin panel
   */
  openAdminPanel(): void {
    console.log('Opening admin panel');
    if (this.permissionService.canView('admin-panel')) {
      this.router.navigate(['/admin']);
    } else {
      alert('Admin privileges required.');
    }
  }

  // ========== AUTHENTICATION METHODS ==========

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserDisplayName(): string {
    const user = this.authService.getCurrentUserValue();
    if (user) {
      return `${user.firstname} ${user.lastname}`.trim();
    }
    return 'Guest';
  }

  logout(): void {
    console.log('Logging out');
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force logout even if server request fails
        this.authService.clearAuthState();
        this.router.navigate(['/login']);
      }
    });
  }

  // ========== UTILITY METHODS ==========

  getFlowerImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/default-flower.jpg';

    if (imageUrl.startsWith('images/')) {
      return `assets/${imageUrl}`;
    }

    return imageUrl;
  }

  onFlowerImageError(event: any): void {
    console.warn('Image failed to load:', event.target.src);
    event.target.src = 'assets/images/default-flower.jpg';
  }

  // ========== FIXED: HELPER METHODS FOR TEMPLATE ==========

  /**
   * Get the type of flower.id for debugging
   */
  getFlowerIdType(flower: Flower): string {
    return typeof flower?.id;
  }

  /**
   * Get a safe flower ID for display
   */
  getFlowerIdDisplay(flower: Flower): string {
    return flower?.id ? flower.id.toString() : 'N/A';
  }

  // ========== DEBUG METHODS ==========

  debugFlower(flower: Flower): void {
    console.log('Flower debug:', {
      flower: flower,
      id: flower?.id,
      name: flower?.name,
      type: typeof flower?.id
    });
  }

  debugPermissions(): void {
    console.log('Permissions debug:', {
      isAuthenticated: this.isAuthenticated(),
      canViewCatalog: this.permissionService.canView('flower-catalog'),
      canCreateFlower: this.permissionService.canPerform('create-flower'),
      canEditFlower: this.permissionService.canPerform('edit-flower'),
      canViewAdmin: this.permissionService.canView('admin-panel'),
      currentUser: this.currentUser
    });
  }
}
