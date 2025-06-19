import { Component, OnInit, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { User } from 'src/app/data/user';
import { FlowerService } from 'src/app/service/flower.service';
import { UserService } from 'src/app/service/user.service';


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
    info: 'This is some sample info bdnngghjhj fghrhbfgh hbbhfbhf r hbhb fbejbhfb hebf fhebfhebfhwe fh wefhbfh hbehfbhfb grgrgrg n fjnjfnjnfjnjef j jfjgjg jjnfj  j f fn fnfjf w fnfjenf jnjf ej fjfenfj ejf ej fj fjnefejhb fhef  hbfhfh',
    color: 'Red',
    price: 99.99,
    id: 0,
    imageUrl: 'images/Rose.jpg'
  };

  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowerService: FlowerService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) { }

  getSanitizedContent(content: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, content) || '';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.flowerService.getFlower(+id).subscribe({
        next: (flower) => {
          this.flower = flower;
          console.log('Loaded flower:', flower);
        },
        error: (error) => console.error('Error loading flower:', error)
      });
    }
  }

  // ========== NAVIGATION ==========

  goBack(): void {
    this.router.navigate(['/main']);
  }

  goBouquet(): void {
    this.router.navigate(['/custom']);
  }

  goToAdminPanel(): void {
    this.router.navigate(['/admin/flowers']);
  }

  // ========== USER FUNCTIONS ==========

  addFlowerToTemp(): void {
    this.flowerService.addFlowerToTemp(this.flower).subscribe({
      next: (response) => {
        console.log('Flower added to temp storage', response);
        alert('Flower added to your bouquet!');
      },
      error: (error) => {
        console.error('Error adding flower to temp storage', error);
        alert('Error adding flower to bouquet. Please try again.');
      }
    });
  }

  // ========== ADMIN FUNCTIONS ==========

  isAdmin(): boolean {
    return this.userService.isAdmin();
  }

  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

  editFlower(): void {
    if (!this.isAdmin()) {
      alert('Admin privileges required.');
      return;
    }
    // Navigate to admin panel with this flower selected for editing
    this.router.navigate(['/admin/flowers'], {
      queryParams: { edit: this.flower.id }
    });
  }

  deleteFlower(): void {
    if (!this.isAdmin()) {
      alert('Admin privileges required.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${this.flower.name}"? This action cannot be undone.`)) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.isLoading = true;

    this.flowerService.deleteFlower(this.flower.id, userId).subscribe({
      next: (response) => {
        console.log('Flower deleted successfully:', response);
        alert('Flower deleted successfully!');
        this.router.navigate(['/main']);
      },
      error: (error) => {
        console.error('Error deleting flower:', error);
        alert('Error deleting flower: ' + (error.error?.error || error.message));
        this.isLoading = false;
      }
    });
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

  // ========== UTILITY FUNCTIONS ==========

  isAvailable(): boolean {
    return this.flower.availablity === 'Available';
  }

  getCurrentUser(): User | null {
    return this.userService.getCurrentUserData();
  }

  getCurrentUserId(): number | null {
    return this.userService.getCurrentUserId();
  }
}
