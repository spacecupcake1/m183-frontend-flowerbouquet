// src/app/service/flower.service.ts (Complete Version)
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Flower } from '../data/flower';

export interface FlowerStats {
  totalFlowers: number;
  availableFlowers: number;
  unavailableFlowers: number;
}

export interface BulkCreateResponse {
  message: string;
  created: number;
  flowers: Flower[];
}

@Injectable({
  providedIn: 'root'
})
export class FlowerService {
  readonly backendUrl = 'flowers';

  constructor(private http: HttpClient) {}

  /**
   * Get HTTP options with authentication
   */
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      withCredentials: true // Essential for session-based auth
    };
  }

  // ========== PUBLIC OPERATIONS ==========

  public getFlowers(): Observable<Flower[]> {
    return this.http.get<Flower[]>(
      environment.backendBaseUrl + this.backendUrl,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  public getFlower(id: number): Observable<Flower> {
    return this.http.get<Flower>(
      environment.backendBaseUrl + this.backendUrl + `/${id}`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  public searchFlowers(name: string): Observable<Flower[]> {
    return this.http.get<Flower[]>(
      environment.backendBaseUrl + this.backendUrl + `/search?name=${name}`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  public filterFlowers(availablity: string): Observable<Flower[]> {
    return this.http.get<Flower[]>(
      environment.backendBaseUrl + this.backendUrl + `/filter?availablity=${availablity}`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  // ========== USER CART OPERATIONS ==========

  addFlowerToTemp(flower: Flower): Observable<any> {
    return this.http.post(
      environment.backendBaseUrl + this.backendUrl + `/customize`,
      flower,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  getTempFlowers(): Observable<Flower[]> {
    return this.http.get<Flower[]>(
      environment.backendBaseUrl + this.backendUrl + `/customize`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  getFlowerBouquetPrice(): Observable<number> {
    return this.http.get<number>(
      environment.backendBaseUrl + this.backendUrl + `/customize/total-price`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  clearTempFlowers(): Observable<string> {
    return this.http.get<string>(
      environment.backendBaseUrl + this.backendUrl + `/customize/clear`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  // ========== ADMIN OPERATIONS (FIXED) ==========

  /**
   * Create a new flower (Admin only)
   */
  public createFlower(flower: Flower, userId: number): Observable<Flower> {
    const params = new HttpParams().set('userId', userId.toString());
    const options = {
      ...this.getHttpOptions(),
      params
    };

    return this.http.post<Flower>(
      environment.backendBaseUrl + this.backendUrl,
      flower,
      options
    ).pipe(catchError(this.handleError));
  }

  /**
   * Update an existing flower (Admin only)
   */
  public updateFlower(id: number, flower: Flower, userId: number): Observable<Flower> {
    const params = new HttpParams().set('userId', userId.toString());
    const options = {
      ...this.getHttpOptions(),
      params
    };

    return this.http.put<Flower>(
      environment.backendBaseUrl + this.backendUrl + `/${id}`,
      flower,
      options
    ).pipe(catchError(this.handleError));
  }

  /**
   * Delete a flower (Admin only)
   */
  public deleteFlower(id: number, userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId.toString());
    const options = {
      ...this.getHttpOptions(),
      params
    };

    return this.http.delete(
      environment.backendBaseUrl + this.backendUrl + `/${id}`,
      options
    ).pipe(catchError(this.handleError));
  }

  /**
   * Get flower statistics (Admin only)
   */
  public getFlowerStats(userId: number): Observable<FlowerStats> {
    const params = new HttpParams().set('userId', userId.toString());
    const options = {
      ...this.getHttpOptions(),
      params
    };

    return this.http.get<FlowerStats>(
      environment.backendBaseUrl + this.backendUrl + `/admin/stats`,
      options
    ).pipe(catchError(this.handleError));
  }

  /**
   * Bulk create flowers (Admin only)
   */
  public bulkCreateFlowers(flowers: Flower[], userId: number): Observable<BulkCreateResponse> {
    const params = new HttpParams().set('userId', userId.toString());
    const options = {
      ...this.getHttpOptions(),
      params
    };

    return this.http.post<BulkCreateResponse>(
      environment.backendBaseUrl + this.backendUrl + `/bulk`,
      flowers,
      options
    ).pipe(catchError(this.handleError));
  }

  // ========== ERROR HANDLING ==========

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

      // Log specific error details
      console.error('Server Error Details:', {
        status: error.status,
        statusText: error.statusText,
        error: error.error,
        url: error.url
      });
    }

    console.error('FlowerService Error:', errorMessage);
    return throwError(() => error);
  };
}
export { Flower };

