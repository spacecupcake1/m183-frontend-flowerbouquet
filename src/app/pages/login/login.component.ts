import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { UserService } from 'src/app/service/user.service';
import { ValidationService } from 'src/app/service/validation.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  validationErrors: { [key: string]: string } = {};

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder,
    private validationService: ValidationService
  ) {
      this.loginForm = this.formBuilder.group({
        username: ['', [Validators.required, ValidationService.usernameValidator()]],
        password: ['', [Validators.required, Validators.minLength(6)]]
      });
    }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.userService.isLoggedIn()) {
      this.router.navigate(['/main']);
    }
  }

  private createLoginForm(): FormGroup {
    return this.formBuilder.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        ValidationService.usernameValidator()
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(50)
      ]]
    });
  }

  onLogin(): void {
    // Mark all fields as touched to trigger validation display
    this.loginForm.markAllAsTouched();
    this.updateValidationErrors();

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please correct the errors below';
      return;
    }

    // Security validation
    const formData = this.loginForm.value;
    if (!this.validateInputSecurity(formData)) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.clearValidationErrors();

    // Sanitize inputs
    const sanitizedData = this.sanitizeLoginData(formData);

    this.userService.login(sanitizedData.username, sanitizedData.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);

        if (response.isAdmin) {
          this.showSuccessMessage(`Welcome back, Admin ${response.firstname}! You have administrative privileges.`);
        } else {
          this.showSuccessMessage(`Welcome back, ${response.firstname}!`);
        }

        // Small delay to show success message
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 1500);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.handleLoginError(error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private validateInputSecurity(formData: any): boolean {
    // Validate against XSS and SQL injection
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        const validation = this.validationService.validateAndSanitize(value);
        if (!validation.isValid) {
          this.validationErrors[key] = validation.error || 'Invalid input detected';
          this.errorMessage = 'Security validation failed';
          return false;
        }
      }
    }
    return true;
  }

  private sanitizeLoginData(formData: any): any {
    return {
      username: this.validationService.sanitizeInput(formData.username).trim(),
      password: formData.password // Don't sanitize password to preserve special characters
    };
  }

  private handleLoginError(error: any): void {
    if (error.error && typeof error.error === 'string') {
      try {
        const errorObj = JSON.parse(error.error);
        this.errorMessage = errorObj.message || 'Login failed';
      } catch {
        this.errorMessage = error.error;
      }
    } else if (error.error && error.error.message) {
      this.errorMessage = error.error.message;
    } else if (error.status === 401) {
      this.errorMessage = 'Invalid username or password';
    } else if (error.status === 0) {
      this.errorMessage = 'Unable to connect to server. Please try again.';
    } else {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    }
  }

  private updateValidationErrors(): void {
    this.validationErrors = {};

    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control && control.invalid && (control.dirty || control.touched)) {
        this.validationErrors[key] = this.validationService.getErrorMessage(control.errors || {});
      }
    });
  }

  private clearValidationErrors(): void {
    this.validationErrors = {};
  }

  private showSuccessMessage(message: string): void {
    // Create a temporary success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<strong>✅ Success:</strong> ${message}`;

    // Insert at the top of the login card
    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
      loginCard.insertBefore(successDiv, loginCard.firstChild);

      // Remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 3000);
    }
  }

  // Form validation helpers
  hasError(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched)) || !!this.validationErrors[field];
  }

  getError(field: string): string {
    if (this.validationErrors[field]) {
      return this.validationErrors[field];
    }

    const control = this.loginForm.get(field);
    if (control && control.errors) {
      return this.validationService.getErrorMessage(control.errors);
    }

    return '';
  }

  // Navigation methods
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToMain(): void {
    this.router.navigate(['/main']);
  }

  // Convenience getters for template
  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get isFormValid(): boolean {
    return this.loginForm.valid;
  }

  get isFormTouched(): boolean {
    return this.loginForm.touched;
  }

  // Real-time validation for better UX
  onFieldBlur(fieldName: string): void {
    const control = this.loginForm.get(fieldName);
    if (control) {
      control.markAsTouched();
      this.updateValidationErrors();
    }
  }

  onFieldInput(fieldName: string): void {
    // Clear specific field error when user starts typing
    if (this.validationErrors[fieldName]) {
      delete this.validationErrors[fieldName];
    }

    // Clear general error message
    if (this.errorMessage && this.errorMessage.includes('correct the errors')) {
      this.errorMessage = '';
    }
  }
}
