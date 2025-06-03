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

  constructor(private http: HttpClient) {
  }

  // ========== PUBLIC OPERATIONS ==========

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

  // ========== USER CART OPERATIONS ==========

  addFlowerToTemp(flower: Flower): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(environment.backendBaseUrl + this.backendUrl + `/customize`, flower, { headers })
      .pipe(
        catchError(this.handleError)
      );
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

  // ========== ADMIN OPERATIONS ==========

  /**
   * Create a new flower (Admin only)
   */
  public createFlower(flower: Flower, userId: number): Observable<Flower> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams().set('userId', userId.toString());

    return this.http.post<Flower>(
      environment.backendBaseUrl + this.backendUrl,
      flower,
      { headers, params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing flower (Admin only)
   */
  public updateFlower(id: number, flower: Flower, userId: number): Observable<Flower> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams().set('userId', userId.toString());

    return this.http.put<Flower>(
      environment.backendBaseUrl + this.backendUrl + `/${id}`,
      flower,
      { headers, params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a flower (Admin only)
   */
  public deleteFlower(id: number, userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId.toString());

    return this.http.delete(
      environment.backendBaseUrl + this.backendUrl + `/${id}`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get flower statistics (Admin only)
   */
  public getFlowerStats(userId: number): Observable<FlowerStats> {
    const params = new HttpParams().set('userId', userId.toString());

    return this.http.get<FlowerStats>(
      environment.backendBaseUrl + this.backendUrl + `/admin/stats`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Bulk create flowers (Admin only)
   */
  public bulkCreateFlowers(flowers: Flower[], userId: number): Observable<BulkCreateResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams().set('userId', userId.toString());

    return this.http.post<BulkCreateResponse>(
      environment.backendBaseUrl + this.backendUrl + `/admin/bulk`,
      flowers,
      { headers, params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ========== ERROR HANDLING ==========

  private handleError(error: any) {
    console.error('An error occurred:', error);

    if (error.status === 403) {
      console.error('Access denied - Admin privileges required');
    } else if (error.status === 401) {
      console.error('Unauthorized - Please login');
    }

    return throwError(() => error);
  }
}

export { Flower };

