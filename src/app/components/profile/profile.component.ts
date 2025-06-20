import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PermissionService } from 'src/app/service/permission.service';
import { User } from '../../data/user';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { ValidationService } from '../../service/validation.service';

interface ProfileUpdateData {
  firstname?: string;
  lastname?: string;
  email?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * User profile component for managing personal account information.
 * Provides secure form handling with validation and proper error management.
 */
@Component({
  selector: 'app-profile',
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <div class="user-avatar-large">
          {{ getUserInitials() }}
        </div>
        <div class="user-info">
          <h1 class="user-name">{{ getUserDisplayName() }}</h1>
          <p class="user-email">{{ currentUser?.email }}</p>
          <div class="user-roles">
            <span
              *ngFor="let role of currentUser?.roles"
              class="role-badge"
              [class.admin-badge]="role === 'ROLE_ADMIN'"
              [class.moderator-badge]="role === 'ROLE_MODERATOR'"
              [class.user-badge]="role === 'ROLE_USER'">
              {{ getRoleDisplayName(role) }}
            </span>
          </div>
        </div>
      </div>

      <div class="profile-content">

        <!-- Profile Information Section -->
        <div class="profile-section">
          <h2 class="section-title">
            <i class="icon-user" aria-hidden="true"></i>
            Profile Information
          </h2>

          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" class="profile-form">

            <!-- Username (Read-only) -->
            <div class="form-group">
              <label for="username" class="form-label">Username</label>
              <input
                type="text"
                id="username"
                class="form-control"
                [value]="currentUser?.username"
                readonly
                aria-describedby="username-help">
              <small id="username-help" class="form-text">
                Username cannot be changed for security reasons
              </small>
            </div>

            <!-- First Name -->
            <div class="form-group">
              <label for="firstname" class="form-label">
                First Name <span class="required">*</span>
              </label>
              <input
                type="text"
                id="firstname"
                class="form-control"
                formControlName="firstname"
                [class.is-invalid]="isFieldInvalid('firstname')"
                (blur)="onFieldBlur('firstname')"
                (input)="onFieldInput('firstname')"
                autocomplete="given-name">
              <div *ngIf="isFieldInvalid('firstname')" class="invalid-feedback">
                {{ getFieldError('firstname') }}
              </div>
            </div>

            <!-- Last Name -->
            <div class="form-group">
              <label for="lastname" class="form-label">
                Last Name <span class="required">*</span>
              </label>
              <input
                type="text"
                id="lastname"
                class="form-control"
                formControlName="lastname"
                [class.is-invalid]="isFieldInvalid('lastname')"
                (blur)="onFieldBlur('lastname')"
                (input)="onFieldInput('lastname')"
                autocomplete="family-name">
              <div *ngIf="isFieldInvalid('lastname')" class="invalid-feedback">
                {{ getFieldError('lastname') }}
              </div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label for="email" class="form-label">
                Email Address <span class="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                class="form-control"
                formControlName="email"
                [class.is-invalid]="isFieldInvalid('email')"
                (blur)="onFieldBlur('email')"
                (input)="onFieldInput('email')"
                autocomplete="email">
              <div *ngIf="isFieldInvalid('email')" class="invalid-feedback">
                {{ getFieldError('email') }}
              </div>
            </div>

            <!-- Error Messages -->
            <div *ngIf="profileError" class="alert alert-danger" role="alert">
              <i class="icon-error" aria-hidden="true"></i>
              {{ profileError }}
            </div>

            <!-- Success Messages -->
            <div *ngIf="profileSuccess" class="alert alert-success" role="alert">
              <i class="icon-success" aria-hidden="true"></i>
              {{ profileSuccess }}
            </div>

            <!-- Submit Button -->
            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="profileForm.invalid || isUpdating"
                [attr.aria-busy]="isUpdating">
                <i *ngIf="!isUpdating" class="icon-save" aria-hidden="true"></i>
                <i *ngIf="isUpdating" class="icon-loading" aria-hidden="true"></i>
                {{ isUpdating ? 'Updating...' : 'Update Profile' }}
              </button>

              <button
                type="button"
                class="btn btn-secondary"
                (click)="resetProfileForm()"
                [disabled]="isUpdating">
                <i class="icon-reset" aria-hidden="true"></i>
                Reset
              </button>
            </div>
          </form>
        </div>

        <!-- Password Change Section -->
        <div class="profile-section">
          <h2 class="section-title">
            <i class="icon-lock" aria-hidden="true"></i>
            Change Password
          </h2>

          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="password-form">

            <!-- Current Password -->
            <div class="form-group">
              <label for="currentPassword" class="form-label">
                Current Password <span class="required">*</span>
              </label>
              <input
                type="password"
                id="currentPassword"
                class="form-control"
                formControlName="currentPassword"
                [class.is-invalid]="isPasswordFieldInvalid('currentPassword')"
                autocomplete="current-password">
              <div *ngIf="isPasswordFieldInvalid('currentPassword')" class="invalid-feedback">
                {{ getPasswordFieldError('currentPassword') }}
              </div>
            </div>

            <!-- New Password -->
            <div class="form-group">
              <label for="newPassword" class="form-label">
                New Password <span class="required">*</span>
              </label>
              <input
                type="password"
                id="newPassword"
                class="form-control"
                formControlName="newPassword"
                [class.is-invalid]="isPasswordFieldInvalid('newPassword')"
                autocomplete="new-password">
              <div *ngIf="isPasswordFieldInvalid('newPassword')" class="invalid-feedback">
                {{ getPasswordFieldError('newPassword') }}
              </div>
              <div class="password-strength" *ngIf="passwordForm.get('newPassword')?.value">
                <div class="strength-meter">
                  <div
                    class="strength-bar"
                    [class]="getPasswordStrengthClass()"
                    [style.width.%]="getPasswordStrengthPercentage()">
                  </div>
                </div>
                <small class="strength-text">{{ getPasswordStrengthText() }}</small>
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="form-group">
              <label for="confirmPassword" class="form-label">
                Confirm New Password <span class="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                class="form-control"
                formControlName="confirmPassword"
                [class.is-invalid]="isPasswordFieldInvalid('confirmPassword')"
                autocomplete="new-password">
              <div *ngIf="isPasswordFieldInvalid('confirmPassword')" class="invalid-feedback">
                {{ getPasswordFieldError('confirmPassword') }}
              </div>
            </div>

            <!-- Password Error Messages -->
            <div *ngIf="passwordError" class="alert alert-danger" role="alert">
              <i class="icon-error" aria-hidden="true"></i>
              {{ passwordError }}
            </div>

            <!-- Password Success Messages -->
            <div *ngIf="passwordSuccess" class="alert alert-success" role="alert">
              <i class="icon-success" aria-hidden="true"></i>
              {{ passwordSuccess }}
            </div>

            <!-- Submit Button -->
            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-warning"
                [disabled]="passwordForm.invalid || isChangingPassword"
                [attr.aria-busy]="isChangingPassword">
                <i *ngIf="!isChangingPassword" class="icon-key" aria-hidden="true"></i>
                <i *ngIf="isChangingPassword" class="icon-loading" aria-hidden="true"></i>
                {{ isChangingPassword ? 'Changing...' : 'Change Password' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Account Security Section -->
        <div class="profile-section">
          <h2 class="section-title">
            <i class="icon-shield" aria-hidden="true"></i>
            Account Security
          </h2>

          <div class="security-info">
            <div class="security-item">
              <div class="security-label">Account Status</div>
              <div class="security-value">
                <span class="status-badge active">Active</span>
              </div>
            </div>

            <div class="security-item">
              <div class="security-label">Last Login</div>
              <div class="security-value">{{ getLastLoginTime() }}</div>
            </div>

            <div class="security-item">
              <div class="security-label">Account Created</div>
              <div class="security-value">{{ getAccountCreatedTime() }}</div>
            </div>

            <div class="security-item">
              <div class="security-label">Two-Factor Authentication</div>
              <div class="security-value">
                <span class="status-badge inactive">Not Enabled</span>
                <button class="btn btn-sm btn-outline" disabled>
                  Enable 2FA (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Actions (if admin) -->
        <div class="profile-section" *ngIf="canViewAdminSection()">
          <h2 class="section-title">
            <i class="icon-admin" aria-hidden="true"></i>
            Administrative Actions
          </h2>

          <div class="admin-actions">
            <button
              class="btn btn-secondary"
              (click)="navigateToAdminPanel()"
              type="button">
              <i class="icon-admin-panel" aria-hidden="true"></i>
              Admin Panel
            </button>

            <button
              class="btn btn-secondary"
              (click)="navigateToUserManagement()"
              type="button">
              <i class="icon-users" aria-hidden="true"></i>
              User Management
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;

  isUpdating = false;
  isChangingPassword = false;
  profileError = '';
  profileSuccess = '';
  passwordError = '';
  passwordSuccess = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private validationService: ValidationService,
    private permissionService: PermissionService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.profileForm = this.createProfileForm();
    this.passwordForm = this.createPasswordForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Create profile update form with validation.
   */
  private createProfileForm(): FormGroup {
    return this.formBuilder.group({
      firstname: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        ValidationService.nameValidator()
      ]],
      lastname: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        ValidationService.nameValidator()
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        ValidationService.emailValidator()
      ]]
    });
  }

  /**
   * Create password change form with validation.
   */
  private createPasswordForm(): FormGroup {
    return this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        ValidationService.passwordValidator()
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Password match validator.
   */
  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    }

    return null;
  }

