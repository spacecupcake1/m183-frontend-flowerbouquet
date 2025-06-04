import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  // Reactive Form
  flowerForm: FormGroup;

  // Error handling
  submitError: string = '';
  validationErrors: { [key: string]: string } = {};

  constructor(
    private flowerService: FlowerService,
    private userService: UserService,
    private router: Router,
    private formBuilder: FormBuilder,
    private validationService: ValidationService
  ) {
    this.flowerForm = this.createFlowerForm();
  }

  ngOnInit(): void {
    // Check if user is admin
    if (!this.userService.isAdmin()) {
      alert('Access denied. Admin privileges required.');
      this.router.navigate(['/main']);
      return;
    }

    this.loadFlowers();
    this.loadStats();
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
        Validators.maxLength(100),
        ValidationService.flowerNameValidator()
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
        Validators.maxLength(100),
        ValidationService.nameValidator()
      ]],
      price: [null, [
        Validators.required,
        ValidationService.priceRangeValidator(1, 9999)
      ]],
      imageUrl: ['', [
        Validators.required,
        Validators.maxLength(500),
        ValidationService.urlValidator()
      ]]
    });
  }

  // ========== DATA LOADING ==========

  loadFlowers(): void {
    this.flowerService.getFlowers().subscribe({
      next: (data) => this.flowers = data,
      error: (error) => {
        console.error('Error loading flowers:', error);
        this.handleError('Failed to load flowers', error);
      }
    });
  }

  loadStats(): void {
    const userId = this.userService.getCurrentUserId();
    if (userId) {
      this.flowerService.getFlowerStats(userId).subscribe({
        next: (data) => this.stats = data,
        error: (error) => {
          console.error('Error loading stats:', error);
          this.handleError('Failed to load statistics', error);
        }
      });
    }
  }

  // ========== CREATE OPERATIONS ==========

  startCreating(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.resetForm();
    this.clearErrors();
  }

  cancelCreate(): void {
    this.isCreating = false;
    this.resetForm();
    this.clearErrors();
  }

  createFlower(): void {
    if (!this.validateForm()) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.submitError = 'User not logged in';
      return;
    }

    this.isSubmitting = true;
    this.clearErrors();

    // Sanitize form data before sending
    const flowerData = this.sanitizeFormData(this.flowerForm.value);

    this.flowerService.createFlower(flowerData, userId).subscribe({
      next: (createdFlower) => {
        console.log('Flower created successfully:', createdFlower);
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
      }
    });
  }

  // ========== UPDATE OPERATIONS ==========

  startEditing(flower: Flower): void {
    this.isEditing = true;
    this.isCreating = false;
    this.populateForm(flower);
    this.clearErrors();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.resetForm();
    this.clearErrors();
  }

  updateFlower(): void {
    if (!this.validateForm()) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      this.submitError = 'User not logged in';
      return;
    }

    const flowerId = this.flowerForm.get('id')?.value;
    if (!flowerId) {
      this.submitError = 'Invalid flower ID';
      return;
    }

    this.isSubmitting = true;
    this.clearErrors();

    // Sanitize form data before sending
    const flowerData = this.sanitizeFormData(this.flowerForm.value);

    this.flowerService.updateFlower(flowerId, flowerData, userId).subscribe({
      next: (updatedFlower) => {
        console.log('Flower updated successfully:', updatedFlower);
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

    this.flowerService.deleteFlower(flower.id, userId).subscribe({
      next: (response) => {
        console.log('Flower deleted successfully:', response);
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
      return false;
    }

    // Additional security validation
    const formData = this.flowerForm.value;

    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        const validation = this.validationService.validateAndSanitize(value);
        if (!validation.isValid) {
          this.validationErrors[key] = validation.error || 'Invalid input';
          this.submitError = 'Security validation failed';
          return false;
        }
      }
    }

    return true;
  }

  private updateValidationErrors(): void {
    this.validationErrors = {};

    Object.keys(this.flowerForm.controls).forEach(key => {
      const control = this.flowerForm.get(key);
      if (control && control.invalid && (control.dirty || control.touched)) {
        this.validationErrors[key] = this.validationService.getErrorMessage(control.errors || {});
      }
    });
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
      return this.validationService.getErrorMessage(control.errors);
    }

    return '';
  }

  // ========== FORM HELPERS ==========

  private resetForm(): void {
    this.flowerForm.reset();
    this.flowerForm.patchValue({
      availablity: 'Available' // Set default value
    });
  }

  private populateForm(flower: Flower): void {
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

    // Sanitize string fields
    if (sanitized.name) {
      sanitized.name = this.validationService.sanitizeInput(sanitized.name).trim();
    }
    if (sanitized.meaning) {
      sanitized.meaning = this.validationService.sanitizeInput(sanitized.meaning).trim();
    }
    if (sanitized.info) {
      sanitized.info = this.validationService.sanitizeInput(sanitized.info).trim();
    }
    if (sanitized.color) {
      sanitized.color = this.validationService.sanitizeInput(sanitized.color).trim();
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
  }

  private clearErrors(): void {
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
}
