import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Flexible role-based route guard that can check for specific roles or permissions.
 * Can be configured via route data to check for different roles on different routes.
 *
 * Usage in routing:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [RoleGuard],
 *   data: {
 *     roles: ['ROLE_ADMIN'],
 *     requireAll: false,
 *     redirectTo: '/unauthorized'
 *   }
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.authState$.pipe(
      map(authState => {
        // Check if user is authenticated
        if (!authState.isAuthenticated || !authState.user) {
          this.handleUnauthorized(state.url, 'Authentication required');
          return false;
        }

        // Get role requirements from route data
        const routeData = route.data;
        const requiredRoles: string[] = routeData['roles'] || [];
        const requireAll: boolean = routeData['requireAll'] || false;
        const allowedRoles: string[] = routeData['allowedRoles'] || [];
        const deniedRoles: string[] = routeData['deniedRoles'] || [];
        const customCheck: string = routeData['customCheck'];

        // If no specific role requirements, just check authentication
        if (requiredRoles.length === 0 && allowedRoles.length === 0 && !customCheck) {
          return true;
        }

        const user = authState.user;
        const userRoles = user.roles || [];

        // Check denied roles first (if user has any denied role, block access)
        if (deniedRoles.length > 0) {
          const hasDeniedRole = deniedRoles.some(role => userRoles.includes(role));
          if (hasDeniedRole) {
            this.handleUnauthorized(state.url, `Access denied for role`, deniedRoles[0]);
            return false;
          }
        }

        // Check required roles
        if (requiredRoles.length > 0) {
          const hasRequiredRole = requireAll
            ? requiredRoles.every(role => userRoles.includes(role))
            : requiredRoles.some(role => userRoles.includes(role));

          if (!hasRequiredRole) {
            this.handleUnauthorized(state.url, 'Insufficient privileges', requiredRoles[0]);
            return false;
          }
        }

        // Check allowed roles (alternative to required roles)
        if (allowedRoles.length > 0) {
          const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
          if (!hasAllowedRole) {
            this.handleUnauthorized(state.url, 'Role not permitted', allowedRoles[0]);
            return false;
          }
        }

        // Custom role checks
        if (customCheck) {
          const customResult = this.performCustomCheck(customCheck, user, route);
          if (!customResult) {
            this.handleUnauthorized(state.url, 'Custom authorization failed');
            return false;
          }
        }

        return true;
      }),
      catchError(error => {
        console.error('Role guard error:', error);
        this.handleUnauthorized(state.url, 'Authorization check failed');
        return of(false);
      })
    );
  }

  /**
   * Handle unauthorized access by redirecting to appropriate page.
   */
  private handleUnauthorized(attemptedUrl: string, reason: string, requiredRole?: string): void {
    const redirectTo = this.getRedirectUrl();

    this.router.navigate([redirectTo], {
      queryParams: {
        url: attemptedUrl,
        reason: reason,
        requiredRole: requiredRole,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Get redirect URL based on authentication state.
   */
  private getRedirectUrl(): string {
    const isAuthenticated = this.authService.isAuthenticated();

    if (!isAuthenticated) {
      return '/login';
    } else {
      return '/unauthorized';
    }
  }

  /**
   * Perform custom authorization checks.
   */
  private performCustomCheck(checkType: string, user: any, route: ActivatedRouteSnapshot): boolean {
    switch (checkType) {
      case 'ownResource':
        return this.checkOwnResource(user, route);

      case 'adminOrOwner':
        return this.checkAdminOrOwner(user, route);

      case 'activeUser':
        return this.checkActiveUser(user);

      case 'emailVerified':
        return this.checkEmailVerified(user);

      default:
        console.warn(`Unknown custom check type: ${checkType}`);
        return false;
    }
  }

  /**
   * Check if user is accessing their own resource.
   */
  private checkOwnResource(user: any, route: ActivatedRouteSnapshot): boolean {
    const userId = route.params['id'] || route.params['userId'];
    return userId && parseInt(userId) === user.id;
  }

  /**
   * Check if user is admin or accessing their own resource.
   */
  private checkAdminOrOwner(user: any, route: ActivatedRouteSnapshot): boolean {
    const isAdmin = user.roles?.includes('ROLE_ADMIN') || false;
    const isOwner = this.checkOwnResource(user, route);
    return isAdmin || isOwner;
  }

  /**
   * Check if user account is active.
   */
  private checkActiveUser(user: any): boolean {
    return user.active !== false && user.enabled !== false;
  }

  /**
   * Check if user email is verified.
   */
  private checkEmailVerified(user: any): boolean {
    return user.emailVerified === true;
  }
}

/**
 * Admin-only guard - shorthand for admin role requirement.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminOnlyGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.authState$.pipe(
      map(authState => {
        if (!authState.isAuthenticated || !authState.user) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        const hasAdminRole = authState.user.roles?.includes('ROLE_ADMIN') || false;

        if (!hasAdminRole) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}

/**
 * Moderator or Admin guard - allows both moderators and admins.
 */
@Injectable({
  providedIn: 'root'
})
export class ModeratorGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.authState$.pipe(
      map(authState => {
        if (!authState.isAuthenticated || !authState.user) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        const hasModeratorRole = authState.user.roles?.some(role =>
          role === 'ROLE_MODERATOR' || role === 'ROLE_ADMIN'
        ) || false;

        if (!hasModeratorRole) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}

/**
 * Owner or Admin guard - allows access to own resources or admin.
 */
@Injectable({
  providedIn: 'root'
})
export class OwnerOrAdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.authState$.pipe(
      map(authState => {
        if (!authState.isAuthenticated || !authState.user) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        const user = authState.user;
        const isAdmin = user.roles?.includes('ROLE_ADMIN') || false;

        if (isAdmin) {
          return true;
        }

        // Check if user is the owner of the resource
        const resourceUserId = route.params['id'] || route.params['userId'];
        if (resourceUserId && user.id && user.id.toString() === resourceUserId) {
          return true;
        }

        this.router.navigate(['/unauthorized']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}

/**
 * Utility service for role-based UI controls.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(private authService: AuthService) {}

  /**
   * Check if current user has a specific role.
   */
  hasRole(role: string): boolean {
    return this.hasAnyRole([role]);
  }

  /**
   * Check if current user has any of the specified roles.
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.authService.getCurrentUserSync();
    if (!user || !user.roles) {
      return false;
    }
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Check if current user has all of the specified roles.
   */
  hasAllRoles(roles: string[]): boolean {
    const user = this.authService.getCurrentUserSync();
    if (!user || !user.roles) {
      return false;
    }
    return roles.every(role => user.roles.includes(role));
  }

  /**
   * Check if current user can access a resource.
   */
  canAccess(requirements: {
    roles?: string[];
    requireAll?: boolean;
    allowedRoles?: string[];
    deniedRoles?: string[];
    customCheck?: string;
  }): boolean {
    const user = this.authService.getCurrentUserSync();
    if (!user) return false;

    const userRoles = user.roles || [];

    // Check denied roles
    if (requirements.deniedRoles?.length) {
      const hasDeniedRole = requirements.deniedRoles.some(role => userRoles.includes(role));
      if (hasDeniedRole) return false;
    }

    // Check required roles
    if (requirements.roles?.length) {
      const hasRequiredRole = requirements.requireAll
        ? requirements.roles.every(role => userRoles.includes(role))
        : requirements.roles.some(role => userRoles.includes(role));
      if (!hasRequiredRole) return false;
    }

    // Check allowed roles
    if (requirements.allowedRoles?.length) {
      const hasAllowedRole = requirements.allowedRoles.some(role => userRoles.includes(role));
      if (!hasAllowedRole) return false;
    }

    return true;
  }

  /**
   * Get user's highest privilege level (for UI display).
   */
  getUserPrivilegeLevel(): 'admin' | 'moderator' | 'user' | 'guest' {
    const user = this.authService.getCurrentUserSync();
    if (!user) return 'guest';

    if (user.roles?.includes('ROLE_ADMIN')) return 'admin';
    if (user.roles?.includes('ROLE_MODERATOR')) return 'moderator';
    return 'user';
  }

  /**
   * Check if user can perform specific action.
   */
  canPerformAction(action: string, resource?: any): boolean {
    const user = this.authService.getCurrentUserSync();
    if (!user) return false;

    switch (action) {
      case 'create_user':
        return user.roles?.includes('ROLE_ADMIN') || false;

      case 'edit_user':
        return user.roles?.includes('ROLE_ADMIN') ||
               (resource && resource.id === user.id);

      case 'delete_user':
        return user.roles?.includes('ROLE_ADMIN') &&
               resource && resource.id !== user.id; // Can't delete own account

      case 'manage_roles':
        return user.roles?.includes('ROLE_ADMIN') || false;

      case 'view_admin_panel':
        return user.roles?.includes('ROLE_ADMIN') || false;

      case 'moderate_content':
        return user.roles?.includes('ROLE_ADMIN') ||
               user.roles?.includes('ROLE_MODERATOR') || false;

      default:
        return false;
    }
  }
}
