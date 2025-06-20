import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAuthentication(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.canActivate(childRoute, state);
  }

  private checkAuthentication(url: string): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return of(true);
    }

    // Validate session with server
    return this.authService.validateSession().pipe(
      map((isValid) => {
        if (isValid) {
          return true;
        } else {
          this.authService.clearAuthState();
          this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
          return false;
        }
      }),
      catchError(() => {
        this.authService.clearAuthState();
        this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
        return of(false);
      })
    );
  }
}
