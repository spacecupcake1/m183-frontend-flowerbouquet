import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAdminAccess(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.canActivate(childRoute, state);
  }

  private checkAdminAccess(url: string): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
      return of(false);
    }

    // Check if user has admin role
    return this.authService.getCurrentUser().pipe(
      map((user) => {
        if (user && this.authService.hasRole('ROLE_ADMIN')) {
          return true;
        } else {
          // Redirect to unauthorized page or main page
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }),
      catchError(() => {
        this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
        return of(false);
      })
    );
  }
}
