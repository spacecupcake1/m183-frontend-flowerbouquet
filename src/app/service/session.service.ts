import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { UserService } from "./user.service";

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private sessionTimeoutWarning$ = new Subject<void>();
  private sessionTimeout: any;
  private warningTimeout: any;

  constructor(private router: Router, private userService: UserService) {
    this.setupSessionMonitoring();
  }

  /**
   * Setup session monitoring and timeout warnings
   */
  private setupSessionMonitoring(): void {
    // Reset timeouts on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => this.resetSessionTimeout());
    });
  }

  /**
   * Reset session timeout
   */
  private resetSessionTimeout(): void {
    this.clearTimeouts();

    // Warning 5 minutes before expiry
    this.warningTimeout = setTimeout(() => {
      this.sessionTimeoutWarning$.next();
    }, 55 * 60 * 1000); // 55 minutes

    // Auto logout after 1 hour
    this.sessionTimeout = setTimeout(() => {
      this.handleSessionExpiry();
    }, 60 * 60 * 1000); // 60 minutes
  }

  /**
   * Handle session expiry
   */
  private handleSessionExpiry(): void {
    this.userService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login'], {
          queryParams: { message: 'Session expired. Please login again.' }
        });
      },
      error: () => {
        // Force logout even if request fails
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
  }

  /**
   * Extend session (call this on user activity)
   */
  extendSession(): void {
    this.resetSessionTimeout();
  }
}
