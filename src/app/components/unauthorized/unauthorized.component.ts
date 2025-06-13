import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

/**
 * Unauthorized component displayed when users try to access restricted resources.
 * Provides clear feedback and navigation options for users with insufficient permissions.
 */
@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">

        <!-- Error Icon -->
        <div class="error-icon">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#dc3545" stroke-width="2" fill="none"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Error Message -->
        <h1 class="error-title">Access Denied</h1>

        <div class="error-message">
          <p class="primary-message">
            You don't have permission to access this resource.
          </p>

          <div class="secondary-message" *ngIf="!isAuthenticated">
            <p>Please log in to continue.</p>
          </div>

          <div class="secondary-message" *ngIf="isAuthenticated && !hasRequiredRole">
            <p>This area is restricted to {{ requiredRole || 'authorized' }} users only.</p>
            <p *ngIf="currentUser">
              <strong>Your current role:</strong>
              <span class="user-roles">{{ currentUser.roles.join(', ') }}</span>
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">

          <!-- Not authenticated - show login button -->
          <button
            *ngIf="!isAuthenticated"
            class="btn btn-primary"
            (click)="navigateToLogin()"
            type="button">
            <i class="icon-login" aria-hidden="true"></i>
            Sign In
          </button>

          <!-- Authenticated - show navigation options -->
          <div *ngIf="isAuthenticated" class="authenticated-actions">
            <button
              class="btn btn-secondary"
              (click)="goBack()"
              type="button">
              <i class="icon-back" aria-hidden="true"></i>
              Go Back
            </button>

            <button
              class="btn btn-primary"
              (click)="navigateToMain()"
              type="button">
              <i class="icon-home" aria-hidden="true"></i>
              Home
            </button>

            <button
              *ngIf="!isAdmin"
              class="btn btn-outline"
              (click)="requestAccess()"
              type="button">
              <i class="icon-request" aria-hidden="true"></i>
              Request Access
            </button>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="additional-info">
          <details class="help-details">
            <summary>Why am I seeing this?</summary>
            <div class="help-content">
              <ul>
                <li *ngIf="!isAuthenticated">You need to be signed in to access this resource.</li>
                <li *ngIf="isAuthenticated && !hasRequiredRole">
                  This resource requires {{ requiredRole || 'higher' }} privileges than your current account has.
                </li>
                <li>If you believe this is an error, please contact your administrator.</li>
                <li>Make sure you're using the correct account for your intended access level.</li>
              </ul>
            </div>
          </details>
        </div>

        <!-- Contact Information -->
        <div class="contact-info" *ngIf="showContactInfo">
          <p class="contact-text">
            Need help? Contact support at
            <a href="mailto:support@flowerbouquet.com" class="contact-link">
              rigani.jegatheeswaran&#64;bbzbl-it.ch
            </a>
          </p>
        </div>

        <!-- Debug Information (only in development) -->
        <div class="debug-info" *ngIf="isDevelopment">
          <details>
            <summary>Debug Information</summary>
            <div class="debug-content">
              <p><strong>Attempted URL:</strong> {{ attemptedUrl }}</p>
              <p><strong>User Authenticated:</strong> {{ isAuthenticated }}</p>
              <p><strong>User ID:</strong> {{ currentUser?.id || 'None' }}</p>
              <p><strong>User Roles:</strong> {{ currentUser?.roles?.join(', ') || 'None' }}</p>
              <p><strong>Required Role:</strong> {{ requiredRole || 'Unknown' }}</p>
              <p><strong>Is Admin:</strong> {{ isAdmin }}</p>
              <p><strong>Timestamp:</strong> {{ errorTimestamp }}</p>
            </div>
          </details>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./unauthorized.component.css']
})
export class UnauthorizedComponent implements OnInit {

  isAuthenticated = false;
  currentUser: any = null;
  isAdmin = false;
  hasRequiredRole = false;
  requiredRole: string | null = null;
  attemptedUrl = '';
  errorTimestamp = new Date().toISOString();
  isDevelopment = false;
  showContactInfo = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Initialize component state and gather user information.
   */
  private initializeComponent(): void {
    // Check if we're in development mode
    this.isDevelopment = !environment.production;

    // Get authentication state
    this.authService.authState$.subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentUser = state.user;
      this.isAdmin = this.authService.isAdmin();
    });

    // Get route parameters
    this.route.queryParams.subscribe(params => {
      this.requiredRole = params['requiredRole'] || null;
      this.attemptedUrl = params['url'] || this.router.url;
    });

    // Check if user has required role
    if (this.requiredRole && this.currentUser) {
      this.hasRequiredRole = this.authService.hasRole(this.requiredRole);
    }

    // Log unauthorized access attempt (for security monitoring)
    this.logUnauthorizedAccess();
  }

  /**
   * Navigate to login page with return URL.
   */
  navigateToLogin(): void {
    const returnUrl = this.attemptedUrl || this.router.url;
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl,
        message: 'Please sign in to access this resource'
      }
    });
  }

  /**
   * Navigate to main/home page.
   */
  navigateToMain(): void {
    this.router.navigate(['/main']);
  }

  /**
   * Go back to previous page.
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * Request access from administrator.
   */
  requestAccess(): void {
    // This could open a modal, send an email, or navigate to a request form
    const subject = encodeURIComponent('Access Request for FlowerBouquet Application');
    const body = encodeURIComponent(
      `Hello,\n\n` +
      `I would like to request access to the following resource:\n` +
      `URL: ${this.attemptedUrl}\n` +
      `Required Role: ${this.requiredRole}\n\n` +
      `My current details:\n` +
      `Username: ${this.currentUser?.username}\n` +
      `Email: ${this.currentUser?.email}\n` +
      `Current Roles: ${this.currentUser?.roles?.join(', ')}\n\n` +
      `Please let me know what steps I need to take to gain access.\n\n` +
      `Thank you!`
    );

    window.open(`mailto:admin@flowerbouquet.com?subject=${subject}&body=${body}`);
  }

  /**
   * Log unauthorized access attempt for security monitoring.
   */
  private logUnauthorizedAccess(): void {
    const logData = {
      timestamp: this.errorTimestamp,
      attemptedUrl: this.attemptedUrl,
      userId: this.currentUser?.id || null,
      username: this.currentUser?.username || null,
      userRoles: this.currentUser?.roles || [],
      requiredRole: this.requiredRole,
      isAuthenticated: this.isAuthenticated,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    // In development, log to console
    if (this.isDevelopment) {
      console.warn('Unauthorized access attempt:', logData);
    }

    // In production, you might want to send this to your logging service
    // this.loggingService.logSecurityEvent('unauthorized_access', logData);
  }

  /**
   * Get appropriate icon class based on authentication state.
   */
  getIconClass(): string {
    if (!this.isAuthenticated) {
      return 'icon-lock';
    } else if (this.isAuthenticated && !this.hasRequiredRole) {
      return 'icon-shield';
    } else {
      return 'icon-error';
    }
  }

  /**
   * Get dynamic title based on user state.
   */
  getTitle(): string {
    if (!this.isAuthenticated) {
      return 'Authentication Required';
    } else if (this.isAuthenticated && !this.hasRequiredRole) {
      return 'Insufficient Privileges';
    } else {
      return 'Access Denied';
    }
  }

  /**
   * Check if user can potentially get access (not already admin).
   */
  canRequestAccess(): boolean {
    return this.isAuthenticated && !this.isAdmin && this.requiredRole !== 'ROLE_ADMIN';
  }
}

// Add environment import (you'll need to import this in your actual file)
declare const environment: any;
