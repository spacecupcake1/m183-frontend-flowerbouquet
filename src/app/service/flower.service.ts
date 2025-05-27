import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Flower } from '../data/flower';


@Injectable({
  providedIn: 'root'
})

export class FlowerService {

  readonly backendUrl = 'flowers';

  constructor(private http: HttpClient) {
  }

  public getFlowers(): Observable<Flower[]> {
    return this.http.get<Flower[]>(environment.backendBaseUrl + this.backendUrl);
  }

  public getFlower(id: number): Observable<Flower> {
    return this.http.get<Flower>(environment.backendBaseUrl + this.backendUrl + `/${id}`);
  }

  public searchFlowers(name: string): Observable<Flower[]> {
    return this.http.get<Flower[]>(environment.backendBaseUrl + this.backendUrl + `/search?name=${name}`);
  }

  public filterFlowers(availablity: string): Observable<Flower[]> {
    return this.http.get<Flower[]>(environment.backendBaseUrl + this.backendUrl + `/filter?availablity=${availablity}`);
  }

  addFlowerToTemp(flower: Flower): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(environment.backendBaseUrl + this.backendUrl + `/customize`, flower, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(error);
  }

  getTempFlowers(): Observable<Flower[]> {
    return this.http.get<Flower[]>(environment.backendBaseUrl + this.backendUrl + `/customize`);
  }

  getFlowerBouquetPrice(): Observable<number> {
    return this.http.get<number>(environment.backendBaseUrl + this.backendUrl + `/customize/total-price`);
  }

  clearTempFlowers(): Observable<string> {
    return this.http.get<string>(environment.backendBaseUrl + this.backendUrl + `/customize/clear`);
  }
}
export { Flower };

