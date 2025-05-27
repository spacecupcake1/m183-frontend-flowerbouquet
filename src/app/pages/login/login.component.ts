import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user = { username: '', password: '' };

  constructor(private userService: UserService, private router: Router) {}

  onSubmit(loginForm: any): void {
    if (loginForm.valid) {
      this.userService.getLogin(this.user.username, this.user.password).subscribe(
        response => {
          // Handle successful login
          console.log(response);
          this.router.navigate(['main']);
        },
        error => {
          // Handle login error
          console.error('Login failed', error);
          alert('Invalid username or password');
        }
      );
    }
  }

  goRegister(): void {
    this.router.navigate(['/register']);
  }


}
