import { Component, OnInit, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { User } from 'src/app/data/user';
import { AuthService } from 'src/app/service/auth.service';
import { FlowerService } from 'src/app/service/flower.service';

@Component({
  selector: 'app-detail-page',
  templateUrl: './detail-page.component.html',
  styleUrls: ['./detail-page.component.css']
})
export class DetailPageComponent implements OnInit {
  flower: Flower = {
    name: 'Sample Product',
    meaning: 'This is a sample meaning',
    availablity: 'Available',
    info: 'Loading flower information...',
    color: 'Red',
    price: 99.99,
    id: 0,
    imageUrl: 'images/Rose.jpg'
  };

  isLoading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowerService: FlowerService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFlower(+id);
    } else {
      // If no ID, show flower list or default flower
      this.loadDefaultFlower();
    }
  }

  private loadFlower(id: number): void {
    this.isLoading = true;
    this.error = '';

    this.flowerService.getFlower(id).subscribe({
      next: (flower) => {
        this.flower = flower;
        this.isLoading = false;
        console.log('Loaded flower:', flower);
      },
      error: (error) => {
        console.error('Error loading flower:', error);
        this.error = 'Failed to load flower details';
        this.isLoading = false;
        // Set default flower on error
        this.loadDefaultFlower();
      }
    });
  }

  private loadDefaultFlower(): void {
    // Set a default flower or load first available flower
    this.flower = {
      id: 1,
      name: 'Beautiful Rose',
      meaning: 'Love and passion',
      availablity: 'Available',
      info: 'A classic red rose symbolizing deep love and affection.',
      color: 'Red',
      price: 29.99,
      imageUrl: 'images/Rose.jpg'
    };
  }

  // ========== IMAGE HANDLING ==========

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'images/default-flower.jpg';

    // If imageUrl is relative, prepend assets/
    if (imageUrl.startsWith('images/')) {
      return `assets/${imageUrl}`;
    }

    return imageUrl;
  }

  onImageError(event: any): void {
    console.warn('Image failed to load:', event.target.src);
    event.target.src = 'assets/images/default-flower.jpg';
  }

  // ========== UTILITY METHODS ==========

  getSanitizedContent(content: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, content) || '';
  }

  isAvailable(): boolean {
    return this.flower?.availablity?.toLowerCase() === 'available';
  }

  getCurrentUser(): User | null {
    return this.authService.getCurrentUserValue();
  }

  // ========== NAVIGATION ==========

  goBack(): void {
    this.router.navigate(['/main']);
  }

  goBouquet(): void {
    this.router.navigate(['/customizing']);
  }

  goToAdminPanel(): void {
    this.router.navigate(['/admin/flowers']);
  }

  // ========== USER FUNCTIONS ==========

  addFlowerToTemp(): void {
    if (!this.isAvailable()) {
      alert('This flower is not available.');
      return;
    }

    if (!this.isLoggedIn()) {
      alert('Please log in to add flowers to your bouquet.');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.flowerService.addFlowerToTemp(this.flower).subscribe({
      next: (response) => {
        console.log('Flower added to temp storage', response);
        alert('Flower added to your bouquet!');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error adding flower to temp storage', error);
        alert('Error adding flower to bouquet. Please try again.');
        this.isLoading = false;
      }
    });
  }

  // ========== AUTHENTICATION CHECKS ==========

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  // ========== ADMIN FUNCTIONS ==========

  editFlower(): void {
    if (!this.isAdmin()) {
      alert('Admin privileges required.');
      return;
    }

    // Navigate to admin flower management with this flower's ID
    this.router.navigate(['/admin/flowers'], {
      queryParams: { editId: this.flower.id }
    });
  }

  deleteFlower(): void {
    if (!this.isAdmin()) {
      alert('Admin privileges required.');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${this.flower.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    this.isLoading = true;
    this.flowerService.deleteFlower(this.flower.id!).subscribe({
      next: (response) => {
        console.log('Flower deleted successfully', response);
        alert('Flower deleted successfully.');
        this.router.navigate(['/admin/flowers']);
      },
      error: (error) => {
        console.error('Error deleting flower:', error);
        alert('Error deleting flower. Please try again.');
        this.isLoading = false;
      }
    });
  }

  // ========== DEVELOPMENT HELPERS ==========

  debugFlower(): void {
    console.log('Current flower:', this.flower);
    console.log('User:', this.getCurrentUser());
    console.log('Is Admin:', this.isAdmin());
    console.log('Is Logged In:', this.isLoggedIn());
  }
}
