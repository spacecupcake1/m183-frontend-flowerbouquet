import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Service for client-side input validation and sanitization.
 * Provides protection against XSS attacks and ensures data quality.
 * Note: This is client-side validation only - server-side validation is still required!
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  // Patterns for detecting potentially malicious content
  private static readonly SQL_INJECTION_PATTERN = /(?:union|select|insert|update|delete|drop|create|alter|exec|execute|script)/i;
  private static readonly HTML_TAG_PATTERN = /<[^>]+>/g;
  private static readonly XSS_PATTERN = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;
  private static readonly HTML_PATTERN = /<[^>]*>/g;

  // Valid patterns for different input types
  private static readonly VALID_USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;
  private static readonly VALID_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  private static readonly VALID_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor() { }

  /**
   * Sanitize input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    if (!input) return input;

    // Remove HTML tags
    let sanitized = input.replace(ValidationService.HTML_PATTERN, '');

    // Remove potential script injections
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Encode special characters
    sanitized = this.htmlEncode(sanitized);

    return sanitized;
  }

  /**
   * HTML encode special characters
   */
  private htmlEncode(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validator for XSS prevention
   */
  static xssValidator(): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      if (!control.value) return null;

      if (ValidationService.XSS_PATTERN.test(control.value)) {
        return { 'xss': { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Flower name validator with XSS protection
   */
  static flowerNameValidator(): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      if (!control.value) return null;

      // Check for XSS patterns
      if (ValidationService.XSS_PATTERN.test(control.value)) {
        return { 'xss': { value: control.value } };
      }

      // Check for valid flower name pattern
      const namePattern = /^[a-zA-Z0-9\s\-'\.]+$/;
      if (!namePattern.test(control.value)) {
        return { 'invalidName': { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates and sanitizes input for security threats.
   */
  validateAndSanitize(input: string): ValidationResult {
    if (!input) {
      return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
    }

    // Check for SQL injection patterns
    if (ValidationService.SQL_INJECTION_PATTERN.test(input)) {
      return { isValid: false, sanitized: '', error: 'Potential SQL injection detected' };
    }

    // Check for XSS patterns
    if (ValidationService.XSS_PATTERN.test(input)) {
      return { isValid: false, sanitized: '', error: 'Potential XSS attack detected' };
    }

    // Sanitize the input
    const sanitized = this.sanitizeInput(input);

    return { isValid: true, sanitized, error: undefined };
  }

  /**
   * Custom validator for usernames.
   */
  static usernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();

      if (!ValidationService.VALID_USERNAME_PATTERN.test(value)) {
        return {
          invalidUsername: {
            message: 'Username must be 3-50 characters long and contain only letters, numbers, hyphens, and underscores'
          }
        };
      }

      if (ValidationService.SQL_INJECTION_PATTERN.test(value) || ValidationService.XSS_PATTERN.test(value)) {
        return {
          securityViolation: {
            message: 'Username contains invalid characters'
          }
        };
      }

      return null;
    };
  }

  /**
   * Custom validator for names (first name, last name).
   */
  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();

      if (!ValidationService.VALID_NAME_PATTERN.test(value)) {
        return {
          invalidName: {
            message: 'Name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes'
          }
        };
      }

      if (ValidationService.SQL_INJECTION_PATTERN.test(value) || ValidationService.XSS_PATTERN.test(value)) {
        return {
          securityViolation: {
            message: 'Name contains invalid characters'
          }
        };
      }

      return null;
    };
  }

  /**
   * Custom validator for email addresses.
   */
  static emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();

      if (!ValidationService.VALID_EMAIL_PATTERN.test(value)) {
        return {
          invalidEmail: {
            message: 'Please enter a valid email address'
          }
        };
      }

      if (ValidationService.SQL_INJECTION_PATTERN.test(value) || ValidationService.XSS_PATTERN.test(value)) {
        return {
          securityViolation: {
            message: 'Email contains invalid characters'
          }
        };
      }

      return null;
    };
  }

  /**
   * Custom validator for passwords.
   */
  static passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();

      if (value.length < 8) {
        return {
          weakPassword: {
            message: 'Password must be at least 8 characters long'
          }
        };
      }

      // Check for password strength
      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumbers = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

      if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
        return {
          weakPassword: {
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
          }
        };
      }

      // Basic security check (don't sanitize passwords as it might break them)
      if (ValidationService.SQL_INJECTION_PATTERN.test(value) || ValidationService.XSS_PATTERN.test(value)) {
        return {
          securityViolation: {
            message: 'Password contains potentially dangerous content'
          }
        };
      }

      return null;
    };
  }

  /**
   * Validates username format and security.
   */
  isValidUsername(username: string): boolean {
    if (!username) return false;
    const result = this.validateAndSanitize(username);
    return result.isValid && ValidationService.VALID_USERNAME_PATTERN.test(username);
  }

  /**
   * Validates name format and security.
   */
  isValidName(name: string): boolean {
    if (!name) return false;
    const result = this.validateAndSanitize(name);
    return result.isValid && ValidationService.VALID_NAME_PATTERN.test(name);
  }

  /**
   * Validates email format and security.
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const result = this.validateAndSanitize(email);
    return result.isValid && ValidationService.VALID_EMAIL_PATTERN.test(email);
  }

  /**
   * Gets user-friendly error message from validation errors.
   */
  getErrorMessage(errors: ValidationErrors): string {
    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['maxlength']) {
      return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    }

    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    if (errors['invalidUsername']) {
      return errors['invalidUsername'].message;
    }

    if (errors['invalidName']) {
      return errors['invalidName'].message;
    }

    if (errors['invalidEmail']) {
      return errors['invalidEmail'].message;
    }

    if (errors['weakPassword']) {
      return errors['weakPassword'].message;
    }

    if (errors['securityViolation']) {
      return errors['securityViolation'].message;
    }

    // Generic error message for unknown validation errors
    return 'Please check your input';
  }

  /**
   * Checks if input contains potentially dangerous content.
   */
  containsDangerousContent(input: string): boolean {
    if (!input) return false;

    return ValidationService.SQL_INJECTION_PATTERN.test(input) ||
           ValidationService.XSS_PATTERN.test(input) ||
           ValidationService.HTML_TAG_PATTERN.test(input);
  }

  /**
   * Removes control characters that might be used in attacks.
   */
  removeControlCharacters(input: string): string {
    if (!input) return '';

    // Remove null bytes and other control characters
    return input.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
  }

  /**
   * Validates file upload names for security.
   */
  isSafeFileName(filename: string): boolean {
    if (!filename) return false;

    // Check for path traversal and dangerous characters
    const dangerousPatterns = [
      /\.\./,     // Path traversal
      /[<>:"|?*]/, // Invalid filename characters
      /\x00/,     // Null bytes
      /^\./,      // Hidden files starting with dot
      /\.exe$|\.bat$|\.cmd$|\.scr$/i // Dangerous extensions
    ];

    return !dangerousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Validator for price ranges
   */
  static priceRangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const value = parseFloat(control.value);

      if (isNaN(value)) {
        return { priceRange: { message: 'Price must be a valid number' } };
      }

      if (value < min) {
        return { priceRange: { message: `Price cannot be less than ${min}` } };
      }

      if (value > max) {
        return { priceRange: { message: `Price cannot exceed ${max}` } };
      }

      // Check for reasonable decimal places (max 2)
      if ((value.toString().split('.')[1] || '').length > 2) {
        return { priceRange: { message: 'Price cannot have more than 2 decimal places' } };
      }

      return null;
    };
  }

  /**
   * Validator for URLs (image URLs, etc.)
   */
  static urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const value = control.value.toString().trim();

      try {
        const url = new URL(value);

        // Check if protocol is http or https
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { url: { message: 'URL must use HTTP or HTTPS protocol' } };
        }

        // Check for common image file extensions if this is for images
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasImageExtension = imageExtensions.some(ext =>
          url.pathname.toLowerCase().endsWith(ext)
        );

        // If it doesn't have an image extension, check if it might be a CDN or API endpoint
        if (!hasImageExtension && !url.pathname.includes('/api/') && !url.hostname.includes('cdn')) {
          console.warn('URL does not appear to be an image URL');
          // Don't return error, just warn
        }

        return null;
      } catch (error) {
        return { url: { message: 'Please enter a valid URL' } };
      }
    };
  }

  /**
   * Validator for flower descriptions
   */
  static flowerDescriptionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value.toString().trim();

      if (value.length < 10) {
        return { description: { message: 'Description must be at least 10 characters long' } };
      }

      if (value.length > 1000) {
        return { description: { message: 'Description cannot exceed 1000 characters' } };
      }

      // Check for HTML tags (basic security)
      if (/<[^>]*>/g.test(value)) {
        return { description: { message: 'HTML tags are not allowed in description' } };
      }

      return null;
    };
  }

  /**
   * Validator for flower categories
   */
  static flowerCategoryValidator(allowedCategories: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value.toString().trim();

      if (!allowedCategories.includes(value)) {
        return {
          category: {
            message: `Category must be one of: ${allowedCategories.join(', ')}`
          }
        };
      }

      return null;
    };
  }

  /**
   * Validator for stock quantity
   */
  static stockValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null;
      }

      const value = parseInt(control.value);

      if (isNaN(value)) {
        return { stock: { message: 'Stock must be a valid number' } };
      }

      if (value < 0) {
        return { stock: { message: 'Stock cannot be negative' } };
      }

      if (value > 9999) {
        return { stock: { message: 'Stock cannot exceed 9999' } };
      }

      return null;
    };
  }

  /**
   * Custom validator for flower availability dates
   */
  static availabilityDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      if (selectedDate < today) {
        return { availabilityDate: { message: 'Availability date cannot be in the past' } };
      }

      // Check if date is too far in the future (e.g., more than 2 years)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 2);

      if (selectedDate > maxDate) {
        return { availabilityDate: { message: 'Availability date cannot be more than 2 years in the future' } };
      }

      return null;
    };
  }

  /**
   * Validator for required fields with custom message
   */
  static requiredWithMessage(message: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.toString().trim().length === 0) {
        return { required: { message } };
      }
      return null;
    };
  }

  /**
   * Cross-field validator for price comparison (min/max price)
   */
  static priceComparisonValidator(minPriceField: string, maxPriceField: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const minPrice = formGroup.get(minPriceField)?.value;
      const maxPrice = formGroup.get(maxPriceField)?.value;

      if (minPrice && maxPrice && parseFloat(minPrice) >= parseFloat(maxPrice)) {
        return { priceComparison: { message: 'Maximum price must be greater than minimum price' } };
      }

      return null;
    };
  }
}