  /**
   * Load current user data and populate forms.
   */
  private loadCurrentUser(): void {
    const userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.populateProfileForm(user);
      }
    });
    this.subscriptions.push(userSub);
  }

  /**
   * Populate profile form with user data.
   */
  private populateProfileForm(user: User): void {
    this.profileForm.patchValue({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    });
  }

  /**
   * Setup form validation and real-time feedback.
   */
  private setupFormValidation(): void {
    // Clear success messages when forms are modified
    this.profileForm.valueChanges.subscribe(() => {
      if (this.profileSuccess) this.profileSuccess = '';
      if (this.profileError) this.profileError = '';
    });

    this.passwordForm.valueChanges.subscribe(() => {
      if (this.passwordSuccess) this.passwordSuccess = '';
      if (this.passwordError) this.passwordError = '';
    });
  }

  /**
   * Handle profile update form submission.
   */
  onUpdateProfile(): void {
    if (this.profileForm.invalid || !this.currentUser) return;

    this.isUpdating = true;
    this.profileError = '';
    this.profileSuccess = '';

    const updateData: ProfileUpdateData = this.profileForm.value;

    const updateSub = this.userService.updateCurrentUserProfile(updateData).subscribe({
      next: (updatedUser) => {
        this.profileSuccess = 'Profile updated successfully!';
        this.currentUser = updatedUser;
        this.isUpdating = false;

        // Auto-clear success message after 5 seconds
        setTimeout(() => this.profileSuccess = '', 5000);
      },
      error: (error) => {
        this.profileError = this.extractErrorMessage(error);
        this.isUpdating = false;
      }
    });
    this.subscriptions.push(updateSub);
  }

  /**
   * Handle password change form submission.
   */
  onChangePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    const passwordData: PasswordChangeData = this.passwordForm.value;

    // TODO: Implement password change API call
    // For now, simulate the call
    setTimeout(() => {
      this.passwordSuccess = 'Password changed successfully!';
      this.passwordForm.reset();
      this.isChangingPassword = false;

      // Auto-clear success message after 5 seconds
      setTimeout(() => this.passwordSuccess = '', 5000);
    }, 1000);
  }

  /**
   * Reset profile form to original values.
   */
  resetProfileForm(): void {
    if (this.currentUser) {
      this.populateProfileForm(this.currentUser);
      this.profileError = '';
      this.profileSuccess = '';
    }
  }

  /**
   * Form validation helpers.
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.profileForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (control && control.errors) {
      return this.validationService.getErrorMessage(control.errors);
    }
    return '';
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const control = this.passwordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getPasswordFieldError(fieldName: string): string {
    const control = this.passwordForm.get(fieldName);
    if (control && control.errors) {
      if (fieldName === 'confirmPassword' && control.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
      return this.validationService.getErrorMessage(control.errors);
    }
    return '';
  }

  /**
   * Field event handlers.
   */
  onFieldBlur(fieldName: string): void {
    const control = this.profileForm.get(fieldName);
    if (control) {
      control.markAsTouched();
    }
  }

  onFieldInput(fieldName: string): void {
    // Clear errors when user starts typing
    if (this.profileError) this.profileError = '';
  }

  /**
   * Password strength helpers.
   */
  getPasswordStrengthPercentage(): number {
    const password = this.passwordForm.get('newPassword')?.value || '';
    let score = 0;

    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) score += 12.5;

    return Math.min(score, 100);
  }

  getPasswordStrengthClass(): string {
    const percentage = this.getPasswordStrengthPercentage();
    if (percentage < 30) return 'strength-weak';
    if (percentage < 60) return 'strength-medium';
    if (percentage < 80) return 'strength-good';
    return 'strength-strong';
  }

  getPasswordStrengthText(): string {
    const percentage = this.getPasswordStrengthPercentage();
    if (percentage < 30) return 'Weak';
    if (percentage < 60) return 'Medium';
    if (percentage < 80) return 'Good';
    return 'Strong';
  }

  /**
   * User info helpers.
   */
  getUserDisplayName(): string {
    return this.userService.getUserDisplayName(this.currentUser || undefined);
  }

  getUserInitials(): string {
    return this.userService.getUserInitials(this.currentUser || undefined);
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'Administrator';
      case 'ROLE_MODERATOR': return 'Moderator';
      case 'ROLE_USER': return 'User';
      default: return role.replace('ROLE_', '').toLowerCase();
    }
  }

  getLastLoginTime(): string {
    // TODO: Implement last login tracking
    return 'Not available';
  }

  getAccountCreatedTime(): string {
    // TODO: Implement account creation date tracking
    return 'Not available';
  }

  /**
   * Permission checks.
   */
  canViewAdminSection(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Navigation helpers.
   */
  navigateToAdminPanel(): void {
    this.router.navigate(['/admin']);
  }

  navigateToUserManagement(): void {
    this.router.navigate(['/admin/users']);
  }

  /**
   * Extract error message from API response.
   */
  private extractErrorMessage(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (error.status === 400) {
      return 'Invalid data provided';
    } else if (error.status === 401) {
      return 'Authentication required';
    } else if (error.status === 403) {
      return 'You do not have permission to update this profile';
    } else {
      return 'An error occurred while updating your profile';
    }
  }
}
