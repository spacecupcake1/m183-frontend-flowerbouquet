import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  onLogin(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.userService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);

        if (response.isAdmin) {
          alert(`Welcome back, Admin ${response.firstname}! You have administrative privileges.`);
        } else {
          alert(`Welcome back, ${response.firstname}!`);
        }

        this.router.navigate(['/main']);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = 'Invalid username or password';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToMain(): void {
    this.router.navigate(['/main']);
  }
}
