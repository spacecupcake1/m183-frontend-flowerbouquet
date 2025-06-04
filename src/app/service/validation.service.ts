import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  // ========== CUSTOM VALIDATORS ==========

  /**
   * Validator for flower names (letters, spaces, hyphens, apostrophes only)
   */
  static flowerNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required validator handle empty values
      }

      const namePattern = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
      if (!namePattern.test(control.value)) {
        return {
          invalidFlowerName: {
            message: 'Flower name can only contain letters, spaces, hyphens, and apostrophes'
          }
        };
      }

      return null;
    };
  }

  /**
   * Validator for usernames (letters, numbers, underscores only)
   */
  static usernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const usernamePattern = /^[a-zA-Z0-9_]+$/;
      if (!usernamePattern.test(control.value)) {
        return {
          invalidUsername: {
            message: 'Username can only contain letters, numbers, and underscores'
          }
        };
      }

      return null;
    };
  }

  /**
   * Validator for names (letters, spaces, hyphens, apostrophes only)
   */
  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const namePattern = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
      if (!namePattern.test(control.value)) {
        return {
          invalidName: {
            message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
          }
        };
      }

      return null;
    };
  }

  /**
   * Strong password validator
   */
  static strongPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const password = control.value;
      const errors: any = {};

      // Check for minimum length
      if (password.length < 8) {
        errors.minLength = 'Password must be at least 8 characters long';
      }

      // Check for uppercase letter
      if (!/[A-Z]/.test(password)) {
        errors.uppercase = 'Password must contain at least one uppercase letter';
      }

      // Check for lowercase letter
      if (!/[a-z]/.test(password)) {
        errors.lowercase = 'Password must contain at least one lowercase letter';
      }

      // Check for number
      if (!/\d/.test(password)) {
        errors.number = 'Password must contain at least one number';
      }

      // Check for special character
      if (!/[@$!%*?&]/.test(password)) {
        errors.special = 'Password must contain at least one special character (@$!%*?&)';
      }

      return Object.keys(errors).length > 0 ? { strongPassword: errors } : null;
    };
  }

  /**
   * URL validator
   */
  static urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      try {
        const url = new URL(control.value);

        // Check for safe protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          return {
            invalidUrl: {
              message: 'URL must use HTTP or HTTPS protocol'
            }
          };
        }

        // Check for dangerous patterns
        const dangerousPatterns = ['javascript:', 'data:', 'vbscript:', 'file:'];
        const lowerUrl = control.value.toLowerCase();

        if (dangerousPatterns.some(pattern => lowerUrl.includes(pattern))) {
          return {
            unsafeUrl: {
              message: 'URL contains unsafe content'
            }
          };
        }

        return null;
      } catch {
        return {
          invalidUrl: {
            message: 'Please enter a valid URL'
          }
        };
      }
    };
  }

  /**
   * Price range validator
   */
  static priceRangeValidator(min: number = 1, max: number = 9999): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const price = Number(control.value);

      if (isNaN(price)) {
        return {
          invalidPrice: {
            message: 'Price must be a valid number'
          }
        };
      }

      if (price < min) {
        return {
          priceMin: {
            message: `Price must be at least ${min}`
          }
        };
      }

      if (price > max) {
        return {
          priceMax: {
            message: `Price cannot exceed ${max}`
          }
        };
      }

      return null;
    };
  }

  // ========== INPUT SANITIZATION ==========

  /**
   * Sanitize HTML input to prevent XSS attacks
   */
  sanitizeHtml(input: string): string {
    if (!input) return input;

    // Basic HTML escaping
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Remove potentially dangerous characters
   */
  sanitizeInput(input: string): string {
    if (!input) return input;

    // Remove script tags and dangerous patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload=/gi, '')
      .replace(/onerror=/gi, '')
      .replace(/onclick=/gi, '');
  }

  /**
   * Validate input against XSS patterns
   */
  validateAgainstXSS(input: string): boolean {
    if (!input) return true;

    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return !xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate input against SQL injection patterns
   */
  validateAgainstSQLInjection(input: string): boolean {
    if (!input) return true;

    const sqlPatterns = [
      /('|--|;|\||\*|%)/i,
      /union.*select/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
      /drop.*table/i,
      /exec.*sp_/i
    ];

    return !sqlPatterns.some(pattern => pattern.test(input));
  }

  // ========== ERROR MESSAGE HELPERS ==========

  /**
   * Get user-friendly error message from validation errors
   */
  getErrorMessage(errors: ValidationErrors): string {
    if (!errors) return '';

    // Check for custom error messages first
    if (errors['invalidFlowerName']) return errors['invalidFlowerName'].message;
    if (errors['invalidUsername']) return errors['invalidUsername'].message;
    if (errors['invalidName']) return errors['invalidName'].message;
    if (errors['invalidUrl']) return errors['invalidUrl'].message;
    if (errors['unsafeUrl']) return errors['unsafeUrl'].message;
    if (errors['invalidPrice']) return errors['invalidPrice'].message;
    if (errors['priceMin']) return errors['priceMin'].message;
    if (errors['priceMax']) return errors['priceMax'].message;

    // Handle strong password errors
    if (errors['strongPassword']) {
      const passwordErrors = errors['strongPassword'];
      const messages = [];

      if (passwordErrors.minLength) messages.push(passwordErrors.minLength);
      if (passwordErrors.uppercase) messages.push(passwordErrors.uppercase);
      if (passwordErrors.lowercase) messages.push(passwordErrors.lowercase);
      if (passwordErrors.number) messages.push(passwordErrors.number);
      if (passwordErrors.special) messages.push(passwordErrors.special);

      return messages.join(', ');
    }

    // Handle built-in validators
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Minimum length is ${requiredLength} characters`;
    }
    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return `Maximum length is ${requiredLength} characters`;
    }
    if (errors['min']) {
      const min = errors['min'].min;
      return `Minimum value is ${min}`;
    }
    if (errors['max']) {
      const max = errors['max'].max;
      return `Maximum value is ${max}`;
    }
    if (errors['pattern']) return 'Invalid format';

    return 'Invalid input';
  }

  /**
   * Check if input is safe for processing
   */
  isInputSafe(input: string): boolean {
    return this.validateAgainstXSS(input) && this.validateAgainstSQLInjection(input);
  }

  /**
   * Comprehensive input validation and sanitization
   */
  validateAndSanitize(input: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!input) {
      return { isValid: true, sanitized: input };
    }

    // Check for security threats
    if (!this.validateAgainstXSS(input)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Input contains potentially dangerous content (XSS)'
      };
    }

    if (!this.validateAgainstSQLInjection(input)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Input contains potentially dangerous content (SQL injection)'
      };
    }

    // Check length
    if (input.length > 10000) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Input exceeds maximum allowed length'
      };
    }

    // Sanitize the input
    const sanitized = this.sanitizeInput(input);

    return { isValid: true, sanitized };
  }
}
