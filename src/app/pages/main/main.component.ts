import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/app/data/user';
import { Flower, FlowerService } from 'src/app/service/flower.service';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {
  flowers: Flower[] = [];
  searchTerm: string = '';
  currentUser: User | null = null;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private flowerService: FlowerService,
    private userService: UserService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loadFlowers();

    // Subscribe to current user changes
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadFlowers(): void {
    this.flowerService.getFlowers()
      .subscribe({
        next: (data) => this.flowers = data,
        error: (error) => {
          console.error('Error loading flowers:', error);
          // Fallback to mock data if server is not available
          this.flowers = this.getMockFlowers();
        }
      });
  }

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

  viewFlowerDetails(id: number): void {
    this.router.navigate(['/detail', id]);
  }

  // ========== USER MANAGEMENT ==========

  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.userService.isAdmin();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentUserId(): number | null {
    return this.currentUser ? this.currentUser.id : null;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  logout(): void {
    this.userService.logout().subscribe({
      next: () => {
        console.log('Logout successful');
        alert('You have been logged out successfully.');
        // Optional: redirect to login page
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still clear local state even if server request fails
        alert('Logged out (with errors).');
        this.router.navigate(['/login']);
      }
    });
  }

  // ========== ADMIN FUNCTIONS ==========

  goToAdminPanel(): void {
    if (this.isAdmin()) {
      this.router.navigate(['/admin/flowers']);
    } else {
      alert('Access denied. Admin privileges required.');
    }
  }

  // ========== IMAGE HANDLING ==========

  /**
   * Constructs the full image URL for display
   */
  getImageUrl(imageUrl: string): string {
    console.log('Original imageUrl:', imageUrl); // Debug log

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
   * Handle image loading errors
   */
  onImageError(event: any): void {
    console.warn('Failed to load image:', event.target.src);
    // Set a fallback image
    event.target.src = 'assets/images/placeholder.jpg';
  }

  // ========== HELPER METHODS ==========

  private getMockFlowers(): Flower[] {
    return [
      {
        id: 1,
        name: 'Rose',
        imageUrl: 'images/Rose.jpg',
        info: 'A beautiful red rose.',
        meaning: 'Love and passion',
        availablity: 'Available',
        color: 'Red',
        price: 25
      },
      {
        id: 2,
        name: 'Tulip',
        imageUrl: 'images/Tulip.jpg',
        info: 'A vibrant tulip.',
        meaning: 'Perfect love',
        availablity: 'Unavailable',
        color: 'Yellow',
        price: 15
      },
      {
        id: 3,
        name: 'Sunflower',
        imageUrl: 'images/Sunflower.jpg',
        info: 'A bright sunflower.',
        meaning: 'Loyalty and devotion',
        availablity: 'Available',
        color: 'Yellow',
        price: 20
      }
    ];
  }
}
