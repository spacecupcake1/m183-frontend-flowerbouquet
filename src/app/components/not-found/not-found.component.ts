import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>

        <div class="action-buttons">
          <button class="btn btn-primary" (click)="goHome()">
            <i class="fas fa-home"></i> Go Home
          </button>
          <button class="btn btn-secondary" (click)="goBack()">
            <i class="fas fa-arrow-left"></i> Go Back
          </button>
        </div>

        <div class="helpful-links">
          <h3>Try these instead:</h3>
          <ul>
            <li><a routerLink="/main">Home</a></li>
            <li><a routerLink="/login" *ngIf="!isAuthenticated">Login</a></li>
            <li><a routerLink="/profile" *ngIf="isAuthenticated">My Profile</a></li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .not-found-content {
      text-align: center;
      max-width: 500px;
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .error-code {
      font-size: 8rem;
      font-weight: bold;
      color: #e74c3c;
      line-height: 1;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 2rem;
    }

    p {
      color: #7f8c8d;
      margin-bottom: 30px;
      line-height: 1.6;
    }

    .action-buttons {
      margin-bottom: 30px;
    }

    .btn {
      padding: 12px 24px;
      margin: 0 10px;
      border: none;
      border-radius: 5px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background-color: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background-color: #2980b9;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background-color: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #7f8c8d;
      transform: translateY(-2px);
    }

    .helpful-links {
      border-top: 1px solid #ecf0f1;
      padding-top: 20px;
    }

    .helpful-links h3 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 1.2rem;
    }

    .helpful-links ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .helpful-links li {
      margin: 8px 0;
    }

    .helpful-links a {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .helpful-links a:hover {
      color: #2980b9;
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .not-found-content {
        padding: 30px 20px;
      }

      .error-code {
        font-size: 6rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .btn {
        display: block;
        margin: 10px 0;
        width: 100%;
      }
    }
  `]
})
export class NotFoundComponent {
  isAuthenticated = false;

  constructor(private router: Router) {
    // You can inject your AuthService here to check authentication status
    // this.isAuthenticated = this.authService.isAuthenticated();
  }

  goHome(): void {
    this.router.navigate(['/main']);
  }

  goBack(): void {
    window.history.back();
  }
}
