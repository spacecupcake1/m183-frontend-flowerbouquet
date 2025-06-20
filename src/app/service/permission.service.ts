import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(private authService: AuthService) {}

  /**
   * Check if user can view a specific feature
   */
  canView(feature: string): boolean {
    const user = this.authService.getCurrentUserValue();
    if (!user) return false;

    switch (feature) {
      case 'admin-panel':
      case 'flower-management':
      case 'user-management':
        return this.authService.hasRole('ROLE_ADMIN');

      case 'flower-catalog':
      case 'shopping-cart':
        return this.authService.isAuthenticated();

      default:
        return false;
    }
  }

  /**
   * Check if user can perform a specific action
   */
  canPerform(action: string): boolean {
    const user = this.authService.getCurrentUserValue();
    if (!user) return false;

    switch (action) {
      case 'create-flower':
      case 'edit-flower':
      case 'delete-flower':
      case 'manage-users':
        return this.authService.hasRole('ROLE_ADMIN');

      case 'view-flowers':
      case 'add-to-cart':
      case 'place-order':
        return this.authService.isAuthenticated();

      default:
        return false;
    }
  }

  /**
   * Get list of available actions for current user
   */
  getAvailableActions(): string[] {
    const actions: string[] = [];

    if (this.authService.isAuthenticated()) {
      actions.push('view-flowers', 'add-to-cart', 'place-order');
    }

    if (this.authService.hasRole('ROLE_ADMIN')) {
      actions.push('create-flower', 'edit-flower', 'delete-flower', 'manage-users');
    }

    return actions;
  }
}
