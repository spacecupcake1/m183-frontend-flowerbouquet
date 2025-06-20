import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem, FlowerService } from 'src/app/service/flower.service';

@Component({
  selector: 'app-customicing',
  templateUrl: './customicing.component.html',
  styleUrls: ['./customicing.component.css']
})
export class CustomicingComponent implements OnInit {
  cartItems: CartItem[] = [];
  isLoading = false;
  error = '';
  totalPrice = 0;

  constructor(
    private flowerService: FlowerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCartItems();
  }

  loadCartItems(): void {
    this.isLoading = true;
    this.error = '';

    this.flowerService.getCartItems().subscribe({
      next: (items) => {
        this.cartItems = items;
        this.calculateTotal();
        this.isLoading = false;
        console.log('Cart items loaded:', this.cartItems);
      },
      error: (error) => {
        console.error('Error loading cart items:', error);
        this.error = 'Failed to load your bouquet items';
        this.isLoading = false;
      }
    });
  }

  increaseQuantity(item: CartItem): void {
    const newQuantity = item.quantity + 1;
    this.updateQuantity(item, newQuantity);
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      this.updateQuantity(item, newQuantity);
    } else {
      this.removeItem(item);
    }
  }

  private updateQuantity(item: CartItem, newQuantity: number): void {
    this.flowerService.updateCartItemQuantity(item.flower.id!, newQuantity).subscribe({
      next: () => {
        item.quantity = newQuantity;
        this.calculateTotal();
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        this.error = 'Failed to update quantity';
      }
    });
  }

  removeItem(item: CartItem): void {
    if (confirm(`Remove ${item.flower.name} from your bouquet?`)) {
      this.flowerService.removeFromCart(item.flower.id!).subscribe({
        next: () => {
          this.cartItems = this.cartItems.filter(cartItem => cartItem.flower.id !== item.flower.id);
          this.calculateTotal();
        },
        error: (error) => {
          console.error('Error removing item:', error);
          this.error = 'Failed to remove item';
        }
      });
    }
  }

  clearCart(): void {
    if (confirm('Clear all items from your bouquet?')) {
      this.flowerService.clearCart().subscribe({
        next: () => {
          this.cartItems = [];
          this.calculateTotal();
        },
        error: (error) => {
          console.error('Error clearing cart:', error);
          this.error = 'Failed to clear cart';
        }
      });
    }
  }

  private calculateTotal(): void {
    this.totalPrice = this.cartItems.reduce((total, item) => {
      return total + (item.flower.price * item.quantity);
    }, 0);
  }

  getItemSubtotal(item: CartItem): number {
    return item.flower.price * item.quantity;
  }

  getTotalQuantity(): number {
    let total = 0;
    for (let item of this.cartItems) {
      total += item.quantity;
    }
    return total;
  }

  continueShopping(): void {
    this.router.navigate(['/main']);
  }

  checkout(): void {
    if (this.cartItems.length === 0) {
      alert('Your bouquet is empty. Add some flowers first!');
      return;
    }

    console.log('Proceeding to checkout with items:', this.cartItems);
    this.router.navigate(['/checkout']);
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/default-flower.jpg';
    if (imageUrl.startsWith('images/')) {
      return `assets/${imageUrl}`;
    }
    return imageUrl;
  }

  onImageError(event: any): void {
    if (event.target) {
      event.target.src = 'assets/images/default-flower.jpg';
    }
  }

  trackByFlowerId(index: number, item: CartItem): number {
    return item.flower.id || index;
  }
}
