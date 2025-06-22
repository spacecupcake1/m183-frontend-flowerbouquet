import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*>/gi
  ];

  private readonly SQL_PATTERNS = [
    /(\b(select|insert|update|delete|drop|create|alter|exec|execute|union)\b)/gi,
    /(--|\/\*|\*\/|;|\||&)/g,
    /(\b(or|and)\b\s+\b\w+\s*=\s*\w+)/gi
  ];

  /**
   * Static validator methods for reactive forms
   */
  static usernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      return usernameRegex.test(value) ? null : { invalidUsername: true };
    };
  }

  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
      return nameRegex.test(value) ? null : { invalidName: true };
    };
  }

  static emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : { invalidEmail: true };
    };
  }

  static passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const errors: ValidationErrors = {};

      if (value.length < 8) {
        errors['minLength'] = true;
      }

      if (!/[A-Z]/.test(value)) {
        errors['requiresUppercase'] = true;
      }

      if (!/[a-z]/.test(value)) {
        errors['requiresLowercase'] = true;
      }

      if (!/[0-9]/.test(value)) {
        errors['requiresNumber'] = true;
      }

      if (!/[^A-Za-z0-9]/.test(value)) {
        errors['requiresSpecialChar'] = true;
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  /**
   * Sanitize input for safe display
   */
  sanitizeForDisplay(input: string): string {
    if (!input) return '';

    let sanitized = input;

    // Remove dangerous HTML/JavaScript patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized.trim();
  }

  /**
   * Validate and sanitize input - returns validation result and clean value
   */
  validateAndSanitize(input: string): { valid: boolean; value: string; errors: string[] } {
    const errors: string[] = [];

    if (!input) {
      return { valid: true, value: '', errors: [] };
    }

    // Check length
    if (input.length > 1000) {
      errors.push('Input too long (maximum 1000 characters)');
    }

    // Check for XSS
    if (!this.validateNoXSS(input)) {
      errors.push('Input contains potentially dangerous content');
    }

    // Check for SQL injection
    if (!this.validateNoSQLInjection(input)) {
      errors.push('Input contains potentially malicious SQL patterns');
    }

    // Sanitize the input
    const sanitizedValue = this.sanitizeInput(input);

    return {
      valid: errors.length === 0,
      value: sanitizedValue,
      errors: errors
    };
  }

  /**
   * Validate input for XSS patterns
   */
  validateNoXSS(input: string): boolean {
    if (!input) return true;
    return !this.XSS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Validate input for SQL injection patterns
   */
  validateNoSQLInjection(input: string): boolean {
    if (!input) return true;
    return !this.SQL_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive input validation
   */
  validateInput(input: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input) {
      return { valid: true, errors: [] };
    }

    // Check length
    if (input.length > 1000) {
      errors.push('Input too long (maximum 1000 characters)');
    }

    // Check for XSS
    if (!this.validateNoXSS(input)) {
      errors.push('Input contains potentially dangerous content');
    }

    // Check for SQL injection
    if (!this.validateNoSQLInjection(input)) {
      errors.push('Input contains potentially malicious SQL patterns');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Sanitize input for safe processing
   */
  sanitizeInput(input: string): string {
    if (!input) return '';

    // Basic sanitization
    return input
      .trim()
      .substring(0, 1000) // Limit length
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Alternative name for email validation (for compatibility)
   */
  isValidEmail(email: string): boolean {
    return this.validateEmail(email);
  }

  /**
   * Validate username format
   */
  validateUsername(username: string): boolean {
    // Alphanumeric, underscore, hyphen, 3-50 characters
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return usernameRegex.test(username);
  }

  /**
   * Alternative name for username validation (for compatibility)
   */
  isValidUsername(username: string): boolean {
    return this.validateUsername(username);
  }

  /**
   * Validate name format (first name, last name)
   */
  validateName(name: string): boolean {
    // Letters, accented characters, spaces, hyphens, apostrophes, 2-50 characters
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
    return nameRegex.test(name);
  }

  /**
   * Alternative name for name validation (for compatibility)
   */
  isValidName(name: string): boolean {
    return this.validateName(name);
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get password strength score (0-4)
   */
  getPasswordStrength(password: string): number {
    let score = 0;

    if (!password) return score;

    // Length bonus
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return Math.min(score, 4);
  }

  /**
   * Get password strength text
   */
  getPasswordStrengthText(password: string): string {
    const strength = this.getPasswordStrength(password);
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength] || 'Very Weak';
  }

  /**
   * Get error message from form control errors
   */
  getErrorMessage(errors: ValidationErrors | null): string {
    if (!errors) return '';

    // Handle common validation errors
    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    if (errors['invalidEmail']) {
      return 'Please enter a valid email address';
    }

    if (errors['invalidUsername']) {
      return 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens';
    }

    if (errors['invalidName']) {
      return 'Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Minimum length is ${requiredLength} characters`;
    }

    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return `Maximum length is ${requiredLength} characters`;
    }

    if (errors['pattern']) {
      return 'Please enter a valid format';
    }

    // Password specific errors
    if (errors['minLength']) {
      return 'Password must be at least 8 characters long';
    }

    if (errors['requiresUppercase']) {
      return 'Password must contain at least one uppercase letter';
    }

    if (errors['requiresLowercase']) {
      return 'Password must contain at least one lowercase letter';
    }

    if (errors['requiresNumber']) {
      return 'Password must contain at least one number';
    }

    if (errors['requiresSpecialChar']) {
      return 'Password must contain at least one special character';
    }

    // Custom validation errors
    if (errors['xssDetected']) {
      return 'Input contains potentially dangerous content';
    }

    if (errors['sqlInjectionDetected']) {
      return 'Input contains potentially malicious SQL patterns';
    }

    if (errors['inputTooLong']) {
      return 'Input is too long (maximum 1000 characters)';
    }

    // Default error message
    const firstErrorKey = Object.keys(errors)[0];
    return `Invalid ${firstErrorKey}`;
  }

  /**
   * Clean and validate form data
   */
  cleanFormData(data: any): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        const validation = this.validateAndSanitize(value);
        cleaned[key] = validation.value;
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Validate phone number (basic validation)
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust regex as needed for your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove all HTML tags from string
   */
  stripHtml(input: string): string {
    if (!input) return '';
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Truncate string to specified length
   */
  truncateString(input: string, maxLength: number): string {
    if (!input || input.length <= maxLength) return input;
    return input.substring(0, maxLength).trim() + '...';
  }
}
