import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface SecurityValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedValidationService {

  // Security patterns
  private static readonly SQL_INJECTION_PATTERN = /(?:'|--|;|\||\*|%|union|select|insert|update|delete|drop|create|alter|exec|execute)/i;
  private static readonly XSS_PATTERN = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed|<form|<input|<meta/i;
  private static readonly HTML_PATTERN = /<[^>]*>/g;
  private static readonly PATH_TRAVERSAL_PATTERN = /\.\.[\\/]|[\\/]\.\.[\\/]|\.\.[\\/]|[\\/]\.\.|%2e%2e|%252e%252e/i;

  // Valid patterns
  private static readonly VALID_USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;
  private static readonly VALID_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  private static readonly VALID_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static readonly VALID_FLOWER_NAME_PATTERN = /^[a-zA-Z0-9\s\-'.,]{2,100}$/;
  private static readonly VALID_URL_PATTERN = /^https?:\/\/[\w.-]+(:\d+)?(\/.*)?$/;

  constructor() { }

  /**
   * Comprehensive input validation with security checks
   */
  validateInput(input: string, fieldName: string, inputType: InputType = InputType.GENERIC): SecurityValidationResult {
    const errors: string[] = [];

    if (!input) {
      return { isValid: true, sanitized: input, errors: [] };
    }

    // Security validations
    if (EnhancedValidationService.SQL_INJECTION_PATTERN.test(input)) {
      errors.push('Input contains potentially dangerous SQL patterns');
    }

    if (EnhancedValidationService.XSS_PATTERN.test(input)) {
      errors.push('Input contains potentially dangerous XSS patterns');
    }

    if (EnhancedValidationService.PATH_TRAVERSAL_PATTERN.test(input)) {
      errors.push('Input contains path traversal patterns');
    }

    // Type-specific validation
    const typeValidationErrors = this.validateByType(input, inputType);
    errors.push(...typeValidationErrors);

    // Length validation
    const maxLength = this.getMaxLengthForType(inputType);
    if (input.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // Sanitize input
    const sanitized = this.sanitizeInput(input, inputType);

    return {
      isValid: errors.length === 0,
      sanitized: sanitized,
      errors: errors
    };
  }

  /**
   * Type-specific validation
   */
  private validateByType(input: string, type: InputType): string[] {
    const errors: string[] = [];

    switch (type) {
      case InputType.USERNAME:
        if (!EnhancedValidationService.VALID_USERNAME_PATTERN.test(input)) {
          errors.push('Username must be 3-50 characters, alphanumeric, underscore, or dash only');
        }
        break;
      case InputType.EMAIL:
        if (!EnhancedValidationService.VALID_EMAIL_PATTERN.test(input)) {
          errors.push('Invalid email format');
        }
        break;
      case InputType.NAME:
        if (!EnhancedValidationService.VALID_NAME_PATTERN.test(input)) {
          errors.push('Name must be 2-50 characters, letters, spaces, apostrophes, or hyphens only');
        }
        break;
      case InputType.FLOWER_NAME:
        if (!EnhancedValidationService.VALID_FLOWER_NAME_PATTERN.test(input)) {
          errors.push('Flower name contains invalid characters');
        }
        break;
      case InputType.URL:
        if (!EnhancedValidationService.VALID_URL_PATTERN.test(input)) {
          errors.push('Invalid URL format');
        }
        break;
      case InputType.PRICE:
        if (!/^\d+(\.\d{1,2})?$/.test(input)) {
          errors.push('Price must be a valid number with up to 2 decimal places');
        }
        break;
    }

    return errors;
  }

  /**
   * Sanitize input based on type
   */
  private sanitizeInput(input: string, type: InputType): string {
    if (!input) return input;

    let sanitized = input.trim();

    switch (type) {
      case InputType.HTML_CONTENT:
        sanitized = this.htmlEncode(sanitized);
        break;
      case InputType.SEARCH_TERM:
        sanitized = sanitized.replace(/[<>"'%;()&+]/g, '');
        break;
      case InputType.URL:
        sanitized = sanitized.replace(/[<>"'\s]/g, '');
        break;
      default:
        sanitized = this.htmlEncode(sanitized);
        break;
    }

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
   * Get maximum length for input type
   */
  private getMaxLengthForType(type: InputType): number {
    switch (type) {
      case InputType.USERNAME: return 50;
      case InputType.EMAIL: return 100;
      case InputType.NAME: return 50;
      case InputType.FLOWER_NAME: return 100;
      case InputType.DESCRIPTION: return 1000;
      case InputType.SEARCH_TERM: return 100;
      case InputType.URL: return 255;
      default: return 255;
    }
  }

  // Angular Validators
  static secureInputValidator(inputType: InputType = InputType.GENERIC): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const validationService = new EnhancedValidationService();
      const result = validationService.validateInput(control.value, 'field', inputType);

      if (!result.isValid) {
        return {
          securityViolation: {
            value: control.value,
            errors: result.errors
          }
        };
      }

      return null;
    };
  }

  static sqlInjectionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      if (EnhancedValidationService.SQL_INJECTION_PATTERN.test(control.value)) {
        return { sqlInjection: { value: control.value } };
      }

      return null;
    };
  }

  static xssValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      if (EnhancedValidationService.XSS_PATTERN.test(control.value)) {
        return { xss: { value: control.value } };
      }

      return null;
    };
  }

  static pathTraversalValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      if (EnhancedValidationService.PATH_TRAVERSAL_PATTERN.test(control.value)) {
        return { pathTraversal: { value: control.value } };
      }

      return null;
    };
  }
}

export enum InputType {
  USERNAME = 'USERNAME',
  EMAIL = 'EMAIL',
  NAME = 'NAME',
  FLOWER_NAME = 'FLOWER_NAME',
  PRICE = 'PRICE',
  DESCRIPTION = 'DESCRIPTION',
  SEARCH_TERM = 'SEARCH_TERM',
  HTML_CONTENT = 'HTML_CONTENT',
  URL = 'URL',
  GENERIC = 'GENERIC'
}
