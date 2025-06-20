import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';



@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="error-icon">🚫</div>
        <h1>Access Denied</h1>
        <p class="error-message">
          You don't have permission to access this resource.
        </p>

        <div class="user-info" *ngIf="authService.isAuthenticated()">
          <p>Logged in as: <strong>{{authService.getUserDisplayName()}}</strong></p>
          <p>Your roles: <span class="roles">{{getUserRoles()}}</span></p>
        </div>

        <div class="actions">
          <button (click)="goBack()" class="btn btn-secondary">
            ← Go Back
          </button>
          <button (click)="goHome()" class="btn btn-primary">
            🏠 Home
          </button>
          <button *ngIf="!authService.isAuthenticated()" (click)="login()" class="btn btn-success">
            🔐 Login
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      text-align: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .unauthorized-content {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 90%;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      color: #dc3545;
      margin-bottom: 1rem;
      font-size: 2.5rem;
    }

    .error-message {
      color: #6c757d;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }

    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      border-left: 4px solid #007bff;
    }

    .user-info p {
      margin: 0.5rem 0;
    }

    .roles {
      background: #e9ecef;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-primary {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
    }

    .btn-secondary {
      background: linear-gradient(135deg, #6c757d, #545b62);
      color: white;
    }

    .btn-success {
      background: linear-gradient(135deg, #28a745, #1e7e34);
      color: white;
    }

    @media (max-width: 600px) {
      .unauthorized-content {
        padding: 2rem;
      }

      .actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class UnauthorizedComponent {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    this.router.navigate(['/main']);
  }

  login(): void {
    // Get the attempted URL from query params if available
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/main';
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  getUserRoles(): string {
    const user = this.authService.getCurrentUserValue();
    return user?.roles?.join(', ') || 'No roles assigned';
  }
}

// src/app/data/user.ts - User interface for consistency
export interface User {
  userId: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  lastLogin?: string;
}
