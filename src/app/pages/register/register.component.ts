import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/data/user';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})


export class RegisterComponent {
  user: User = new User();

  constructor(private userService: UserService,  private router: Router) {}

  onSubmit(registerForm: NgForm) {
    if (registerForm.valid) {
      this.userService.createUser(this.user).subscribe(
        response => {
          console.log('User registered successfully!', response);
          this.router.navigate(['/']);
        },
        error => {
          console.error('Error occurred while registering user', error);
        }
      );
    }
  }
}
