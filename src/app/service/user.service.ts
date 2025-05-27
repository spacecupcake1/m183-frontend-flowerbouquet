import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../data/user';

@Injectable({
  providedIn: 'root'
})

export class UserService {
  readonly backendUrl = 'users';
  private loginUrl = 'http://localhost:8080/api/users/login';


  constructor(private http: HttpClient) {
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

  public getLogin(username: string, password: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(this.loginUrl, { username, password }, { headers, responseType: 'text' });
  }

}
export { User };


