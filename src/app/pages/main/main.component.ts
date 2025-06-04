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

  // ========== HELPER METHODS ==========

  private getMockFlowers(): Flower[] {
    return [
      {
        id: 1,
        name: 'Rose',
        imageUrl: '/roses/red-rose.jpg',
        info: 'A beautiful red rose.',
        meaning: 'Love and passion',
        availablity: 'Available',
        color: 'Red',
        price: 25
      },
      {
        id: 2,
        name: 'Tulip',
        imageUrl: '/tulips/yellow-tulip.jpg',
        info: 'A vibrant tulip.',
        meaning: 'Perfect love',
        availablity: 'Unavailable',
        color: 'Yellow',
        price: 15
      },
      {
        id: 3,
        name: 'Sunflower',
        imageUrl: '/sunflowers/bright-sunflower.jpg',
        info: 'A bright sunflower.',
        meaning: 'Loyalty and devotion',
        availablity: 'Available',
        color: 'Yellow',
        price: 20
      }
    ];
  }
}
