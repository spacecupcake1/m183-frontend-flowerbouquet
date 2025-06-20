import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { User } from 'src/app/data/user';
import { FlowerService } from 'src/app/service/flower.service';
import { UserService } from 'src/app/service/user.service';
import { ValidationService } from 'src/app/service/validation.service';

@Component({
  selector: 'app-admin-flowers',
  templateUrl: './admin-flowers.component.html',
  styleUrls: ['./admin-flowers.component.css']
})
export class AdminFlowersComponent implements OnInit {
  flowers: Flower[] = [];
  error: string = '';
  isLoading: boolean = false;
  stats: any = {
    totalFlowers: 0,
    availableFlowers: 0,
    unavailableFlowers: 0
  };
  isEditing = false;
  isCreating = false;
  isSubmitting = false;

  // Reactive Form
  flowerForm: FormGroup;
  editingFlower: Flower | null = null;

  // Error handling
  submitError: string = '';
  validationErrors: { [key: string]: string } = {};

  // Debug flag - set to true for debugging
  debugMode = true;

  constructor(
    private flowerService: FlowerService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private validationService: ValidationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.flowerForm = this.createFlowerForm();
  }

  ngOnInit(): void {
    console.log('AdminFlowersComponent ngOnInit called');

    // Check if user is admin
    if (!this.userService.isAdmin()) {
      console.warn('User is not admin, redirecting to main');
      alert('Access denied. Admin privileges required.');
      this.router.navigate(['/main']);
      return;
    }

    // Check for edit parameter in route
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        const flowerId = Number(params['edit']);
        console.log('Edit parameter found:', flowerId);
        // Load flowers first, then start editing
        this.loadFlowers().then(() => {
          this.startEditingById(flowerId);
        });
      } else {
        this.loadFlowers();
      }
    });

    this.loadStats();
  }

  private debugLog(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[AdminFlowers] ${message}`, data || '');
    }
  }

   private mapFlowerToCreateRequest(flower: any): any {
    return {
      name: flower.name,
      meaning: flower.meaning,
      availability: flower.availablity, // Map availablity to availability
      info: flower.info,
      color: flower.color,
      price: flower.price,
      imageUrl: flower.imageUrl
    };
  }

  /**
   * Get current user (synchronous for templates)
   */
  getCurrentUser(): User | null {
    return this.userService.getCurrentUserData();
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    return this.userService.getCurrentUserId();
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.userService.isAdmin();
  }

  // ========== FORM CREATION ==========

  private createFlowerForm(): FormGroup {
    return this.formBuilder.group({
      id: [null],
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      meaning: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(1000)
      ]],
      availablity: ['Available', [
        Validators.required,
        Validators.pattern(/^(Available|Unavailable)$/)
      ]],
      info: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(1000)
      ]],
      color: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      price: [null, [
        Validators.required,
        Validators.min(1),
        Validators.max(9999)
      ]],
      imageUrl: ['', [
        Validators.required,
        Validators.maxLength(500),
        Validators.pattern(/^https?:\/\/.+/)
      ]]
    });
  }

  // ========== DATA LOADING ==========

loadFlowers(): Promise<void> {
  this.isLoading = true;
  this.error = '';

  return new Promise<void>((resolve, reject) => {
    this.flowerService.getAllFlowers().subscribe({
      next: (data: any) => {
        this.flowers = data;
        this.calculateFlowerStats();
        this.isLoading = false;
        resolve();
      },
      error: (error: any) => {
        this.error = 'Failed to load flowers';
        this.isLoading = false;
        console.error('Error loading flowers:', error);
        reject(error);
      }
    });
  });
}

  loadStats(): void {
    const userId = this.userService.getCurrentUserId();
    if (userId) {
      this.debugLog('Loading stats for user:', userId);
      this.flowerService.getFlowerStats(userId).subscribe({
        next: (data) => {
          this.debugLog('Stats loaded successfully', data);
          this.stats = data;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
          this.handleError('Failed to load statistics', error);
        }
      });
    }
  }

  // ========== CREATE OPERATIONS ==========

  startCreating(): void {
    this.debugLog('Starting creation mode');
    this.isCreating = true;
    this.isEditing = false;
    this.editingFlower = null;
    this.resetForm();
    this.clearErrors();

    // Force change detection
    this.cdr.detectChanges();

    this.debugLog('Creation mode state', {
      isCreating: this.isCreating,
      isEditing: this.isEditing
    });
  }

  cancelCreate(): void {
    this.debugLog('Canceling creation');
    this.isCreating = false;
    this.editingFlower = null;
    this.resetForm();
    this.clearErrors();
    this.cdr.detectChanges();
  }

   // Fix createFlower method (line 241 error)
  createFlower(flowerData: any): void {
    const createRequest = this.mapFlowerToCreateRequest(flowerData);

    this.flowerService.createFlower(createRequest).subscribe({
      next: (response) => {
        this.loadFlowers();
      },
      error: (error) => {
        this.error = 'Failed to create flower';
        console.error('Error creating flower:', error);
      }
    });
  }

  // Fix updateFlower method (line 327 error)
  updateFlower(flowerId: number, flowerData: any): void {
    const updateRequest = this.mapFlowerToCreateRequest(flowerData);

    this.flowerService.updateFlower(flowerId, updateRequest).subscribe({
      next: (response) => {
        this.loadFlowers();
      },
      error: (error) => {
        this.error = 'Failed to update flower';
        console.error('Error updating flower:', error);
      }
    });
  }

  editFlower(flower: any): void {
    // Set editing mode
    this.editingFlower = flower;
    this.isEditing = true;

    // Populate form with flower data
    if (this.flowerForm) {
      this.flowerForm.patchValue({
        name: flower.name,
        meaning: flower.meaning,
        availablity: flower.availablity,
        info: flower.info,
        color: flower.color,
        price: flower.price,
        imageUrl: flower.imageUrl
      });
    }
  }

  deleteFlower(flower: any): void {
    if (confirm(`Are you sure you want to delete "${flower.name}"?`)) {
      this.flowerService.deleteFlower(flower.id!).subscribe({
        next: () => {
          this.loadFlowers(); // Reload the list
          this.calculateFlowerStats(); // Update stats
        },
        error: (error) => {
          console.error('Error deleting flower:', error);
          this.error = 'Failed to delete flower';
        }
      });
    }
  }

  // Add trackBy method to fix line 587 undefined error
  trackByFlowerId(index: number, flower: any): number {
    return flower?.id || index;
  }

  // ========== UPDATE OPERATIONS ==========

  startEditing(flower: Flower): void {
    this.debugLog('Starting edit mode for flower', flower);
    this.isEditing = true;
    this.isCreating = false;
    this.editingFlower = flower;
    this.populateForm(flower);
    this.clearErrors();

    // Force change detection
    this.cdr.detectChanges();

    this.debugLog('Edit mode state', {
      isCreating: this.isCreating,
      isEditing: this.isEditing,
      editingFlower: this.editingFlower
    });
  }

  startEditingById(flowerId: number): void {
    const flower = this.flowers.find(f => f.id === flowerId);
    if (flower) {
      this.startEditing(flower);
    } else {
      this.debugLog('Flower not found for editing:', flowerId);
    }
  }

  cancelEdit(): void {
    this.debugLog('Canceling edit');
    this.isEditing = false;
    this.editingFlower = null;
    this.resetForm();
    this.clearErrors();
    this.cdr.detectChanges();
  }


  // ========== DELETE OPERATIONS ==========

  private calculateFlowerStats(): void {
    if (this.flowers) {
      this.stats = {
        totalFlowers: this.flowers.length,
        availableFlowers: this.flowers.filter(f => f.availablity === 'Available').length,
        unavailableFlowers: this.flowers.filter(f => f.availablity === 'Unavailable').length
      };
    }
  }

  // ========== FORM VALIDATION ==========

  private validateForm(): boolean {
    this.flowerForm.markAllAsTouched();
    this.updateValidationErrors();

    if (this.flowerForm.invalid) {
      this.submitError = 'Please correct the errors below';
      this.debugLog('Form is invalid', this.flowerForm.errors);
      return false;
    }

    return true;
  }

  private updateValidationErrors(): void {
    this.validationErrors = {};

    Object.keys(this.flowerForm.controls).forEach(key => {
      const control = this.flowerForm.get(key);
      if (control && control.invalid && (control.dirty || control.touched)) {
        this.validationErrors[key] = this.getControlErrorMessage(control);
      }
    });
  }

  private getControlErrorMessage(control: AbstractControl): string {
    if (control.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
      if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
      if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
      if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}`;
      if (control.errors['pattern']) return 'Invalid format';
    }
    return 'Invalid input';
  }

  hasError(field: string): boolean {
    const control = this.flowerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched)) || !!this.validationErrors[field];
  }

  getError(field: string): string {
    if (this.validationErrors[field]) {
      return this.validationErrors[field];
    }

    const control = this.flowerForm.get(field);
    if (control && control.errors) {
      return this.getControlErrorMessage(control);
    }

    return '';
  }

  // ========== FORM HELPERS ==========

  private resetForm(): void {
    this.debugLog('Resetting form');
    this.flowerForm.reset();
    this.flowerForm.patchValue({
      availablity: 'Available' // Set default value
    });
  }

  private populateForm(flower: Flower): void {
    this.debugLog('Populating form with flower data', flower);
    this.flowerForm.patchValue({
      id: flower.id,
      name: flower.name,
      meaning: flower.meaning,
      availablity: flower.availablity,
      info: flower.info,
      color: flower.color,
      price: flower.price,
      imageUrl: flower.imageUrl
    });
  }

  private sanitizeFormData(formData: any): Flower {
    const sanitized = { ...formData };

    // Basic sanitization
    if (sanitized.name) {
      sanitized.name = sanitized.name.trim();
    }
    if (sanitized.meaning) {
      sanitized.meaning = sanitized.meaning.trim();
    }
    if (sanitized.info) {
      sanitized.info = sanitized.info.trim();
    }
    if (sanitized.color) {
      sanitized.color = sanitized.color.trim();
    }
    if (sanitized.imageUrl) {
      sanitized.imageUrl = sanitized.imageUrl.trim();
    }

    return sanitized;
  }

  // ========== ERROR HANDLING ==========

  private handleError(message: string, error: any): void {
    if (error.error && error.error.fieldErrors) {
      // Handle validation errors from backend
      this.validationErrors = error.error.fieldErrors;
      this.submitError = error.error.message || message;
    } else if (error.error && error.error.error) {
      // Handle general errors from backend
      this.submitError = error.error.error;
    } else {
      // Handle network or other errors
      this.submitError = `${message}: ${error.message || 'Unknown error'}`;
    }
    this.debugLog('Error handled', { message, error, submitError: this.submitError });
  }

  /**
   * Clear errors (accessible from template)
   */
  clearErrors(): void {
    this.submitError = '';
    this.validationErrors = {};
  }

  private showSuccessMessage(message: string): void {
    // You could implement a toast service here
    alert(message);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Handle image loading errors
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/assets/images/placeholder.jpg';
    }
  }

  // ========== NAVIGATION ==========

  goBack(): void {
    this.router.navigate(['/main']);
  }

  // Updated logout method to work with session-based authentication
  logout(): void {
    this.userService.logout().subscribe({
      next: () => {
        console.log('Logout successful');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still navigate to login even if logout request fails
        this.router.navigate(['/login']);
      }
    });
  }

  // ========== FORM CONTROLS GETTERS ==========

  get nameControl(): AbstractControl | null {
    return this.flowerForm.get('name');
  }

  get meaningControl(): AbstractControl | null {
    return this.flowerForm.get('meaning');
  }

  get availablityControl(): AbstractControl | null {
    return this.flowerForm.get('availablity');
  }

  get infoControl(): AbstractControl | null {
    return this.flowerForm.get('info');
  }

  get colorControl(): AbstractControl | null {
    return this.flowerForm.get('color');
  }

  get priceControl(): AbstractControl | null {
    return this.flowerForm.get('price');
  }

  get imageUrlControl(): AbstractControl | null {
    return this.flowerForm.get('imageUrl');
  }

  // ========== HELPER METHODS ==========

  /**
   * Get proper image URL for display
   */
  getImageUrl(imageUrl: string): string {
    if (!imageUrl) {
      return '/assets/images/placeholder.jpg';
    }

    // If imageUrl already starts with 'assets/', return as is
    if (imageUrl.startsWith('assets/')) {
      return '/' + imageUrl;
    }

    // If imageUrl starts with 'http' or 'https', it's an external URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If imageUrl starts with '/', return as is (absolute path)
    if (imageUrl.startsWith('/')) {
      return imageUrl;
    }

    // If imageUrl starts with 'images/', prepend '/assets/'
    if (imageUrl.startsWith('images/')) {
      return '/assets/' + imageUrl;
    }

    // Otherwise, assume it's just a filename and prepend '/assets/images/'
    return '/assets/images/' + imageUrl;
  }

  // ========== DEBUG METHODS ==========

  /**
   * Debug method to check component state
   */
  debugComponentState(): void {
    console.log('=== Component State Debug ===');
    console.log('isCreating:', this.isCreating);
    console.log('isEditing:', this.isEditing);
    console.log('isSubmitting:', this.isSubmitting);
    console.log('editingFlower:', this.editingFlower);
    console.log('flowers count:', this.flowers.length);
    console.log('form valid:', this.flowerForm.valid);
    console.log('form value:', this.flowerForm.value);
    console.log('===============================');
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    this.debugLog('Debug mode toggled', this.debugMode);
  }
}
