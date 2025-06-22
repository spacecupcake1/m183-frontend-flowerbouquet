// src/app/pages/main/main.component.ts

import { Component, OnDestroy, OnInit } from '@angular/core';
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
    private validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.loadFlowers();
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
   * Setup filter options based on available flowers
   */
  private setupFilterOptions(): void {
    // Extract unique colors
    this.availableColors = [...new Set(this.flowers.map(f => f.color))].sort();

    // Find maximum price
    this.maxPrice = Math.max(...this.flowers.map(f => f.price), 100);
    this.priceRange = this.maxPrice;
  }

  /**
   * Apply filters to the flower list
   */
  applyFilters(): void {
    this.filteredFlowers = this.flowers.filter(flower => {
      // Search term filter
      const matchesSearch = !this.searchTerm ||
        flower.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (flower.meaning && flower.meaning.toLowerCase().includes(this.searchTerm.toLowerCase()));

      // Color filter
      const matchesColor = !this.selectedColor || flower.color === this.selectedColor;

      // Price filter
      const matchesPrice = flower.price <= this.priceRange;

      // Availability filter
      const matchesAvailability = !this.availabilityFilter ||
        flower.availablity?.toLowerCase() === this.availabilityFilter.toLowerCase();

      return matchesSearch && matchesColor && matchesPrice && matchesAvailability;
    });
  }

  /**
   * Handle search input
   */
  onSearchChange(): void {
    // Validate search input for security
    if (this.searchTerm && !this.validationService.validateUserInput(this.searchTerm)) {
      this.error = 'Invalid search term. Please use only letters, numbers, and spaces.';
      return;
    }
    this.error = '';
    this.applyFilters();
  }

  /**
   * Handle filter changes
   */
  onFilterChange(): void {
    this.applyFilters();
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
    this.error = '';
  }

  /**
   * Add flower to bouquet
   */
  addToBouquet(flower: Flower): void {
    console.log('=== ADD TO BOUQUET DEBUG ===');
    console.log('Flower:', flower);
    console.log('Flower ID:', flower.id);
    console.log('Is Authenticated:', this.authService.isAuthenticated());
    console.log('Flower Availability:', flower.availablity);
    console.log('Is Available:', this.isFlowerAvailable(flower));

    if (!this.authService.isAuthenticated()) {
      this.error = 'Please log in to add flowers to your bouquet.';
      console.log('❌ User not authenticated');
      return;
    }

    // Check if flower has valid id
    if (!flower.id) {
      this.error = 'Invalid flower data.';
      console.log('❌ Flower missing ID');
      return;
    }

    // Check if flower is available (case insensitive)
    if (!this.isFlowerAvailable(flower)) {
      this.error = 'This flower is currently not available.';
      console.log('❌ Flower not available');
      return;
    }

    const existingItem = this.bouquet.find(item => item.flower.id === flower.id);

    if (existingItem) {
      existingItem.quantity += 1;
      console.log('✅ Updated quantity for existing flower');
    } else {
      this.bouquet.push({ flower, quantity: 1 });
      console.log('✅ Added new flower to bouquet');
    }

    this.error = '';
    console.log('✅ Successfully added to bouquet:', flower.name);
    console.log('Current bouquet:', this.bouquet);
  }

  /**
   * Remove flower from bouquet
   */
  removeFromBouquet(flowerId: number): void {
    this.bouquet = this.bouquet.filter(item => item.flower.id !== flowerId);
  }

  /**
   * Update quantity of flower in bouquet
   */
  updateQuantity(flowerId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromBouquet(flowerId);
      return;
    }

    const item = this.bouquet.find(item => item.flower.id === flowerId);
    if (item) {
      item.quantity = quantity;
    }
  }

  /**
   * Get total price of bouquet
   */
  getBouquetTotal(): number {
    return this.bouquet.reduce((total, item) => total + (item.flower.price * item.quantity), 0);
  }

  /**
   * Get total items in bouquet
   */
  getBouquetItemCount(): number {
    return this.bouquet.reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Show checkout modal
   */
  proceedToCheckout(): void {
    if (this.bouquet.length === 0) {
      this.error = 'Your bouquet is empty. Please add some flowers first.';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.error = 'Please log in to proceed with checkout.';
      return;
    }

    this.showCheckoutModal = true;
    this.error = '';
  }

  /**
   * Close checkout modal
   */
  closeCheckoutModal(): void {
    this.showCheckoutModal = false;
  }

  /**
   * Confirm and process the order
   */
  confirmOrder(): void {
    if (this.bouquet.length === 0) {
      this.error = 'Cannot place empty order.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    // Simulate order processing (replace with actual API call)
    setTimeout(() => {
      try {
        // Here you would typically call an order service
        // this.orderService.createOrder(this.bouquet).subscribe(...)

        // For now, just simulate success
        this.isLoading = false;
        this.showCheckoutModal = false;
        this.showOrderConfirmation = true;

        // Clear bouquet after successful order
        setTimeout(() => {
          this.clearBouquet();
        }, 100);

        // Auto-hide confirmation after 3 seconds
        setTimeout(() => {
          this.showOrderConfirmation = false;
        }, 3000);

      } catch (error) {
        this.isLoading = false;
        this.error = 'Failed to process order. Please try again.';
        console.error('Order processing error:', error);
      }
    }, 1500); // Simulate processing time
  }

  /**
   * Clear the entire bouquet
   */
  clearBouquet(): void {
    this.bouquet = [];
    this.error = '';
    console.log('Bouquet cleared for next order');
  }

  /**
   * Close order confirmation
   */
  closeOrderConfirmation(): void {
    this.showOrderConfirmation = false;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.authService.hasRole('ROLE_ADMIN');
  }

  /**
   * Get current user display name
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  /**
   * Sanitize display text
   */
  sanitizeText(text: string): string {
    return this.validationService.sanitizeForDisplay ?
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
}
