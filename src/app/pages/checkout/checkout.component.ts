import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { FlowerService } from 'src/app/service/flower.service';

interface CartItem {
  flower: Flower;
  quantity: number;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  deliveryOption: string = '';

  constructor(private flowerService: FlowerService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.getCartItems();
  }

  bestellen(): void {
    this.router.navigate(['/main']);
}

  getCartItems(): void {
    this.flowerService.getTempFlowers().subscribe(flowers => {
      this.cartItems = flowers.map(flower => ({ flower, quantity: 1 }));
      this.calculateTotalPrice();
    });
  }

  calculateTotalPrice(): void {
    this.totalPrice = this.cartItems.reduce((sum, item) => sum + item.flower.price * item.quantity, 0);
    if (this.deliveryOption === 'delivery') {
      this.totalPrice += 20;
    }
  }

  selectOption(option: string): void {
    this.deliveryOption = option;
    this.calculateTotalPrice();
  }
}
