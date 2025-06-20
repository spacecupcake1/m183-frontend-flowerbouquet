import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem, FlowerService } from 'src/app/service/flower.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  deliveryOption: string = '';
  isLoading = false;
  error = '';

  customerInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  };

  constructor(
    private flowerService: FlowerService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loadCartItems();
  }

  loadCartItems(): void {
    this.isLoading = true;
    this.error = '';

    this.flowerService.getCartItems().subscribe({
      next: (items) => {
        this.cartItems = items;
        this.calculateTotalPrice();
        this.isLoading = false;

        if (this.cartItems.length === 0) {
          alert('Your bouquet is empty. Please add some flowers first.');
          this.router.navigate(['/main']);
        }
      },
      error: (error) => {
        this.error = 'Failed to load your bouquet items';
        this.isLoading = false;
      }
    });
  }

  calculateTotalPrice(): void {
    const itemsTotal = this.cartItems.reduce((sum, item) =>
      sum + item.flower.price * item.quantity, 0);

    const deliveryFee = this.deliveryOption === 'delivery' ? 20 : 0;
    this.totalPrice = itemsTotal + deliveryFee;
  }

  selectOption(option: string): void {
    this.deliveryOption = option;
    this.calculateTotalPrice();
  }

  getItemSubtotal(item: CartItem): number {
    return item.flower.price * item.quantity;
  }

  getTotalItems(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getItemsSubtotal(): number {
    return this.cartItems.reduce((sum, item) =>
      sum + item.flower.price * item.quantity, 0);
  }

  getDeliveryFee(): number {
    return this.deliveryOption === 'delivery' ? 20 : 0;
  }

  isFormValid(): boolean {
    return this.customerInfo.firstName.trim() !== '' &&
           this.customerInfo.lastName.trim() !== '' &&
           this.customerInfo.email.trim() !== '' &&
           this.customerInfo.phone.trim() !== '' &&
           this.deliveryOption !== '' &&
           (this.deliveryOption === 'pickup' ||
            (this.customerInfo.address.trim() !== '' &&
             this.customerInfo.city.trim() !== '' &&
             this.customerInfo.zipCode.trim() !== ''));
  }

  placeOrder(): void {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    if (this.cartItems.length === 0) {
      alert('Your bouquet is empty.');
      return;
    }

    this.isLoading = true;

    const order = {
      items: this.cartItems,
      customer: this.customerInfo,
      delivery: this.deliveryOption,
      total: this.totalPrice,
      orderDate: new Date()
    };

    console.log('Placing order:', order);

    setTimeout(() => {
      this.flowerService.clearCart().subscribe({
        next: () => {
          alert('Order placed successfully! Thank you for your purchase.');
          this.router.navigate(['/main']);
        },
        error: () => {
          alert('Order placed successfully! Thank you for your purchase.');
          this.router.navigate(['/main']);
        }
      });
    }, 2000);
  }

  goBack(): void {
    this.router.navigate(['/customizing']);
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
