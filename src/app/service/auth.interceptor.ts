import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private injector: Injector // Use Injector to avoid circular dependency
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request to add credentials for session-based auth
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      },
      withCredentials: true // Important for session-based authentication
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle authentication errors without injecting AuthService directly
        if (error.status === 401) {
          console.warn('Authentication required - redirecting to login');
          this.router.navigate(['/login'], {
            queryParams: { message: 'Session expired. Please log in again.' }
          });
        } else if (error.status === 403) {
          console.warn('Access forbidden - redirecting to unauthorized');
          this.router.navigate(['/unauthorized']);
        }

        return throwError(error);
      })
    );
  }
}
