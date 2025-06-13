import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { UserService } from '../service/user.service';

/**
 * HTTP Interceptor for authentication and session management.
 * Automatically handles authentication headers, session cookies, and error responses.
 * Provides centralized authentication error handling and automatic logout on session expiry.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  /**
   * Intercepts HTTP requests to add authentication headers and handle errors.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request to add authentication headers
    const authReq = this.addAuthenticationHeaders(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, req, next))
    );
  }

  /**
   * Adds authentication headers to the request.
   */
  private addAuthenticationHeaders(req: HttpRequest<any>): HttpRequest<any> {
    // Clone the request to modify headers
    let authReq = req.clone();

    // Always include credentials for session-based authentication
    authReq = authReq.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      },
      withCredentials: true // Important for session cookies
    });

    // Add security headers to prevent common attacks
    authReq = authReq.clone({
      setHeaders: {
        ...authReq.headers.keys().reduce((headers, key) => {
          headers[key] = authReq.headers.get(key)!;
          return headers;
        }, {} as any),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });

    // Add CSRF token if available (for environments that use CSRF tokens)
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      authReq = authReq.clone({
        setHeaders: {
          'X-CSRF-TOKEN': csrfToken
        }
      });
    }

    return authReq;
  }

  /**
   * Handles HTTP errors, especially authentication-related errors.
   */
  private handleError(error: HttpErrorResponse, originalReq: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // Log error for debugging (remove in production or use proper logging)
    console.error('HTTP Error:', error);

    if (error.status === 401) {
      // Unauthorized - handle authentication errors
      return this.handle401Error(error, originalReq, next);
    } else if (error.status === 403) {
      // Forbidden - handle authorization errors
      return this.handle403Error(error);
    } else if (error.status === 419) {
      // CSRF token mismatch (Laravel convention, adapt as needed)
      return this.handleCsrfError(error, originalReq, next);
    } else if (error.status === 429) {
      // Too many requests - rate limiting
      return this.handle429Error(error);
    } else if (error.status >= 500) {
      // Server errors
      return this.handleServerError(error);
    }

    // For other errors, just pass them through
    return throwError(() => error);
  }

  /**
   * Handles 401 Unauthorized errors.
   */
  private handle401Error(error: HttpErrorResponse, originalReq: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if this is a login request that failed
    if (originalReq.url.includes('/login')) {
      // Don't redirect on login failures, let the component handle it
      return throwError(() => error);
    }

    // Check if this is a registration request
    if (originalReq.url.includes('/register')) {
      return throwError(() => error);
    }

    // For other requests, the session might have expired
    console.warn('Session expired or authentication required');

    // Clear user session
    this.userService.clearUserSession();

    // Redirect to login with return URL
    const returnUrl = this.router.url;
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl,
        message: 'Your session has expired. Please log in again.'
      }
    });

    return throwError(() => error);
  }

  /**
   * Handles 403 Forbidden errors.
   */
  private handle403Error(error: HttpErrorResponse): Observable<HttpEvent<any>> {
    console.warn('Access denied - insufficient permissions');

    // Show user-friendly error message
    this.showErrorMessage('Access denied. You do not have permission to access this resource.');

    // Optionally redirect to unauthorized page
    this.router.navigate(['/unauthorized']);

    return throwError(() => error);
  }

  /**
   * Handles CSRF token errors.
   */
  private handleCsrfError(error: HttpErrorResponse, originalReq: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.warn('CSRF token error - refreshing token');

    // Try to refresh CSRF token and retry the request
    return this.refreshCsrfToken().pipe(
      switchMap(() => {
        // Retry the original request with new CSRF token
        const retryReq = this.addAuthenticationHeaders(originalReq);
        return next.handle(retryReq);
      }),
      catchError((retryError) => {
        // If retry fails, handle as authentication error
        return this.handle401Error(retryError, originalReq, next);
      })
    );
  }

  /**
   * Handles 429 Too Many Requests errors.
   */
  private handle429Error(error: HttpErrorResponse): Observable<HttpEvent<any>> {
    console.warn('Rate limit exceeded');

    // Extract retry-after header if available
    const retryAfter = error.headers.get('Retry-After');
    const message = retryAfter
      ? `Too many requests. Please wait ${retryAfter} seconds before trying again.`
      : 'Too many requests. Please wait a moment before trying again.';

    this.showErrorMessage(message);

    return throwError(() => error);
  }

  /**
   * Handles server errors (5xx).
   */
  private handleServerError(error: HttpErrorResponse): Observable<HttpEvent<any>> {
    console.error('Server error:', error);

    this.showErrorMessage('A server error occurred. Please try again later.');

    return throwError(() => error);
  }

  /**
   * Gets CSRF token from meta tag or cookie.
   */
  private getCsrfToken(): string | null {
    // Try to get CSRF token from meta tag (if using Laravel or similar)
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (metaTag) {
      return metaTag.content;
    }

    // Try to get CSRF token from cookie
    const cookieValue = this.getCookie('XSRF-TOKEN');
    if (cookieValue) {
      return decodeURIComponent(cookieValue);
    }

    return null;
  }

  /**
   * Refreshes CSRF token.
   */
  private refreshCsrfToken(): Observable<any> {
    // Implementation depends on your backend
    // This is a placeholder that returns an empty observable
    return new Observable(observer => {
      // Refresh CSRF token logic here
      observer.next();
      observer.complete();
    });
  }

  /**
   * Gets cookie value by name.
   */
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Shows error message to user (implement based on your notification system).
   */
  private showErrorMessage(message: string): void {
    // Implementation depends on your notification system
    // This could use a toast service, alert, or notification component
    console.error('User Error:', message);

    // Example: Using alert (replace with proper notification system)
    // alert(message);

    // Example: Using a toast service
    // this.toastService.error(message);
  }

  /**
   * Clears user session data (called from UserService).
   */
  clearSession(): void {
    // Clear any client-side authentication data
    // This method can be called by UserService when needed

    // Clear localStorage items (if any)
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Clear sessionStorage items (if any)
    sessionStorage.clear();

    // Note: Session cookies are handled by the browser automatically
  }
}
