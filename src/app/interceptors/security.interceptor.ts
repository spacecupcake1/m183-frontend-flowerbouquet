import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    // Add security headers
    const secureRequest = request.clone({
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    return next.handle(secureRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle security-related errors
        if (error.status === 401) {
          // Unauthorized - clear auth and redirect to login
          this.authService.clearAuthState();
          this.router.navigate(['/login'], {
            queryParams: { message: 'Session expired. Please log in again.' }
          });
        } else if (error.status === 403) {
          // Forbidden - redirect to unauthorized page
          this.router.navigate(['/unauthorized']);
        } else if (error.status === 429) {
          // Rate limited
          console.warn('Rate limit exceeded. Please try again later.');
        }

        return throwError(() => error);
      })
    );
  }
}
