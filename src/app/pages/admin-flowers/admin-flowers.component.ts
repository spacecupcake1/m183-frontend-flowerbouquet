import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { User } from 'src/app/data/user';
import { FlowerService, FlowerStats } from 'src/app/service/flower.service';
import { UserService } from 'src/app/service/user.service';
import { ValidationService } from 'src/app/service/validation.service';

@Component({
  selector: 'app-admin-flowers',
  templateUrl: './admin-flowers.component.html',
  styleUrls: ['./admin-flowers.component.css']
})
export class AdminFlowersComponent implements OnInit {
  flowers: Flower[] = [];
  stats: FlowerStats | null = null;
  isEditing = false;
  isCreating = false;
  isSubmitting = false;
  isLoading = false;

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
    private cdr: ChangeDetectorRef  // Add ChangeDetectorRef for manual change detection
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
    return new Promise((resolve, reject) => {
      this.debugLog('Loading flowers...');
      this.isLoading = true;

      this.flowerService.getFlowers().subscribe({
        next: (data) => {
          this.debugLog('Flowers loaded successfully', data);
          this.flowers = data;
          this.isLoading = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading flowers:', error);
          this.handleError('Failed to load flowers', error);
          this.isLoading = false;
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

  createFlower(): void {
    this.debugLog('Creating flower...');

    if (!this.validateForm()) {
      this.debugLog('Form validation failed');
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.submitError = 'User not logged in';
      this.debugLog('User not logged in');
      return;
    }

    this.isSubmitting = true;
    this.clearErrors();

    // Sanitize form data before sending
    const flowerData = this.sanitizeFormData(this.flowerForm.value);
    this.debugLog('Sanitized flower data', flowerData);

    this.flowerService.createFlower(flowerData, userId).subscribe({
      next: (createdFlower) => {
        this.debugLog('Flower created successfully', createdFlower);
        this.loadFlowers();
        this.loadStats();
        this.cancelCreate();
        this.showSuccessMessage('Flower created successfully!');
      },
      error: (error) => {
        console.error('Error creating flower:', error);
        this.handleError('Failed to create flower', error);
      },
      complete: () => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
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

  updateFlower(): void {
    this.debugLog('Updating flower...');

    if (!this.validateForm()) {
      this.debugLog('Form validation failed');
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.submitError = 'User not logged in';
      this.debugLog('User not logged in');
      return;
    }

    const flowerId = this.flowerForm.get('id')?.value;
    if (!flowerId) {
      this.submitError = 'Invalid flower ID';
      this.debugLog('Invalid flower ID');
      return;
    }

    this.isSubmitting = true;
    this.clearErrors();

    // Sanitize form data before sending
    const flowerData = this.sanitizeFormData(this.flowerForm.value);
    this.debugLog('Sanitized flower data for update', flowerData);

    this.flowerService.updateFlower(flowerId, flowerData, userId).subscribe({
      next: (updatedFlower) => {
        this.debugLog('Flower updated successfully', updatedFlower);
        this.loadFlowers();
        this.loadStats();
        this.cancelEdit();
        this.showSuccessMessage('Flower updated successfully!');
      },
      error: (error) => {
        console.error('Error updating flower:', error);
        this.handleError('Failed to update flower', error);
      },
      complete: () => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ========== DELETE OPERATIONS ==========

  deleteFlower(flower: Flower): void {
    if (!confirm(`Are you sure you want to delete "${flower.name}"?`)) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.debugLog('Deleting flower', flower);

    this.flowerService.deleteFlower(flower.id, userId).subscribe({
      next: (response) => {
        this.debugLog('Flower deleted successfully', response);
        this.loadFlowers();
        this.loadStats();
        this.showSuccessMessage('Flower deleted successfully!');
      },
      error: (error) => {
        console.error('Error deleting flower:', error);
        this.handleError('Failed to delete flower', error);
      }
    });
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
   * Track by function for flower list
   */
  trackByFlowerId(index: number, flower: Flower): number {
    return flower.id;
  }

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
