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
    // Subscribe to authentication state
    this.subscription.add(
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
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
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.subscription.add(
      this.flowerService.getAllFlowers().subscribe({
        next: (flowers) => {
          this.flowers = flowers;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load flowers';
          this.isLoading = false;
          console.error('Error loading flowers:', error);
        }
      })
    );
  }

  // Navigation methods with permission checks
  viewFlowers(): void {
    if (this.permissionService.canView('flower-catalog')) {
      this.router.navigate(['/flowers']);
    }
  }

  openAdminPanel(): void {
    if (this.permissionService.canView('admin-panel')) {
      this.router.navigate(['/admin']);
    }
  }

  manageFlowers(): void {
    if (this.permissionService.canPerform('edit-flower')) {
      this.router.navigate(['/admin/flowers']);
    }
  }

  createFlower(): void {
    if (this.permissionService.canPerform('create-flower')) {
      this.router.navigate(['/admin/flowers/new']);
    }
  }

  logout(): void {
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

  // Utility methods for template
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ROLE_ADMIN');
  }

  getUserDisplayName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstname} ${this.currentUser.lastname}`;
    }
    return '';
  }
}
