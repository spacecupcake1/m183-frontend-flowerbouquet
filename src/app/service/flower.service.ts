import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Flower {
  id?: number;
  name: string;
  meaning: string;
  availablity: string; // Note: keeping original spelling from backend
  info: string;
  color: string;
  price: number;
  imageUrl: string;
}

export interface FlowerCreateRequest {
  name: string;
  meaning: string;
  availability: string; // Note: correct spelling for DTO
  info: string;
  color: string;
  price: number;
  imageUrl: string;
}

export interface FlowerSearchParams {
  name?: string;
  color?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FlowerService {
  private readonly baseUrl = 'http://localhost:8080/api/flowers';

  constructor(private http: HttpClient) { }

  /**
   * Get all flowers - requires authentication
   */
  getAllFlowers(): Observable<Flower[]> {
    return this.http.get<Flower[]>(this.baseUrl, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get flower by ID - requires authentication
   */
  getFlowerById(id: number): Observable<Flower> {
    return this.http.get<Flower>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search flowers by name - requires authentication
   */
  searchFlowersByName(name: string): Observable<Flower[]> {
    const params = new HttpParams().set('name', name);

    return this.http.get<Flower[]>(`${this.baseUrl}/search`, {
      params,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Advanced flower search - requires authentication
   */
  searchFlowers(searchParams: FlowerSearchParams): Observable<Flower[]> {
    let params = new HttpParams();

    if (searchParams.name) {
      params = params.set('name', searchParams.name);
    }
    if (searchParams.color) {
      params = params.set('color', searchParams.color);
    }
    if (searchParams.availability) {
      params = params.set('availability', searchParams.availability);
    }
    if (searchParams.minPrice !== undefined) {
      params = params.set('minPrice', searchParams.minPrice.toString());
    }
    if (searchParams.maxPrice !== undefined) {
      params = params.set('maxPrice', searchParams.maxPrice.toString());
    }

    return this.http.get<Flower[]>(`${this.baseUrl}/search`, {
      params,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get flowers by availability status - requires authentication
   */
  getFlowersByAvailability(status: 'Available' | 'Unavailable'): Observable<Flower[]> {
    return this.http.get<Flower[]>(`${this.baseUrl}/availability/${status}`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create new flower - ADMIN ONLY
   */
  createFlower(flower: FlowerCreateRequest): Observable<Flower> {
    return this.http.post<Flower>(this.baseUrl, flower, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update existing flower - ADMIN ONLY
   */
  updateFlower(id: number, flower: FlowerCreateRequest): Observable<Flower> {
    return this.http.put<Flower>(`${this.baseUrl}/${id}`, flower, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete flower - ADMIN ONLY
   */
  deleteFlower(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get available colors for filtering
   */
  getAvailableColors(): Observable<string[]> {
    return this.getAllFlowers().pipe(
      map(flowers => {
        const colors = flowers.map(f => f.color);
        return [...new Set(colors)].sort();
      })
    );
  }

  /**
   * Get price range for filtering
   */
  getPriceRange(): Observable<{min: number, max: number}> {
    return this.getAllFlowers().pipe(
      map(flowers => {
        const prices = flowers.map(f => f.price);
        return {
          min: Math.min(...prices),
          max: Math.max(...prices)
        };
      })
    );
  }

    getFlower(id: number): Observable<Flower> {
    return this.getFlowerById(id);
  }

  getTempFlowers(): Observable<Flower[]> {
    return this.getAllFlowers();
  }

  addFlowerToTemp(flower: Flower): Observable<any> {
    return new Observable(observer => {
      observer.next({ success: true, message: 'Added to cart' });
      observer.complete();
    });
  }

  getFlowerStats(userId?: number): Observable<any> {
    return this.getFlowerStatistics();
  }

  /**
   * Get flower statistics (for admin dashboard)
   */
  getFlowerStatistics(): Observable<any> {
    return this.getAllFlowers().pipe(
      map(flowers => {
        const total = flowers.length;
        const available = flowers.filter(f => f.availablity === 'Available').length;
        const unavailable = flowers.filter(f => f.availablity === 'Unavailable').length;

        const colorCounts = flowers.reduce((acc, flower) => {
          acc[flower.color] = (acc[flower.color] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});

        const averagePrice = flowers.reduce((sum, f) => sum + f.price, 0) / total;

        return {
          total,
          available,
          unavailable,
          availabilityPercentage: total > 0 ? (available / total) * 100 : 0,
          colorDistribution: colorCounts,
          averagePrice: Number(averagePrice.toFixed(2)),
          priceRange: {
            min: Math.min(...flowers.map(f => f.price)),
            max: Math.max(...flowers.map(f => f.price))
          }
        };
      })
    );
  }

  /**
   * Validate flower data before sending to server
   */
  validateFlowerData(flower: FlowerCreateRequest): string[] {
    const errors: string[] = [];

    if (!flower.name || flower.name.trim().length < 2) {
      errors.push('Flower name must be at least 2 characters long');
    }

    if (!flower.meaning || flower.meaning.trim().length < 5) {
      errors.push('Flower meaning must be at least 5 characters long');
    }

    if (!flower.info || flower.info.trim().length < 10) {
      errors.push('Flower information must be at least 10 characters long');
    }

    if (!flower.color || flower.color.trim().length < 2) {
      errors.push('Flower color must be specified');
    }

    if (!flower.price || flower.price < 1 || flower.price > 9999) {
      errors.push('Price must be between 1 and 9999');
    }

    if (!flower.imageUrl || flower.imageUrl.trim().length === 0) {
      errors.push('Image URL is required');
    }

    if (!flower.availability || !['Available', 'Unavailable'].includes(flower.availability)) {
      errors.push('Availability must be either Available or Unavailable');
    }

    // Basic XSS check (additional to server-side validation)
    const xssPattern = /<script|javascript:|on\w+\s*=/i;
    const fields = [flower.name, flower.meaning, flower.info, flower.color, flower.imageUrl];

    if (fields.some(field => field && xssPattern.test(field))) {
      errors.push('Input contains potentially dangerous content');
    }

    return errors;
  }

  /**
   * Convert FlowerCreateRequest to match backend DTO
   */
  private mapToBackendFormat(flower: FlowerCreateRequest): any {
    return {
      name: flower.name.trim(),
      meaning: flower.meaning.trim(),
      availability: flower.availability, // Backend expects 'availability'
      info: flower.info.trim(),
      color: flower.color.trim(),
      price: flower.price,
      imageUrl: flower.imageUrl.trim()
    };
  }

  /**
   * Handle HTTP errors with user-friendly messages
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          if (error.error?.details) {
            // Validation errors from server
            const details = error.error.details;
            errorMessage = Object.values(details).join(', ');
          } else {
            errorMessage = error.error?.error || error.error?.message || 'Invalid request';
          }
          break;
        case 401:
          errorMessage = 'You need to be logged in to perform this action';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action';
          break;
        case 404:
          errorMessage = 'Flower not found';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 0:
          errorMessage = 'Unable to connect to server. Please check your connection.';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Flower Service Error:', error);
    return throwError(() => ({
      ...error,
      userMessage: errorMessage
    }));
  };
}

// Utility functions for flower operations
export class FlowerUtils {

  /**
   * Format price for display
   */
  static formatPrice(price: number): string {
    return `CHF ${price.toFixed(2)}`;
  }

  /**
   * Get availability display text
   */
  static getAvailabilityText(availability: string): string {
    return availability === 'Available' ? 'In Stock' : 'Out of Stock';
  }

  /**
   * Get availability CSS class
   */
  static getAvailabilityClass(availability: string): string {
    return availability === 'Available' ? 'available' : 'unavailable';
  }

  /**
   * Truncate text for display
   */
  static truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if image URL is valid
   */
  static isValidImageUrl(url: string): boolean {
    const imagePattern = /\.(jpg|jpeg|png|gif|webp)$/i;
    return imagePattern.test(url) || url.startsWith('data:image/');
  }

  /**
   * Generate flower slug for URLs
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
