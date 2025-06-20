import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { PermissionService } from '../service/permission.service';

@Directive({
  selector: '[appRoleBasedDisplay]'
})
export class RoleBasedDisplayDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appRoleBasedDisplay(roles: string | string[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  @Input() set appRoleBasedDisplayFeature(feature: string) {
    this.requiredFeature = feature;
    this.updateView();
  }

  @Input() set appRoleBasedDisplayAction(action: string) {
    this.requiredAction = action;
    this.updateView();
  }

  private requiredRoles: string[] = [];
  private requiredFeature?: string;
  private requiredAction?: string;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const shouldShow = this.checkPermissions();

    if (shouldShow && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!shouldShow && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermissions(): boolean {
    if (!this.authService.isAuthenticated()) {
      return false;
    }

    // Check role-based permissions
    if (this.requiredRoles.length > 0) {
      const hasRequiredRole = this.authService.hasAnyRole(this.requiredRoles);
      if (!hasRequiredRole) return false;
    }

    // Check feature-based permissions
    if (this.requiredFeature) {
      const canViewFeature = this.permissionService.canView(this.requiredFeature);
      if (!canViewFeature) return false;
    }

    // Check action-based permissions
    if (this.requiredAction) {
      const canPerformAction = this.permissionService.canPerform(this.requiredAction);
      if (!canPerformAction) return false;
    }

    return true;
  }
}
