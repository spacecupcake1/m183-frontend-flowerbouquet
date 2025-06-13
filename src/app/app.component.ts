import { Component, OnInit } from '@angular/core';
import { AuthService } from './service/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <app-header></app-header>
    <main class="main-content" role="main">
      <router-outlet></router-outlet>
    </main>
    <div *ngIf="isLoading" class="global-loading">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  isLoading = false;
  title = 'Flower Bouquet';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Start automatic session refresh
    this.authService.startSessionRefresh(25); // Refresh every 25 minutes

    // Subscribe to loading state
    this.authService.isLoading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }
}
