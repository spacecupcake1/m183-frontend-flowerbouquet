import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class SessionInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone request and ensure credentials are included for session handling
    const sessionReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    return next.handle(sessionReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors
        if (error.status === 401 && !req.url.includes('/login') && !req.url.includes('/register')) {
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
