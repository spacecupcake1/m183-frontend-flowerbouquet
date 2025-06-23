import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Flower } from '../../data/flower';
import { AuthService } from '../../service/auth.service';
import { FlowerService } from '../../service/flower.service';
import { ValidationService } from '../../service/validation.service';

interface BouquetItem {
  flower: Flower;
  quantity: number;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {
  flowers: Flower[] = [];
  filteredFlowers: Flower[] = [];
  searchTerm: string = '';
  selectedColor: string = '';
  priceRange: number = 100;
  availabilityFilter: string = '';

  // Bouquet management
  bouquet: BouquetItem[] = [];
  showCheckoutModal: boolean = false;
  showOrderConfirmation: boolean = false;
  isLoading: boolean = false;
  error: string = '';

  // Available filter options
  availableColors: string[] = [];
  maxPrice: number = 100;

  private subscriptions: Subscription[] = [];

  constructor(
    private flowerService: FlowerService,
    private authService: AuthService,
    private validationService: ValidationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFlowers();
    this.loadBouquet();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load all flowers from the service
   */
  loadFlowers(): void {
    this.isLoading = true;
    this.error = '';

    const flowersSub = this.flowerService.getAllFlowers().subscribe({
      next: (flowers) => {
        this.flowers = flowers;
        this.filteredFlowers = flowers;
        this.setupFilterOptions();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load flowers. Please try again.';
        this.isLoading = false;
        console.error('Error loading flowers:', error);
      }
    });

    this.subscriptions.push(flowersSub);
  }

  /**
   * Load bouquet from service
   */
  private loadBouquet(): void {
    if (this.isAuthenticated()) {
      const bouquetSub = this.flowerService.getCartItems().subscribe({
        next: (items) => {
          this.bouquet = items.map(item => ({
            flower: item.flower,
            quantity: item.quantity
          }));
        },
        error: (error) => {
          console.error('Error loading bouquet:', error);
        }
      });
      this.subscriptions.push(bouquetSub);
    }
  }

  /**
   * Navigate to flower detail page - FIX FOR NAVIGATION ISSUE
   */
  viewFlowerDetails(flower: Flower): void {
    if (flower.id) {
      this.router.navigate(['/flowers', flower.id]);
    } else {
      console.error('Flower has no ID, cannot navigate to details');
      alert('Unable to view flower details. Please try again.');
    }
  }

  /**
   * Add flower to bouquet directly from main page
   */
  addToBouquet(flower: Flower): void {
    if (!this.isFlowerAvailable(flower)) {
      alert('This flower is not available.');
      return;
    }

    if (!this.isAuthenticated()) {
      alert('Please log in to add flowers to your bouquet.');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.flowerService.addFlowerToTemp(flower).subscribe({
      next: (response) => {
        console.log('Flower added to bouquet', response);
        // Update local bouquet state
        this.addFlowerToBouquet(flower);
        alert('Flower added to your bouquet!');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error adding flower to bouquet', error);
        alert('Error adding flower to bouquet. Please try again.');
        this.isLoading = false;
      }
    });
  }

  /**
   * Add flower to local bouquet state
   */
  private addFlowerToBouquet(flower: Flower): void {
    const existingItem = this.bouquet.find(item => item.flower.id === flower.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.bouquet.push({ flower, quantity: 1 });
    }
  }

  /**
   * Setup filter options based on available flowers
   */
  private setupFilterOptions(): void {
    // Extract unique colors
    this.availableColors = [...new Set(this.flowers.map(flower => flower.color).filter(Boolean))];

    // Find maximum price
    this.maxPrice = Math.max(...this.flowers.map(flower => flower.price || 0));
    this.priceRange = this.maxPrice;
  }

  /**
   * Apply filters to flower list
   */
  applyFilters(): void {
    this.filteredFlowers = this.flowers.filter(flower => {
      const matchesSearch = !this.searchTerm ||
        flower.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        flower.meaning?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesColor = !this.selectedColor ||
        flower.color?.toLowerCase() === this.selectedColor.toLowerCase();

      const matchesPrice = !flower.price || flower.price <= this.priceRange;

      const matchesAvailability = !this.availabilityFilter ||
        flower.availablity?.toLowerCase() === this.availabilityFilter.toLowerCase();

      return matchesSearch && matchesColor && matchesPrice && matchesAvailability;
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedColor = '';
    this.priceRange = this.maxPrice;
    this.availabilityFilter = '';
    this.filteredFlowers = this.flowers;
  }

  /**
   * Update quantity of item in bouquet
   */
  updateQuantity(flowerId: number, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeFromBouquet(flowerId);
      return;
    }

    const item = this.bouquet.find(item => item.flower.id === flowerId);
    if (item) {
      item.quantity = newQuantity;

      // Update on server
      this.flowerService.updateCartItemQuantity(flowerId, newQuantity).subscribe({
        next: () => {
          console.log('Quantity updated successfully');
        },
        error: (error) => {
          console.error('Error updating quantity:', error);
          // Revert local change on error
          this.loadBouquet();
        }
      });
    }
  }

  /**
   * Remove flower from bouquet
   */
  removeFromBouquet(flowerId: number): void {
    this.bouquet = this.bouquet.filter(item => item.flower.id !== flowerId);

    // Remove from server
    this.flowerService.removeFromCart(flowerId).subscribe({
      next: () => {
        console.log('Flower removed from bouquet');
      },
      error: (error) => {
        console.error('Error removing flower from bouquet:', error);
        // Reload bouquet on error
        this.loadBouquet();
      }
    });
  }

  /**
   * Clear entire bouquet
   */
  clearBouquet(): void {
    if (this.bouquet.length === 0) {
      alert('Your bouquet is already empty.');
      return;
    }

    const confirmed = confirm('Are you sure you want to clear your entire bouquet?');
    if (confirmed) {
      this.flowerService.clearCart().subscribe({
        next: () => {
          this.bouquet = [];
          alert('Bouquet cleared successfully.');
        },
        error: (error) => {
          console.error('Error clearing bouquet:', error);
          alert('Error clearing bouquet. Please try again.');
        }
      });
    }
  }

  /**
   * Proceed to checkout
   */
  proceedToCheckout(): void {
    if (this.bouquet.length === 0) {
      alert('Your bouquet is empty. Please add some flowers first.');
      return;
    }

    if (!this.isAuthenticated()) {
      alert('Please log in to proceed with checkout.');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/checkout']);
  }

  /**
   * Show checkout modal
   */
  showCheckout(): void {
    if (this.bouquet.length === 0) {
      alert('Your bouquet is empty. Please add some flowers first.');
      return;
    }
    this.showCheckoutModal = true;
  }

  /**
   * Close checkout modal
   */
  closeCheckoutModal(): void {
    this.showCheckoutModal = false;
  }

  /**
   * Confirm order
   */
  confirmOrder(): void {
    if (this.bouquet.length === 0) {
      alert('Your bouquet is empty.');
      return;
    }

    if (!this.isAuthenticated()) {
      alert('Please log in to complete your order.');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;

    // Create simple order object
    const orderData = {
      items: this.bouquet.map(item => ({
        flowerId: item.flower.id,
        flowerName: item.flower.name,
        quantity: item.quantity,
        price: item.flower.price,
        subtotal: item.flower.price * item.quantity
      })),
      totalAmount: this.getBouquetTotal(),
      totalItems: this.getBouquetItemCount(),
      orderDate: new Date().toISOString(),
      status: 'confirmed'
    };

    console.log('Processing order:', orderData);

    // Option 1: Save to backend (if you have an order endpoint)
    /*
    this.flowerService.createOrder(orderData).subscribe({
      next: (response) => {
        this.handleOrderSuccess();
      },
      error: (error) => {
        console.error('Order failed:', error);
        this.isLoading = false;
        alert('Order failed. Please try again.');
      }
    });
    */

    // Option 2: Simple simulation (current approach)
    setTimeout(() => {
      this.handleOrderSuccess();
    }, 1500);
  }

  /**
   * Handle successful order completion
   */
  private handleOrderSuccess(): void {
    // Clear the cart/bouquet
    this.flowerService.clearCart().subscribe({
      next: () => {
        console.log('Cart cleared successfully');
      },
      error: (error) => {
        console.warn('Failed to clear cart:', error);
        // Continue anyway
      }
    });

    // Update UI
    this.isLoading = false;
    this.showCheckoutModal = false;
    this.showOrderConfirmation = true;
    this.bouquet = [];

    console.log('Order completed successfully!');
  }

  /**
   * Close order confirmation
   */
  closeOrderConfirmation(): void {
    this.showOrderConfirmation = false;
  }

  /**
   * Get bouquet total price
   */
  getBouquetTotal(): number {
    return this.bouquet.reduce((total, item) =>
      total + (item.flower.price * item.quantity), 0);
  }

  /**
   * Get total number of items in bouquet
   */
  getBouquetItemCount(): number {
    return this.bouquet.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return `€${price.toFixed(2)}`;
  }

  /**
   * Sanitize text for safe display
   */
  sanitizeText(text: string): string {
    return this.validationService ?
      this.validationService.sanitizeForDisplay(text) : text;
  }

  /**
   * Handle image loading errors
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/default-flower.jpg';
    }
  }

  /**
   * Track by function for flower list performance
   */
  trackByFlowerId(index: number, flower: Flower): number | undefined {
    return flower.id;
  }

  /**
   * Track by function for bouquet items
   */
  trackByBouquetItem(index: number, item: BouquetItem): number | undefined {
    return item.flower.id;
  }

  /**
   * Check if flower is available (case insensitive)
   */
  isFlowerAvailable(flower: Flower): boolean {
    if (!flower.availablity) return false;
    const availability = flower.availablity.toLowerCase();
    return availability === 'available' || availability === 'true';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Navigate to admin flower management (admin only)
   */
  goToFlowerManagement(): void {
    if (this.isAdmin()) {
      this.router.navigate(['/admin/flowers']);
    } else {
      alert('Admin access required.');
    }
  }
}
