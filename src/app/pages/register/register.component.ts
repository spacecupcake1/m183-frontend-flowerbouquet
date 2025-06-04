import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from 'src/app/service/user.service';
import { ValidationService } from 'src/app/service/validation.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router,
    private validationService: ValidationService
  ) {
    this.registerForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        ValidationService.usernameValidator()
      ]],
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
        Validators.maxLength(100)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100)
      ]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.fieldErrors = {};
      this.successMessage = '';

      // Get form values
      const formData = this.registerForm.value;

      // Validate and sanitize inputs
      const validationResults = {
        username: this.validationService.validateAndSanitize(formData.username),
        firstname: this.validationService.validateAndSanitize(formData.firstname),
        lastname: this.validationService.validateAndSanitize(formData.lastname),
        email: this.validationService.validateAndSanitize(formData.email),
        password: this.validationService.validateAndSanitize(formData.password)
      };

      // Check for validation errors
      const hasValidationError = Object.values(validationResults).some(result => !result.isValid);
      if (hasValidationError) {
        this.isLoading = false;
        this.errorMessage = 'Please correct the input errors';

        // Set field-specific errors
        Object.keys(validationResults).forEach(key => {
          const result = validationResults[key as keyof typeof validationResults];
          if (!result.isValid && result.error) {
            this.fieldErrors[key] = result.error;
          }
        });
        return;
      }

      // Prepare sanitized data
      const registrationData = {
        username: validationResults.username.sanitized,
        firstname: validationResults.firstname.sanitized,
        lastname: validationResults.lastname.sanitized,
        email: validationResults.email.sanitized,
        password: validationResults.password.sanitized
      };

      this.userService.registerUser(registrationData).subscribe({
        next: (response) => {
          console.log('User registered successfully!', response);
          this.successMessage = 'Registration successful! Redirecting to login...';

          // Redirect to login after a short delay
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { message: 'Registration successful! Please log in.' }
            });
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error occurred while registering user', error);

          if (error.error) {
            if (error.error.fieldErrors) {
              this.fieldErrors = error.error.fieldErrors;
            }
            this.errorMessage = error.error.error || 'Registration failed. Please try again.';
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.registerForm.get(fieldName);

    if (control && control.invalid && (control.dirty || control.touched)) {
      return this.validationService.getErrorMessage(control.errors!);
    }

    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched)) ||
           !!(this.fieldErrors[fieldName]);
  }

  // Real-time validation for better UX
  onFieldBlur(fieldName: string): void {
    const control = this.registerForm.get(fieldName);
    if (control) {
      control.markAsTouched();
    }
  }

  onFieldInput(fieldName: string): void {
    // Clear specific field error when user starts typing
    if (this.fieldErrors[fieldName]) {
      delete this.fieldErrors[fieldName];
    }

    // Clear general error message
    if (this.errorMessage && this.errorMessage.includes('correct the input')) {
      this.errorMessage = '';
    }
  }

  // Navigation helper
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
