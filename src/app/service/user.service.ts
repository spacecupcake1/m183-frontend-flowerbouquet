import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginResponse, User } from '../data/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  readonly backendUrl = 'users';
  private loginUrl = 'http://localhost:8080/api/users/login';

  // Current user state
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  public createUser(user: User): Observable<User> {
    return this.http.post<User>(environment.backendBaseUrl + this.backendUrl, user);
  }

  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(environment.backendBaseUrl + this.backendUrl);
  }

  public getUser(id: number): Observable<User> {
    return this.http.get<User>(environment.backendBaseUrl + this.backendUrl + `/${id}`);
  }

  public login(username: string, password: string): Observable<LoginResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<LoginResponse>(this.loginUrl, { username, password }, { headers })
      .pipe(
        tap(response => {
          if (response.message === 'Login successful') {
            // Create user object from login response
            const user: User = {
              id: response.userId,
              username: response.username,
              firstname: response.firstname,
              lastname: response.lastname,
              email: response.email,
              password: '', // Don't store password
              roles: response.roles,
              isAdmin: response.isAdmin
            };

            // Store user in localStorage and update current user
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
        })
      );
  }

  public logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  public isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isAdmin === true;
  }

  public getCurrentUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }

  public hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(roleName) === true;
  }
}

export { LoginResponse, User };

