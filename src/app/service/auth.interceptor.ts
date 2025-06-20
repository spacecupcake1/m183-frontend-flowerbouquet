import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add credentials to all requests for session-based auth
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      withCredentials: true
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle different types of errors
        if (error.status === 401) {
          // Unauthorized - clear auth state and redirect to login
          this.handleUnauthorized();
        } else if (error.status === 403) {
          // Forbidden - redirect to unauthorized page
          this.handleForbidden();
        } else if (error.status === 429) {
          // Too many requests - show rate limit message
          this.handleRateLimit(error);
        } else if (error.status === 0) {
          // Network error - possibly CORS or server down
          this.handleNetworkError();
        }

        return throwError(() => error);
      })
    );
  }

  private handleUnauthorized(): void {
    this.authService.clearAuthState();
    this.router.navigate(['/login'], {
      queryParams: { message: 'Your session has expired. Please log in again.' }
    });
  }

  private handleForbidden(): void {
    this.router.navigate(['/unauthorized']);
  }

  private handleRateLimit(error: HttpErrorResponse): void {
    const message = error.error?.message || 'Too many requests. Please try again later.';
    // You can show a toast/notification here
    console.warn('Rate limit exceeded:', message);
  }

  private handleNetworkError(): void {
    // Handle network/CORS errors
    console.error('Network error - check server connection');
  }
}
