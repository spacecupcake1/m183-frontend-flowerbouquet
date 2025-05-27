import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { FlowerService } from 'src/app/service/flower.service';

interface CartItem {
  flower: Flower;
  quantity: number;
}

@Component({
  selector: 'app-customicing',
  templateUrl: './customicing.component.html',
  styleUrls: ['./customicing.component.css']
})
export class CustomicingComponent implements OnInit {
  cartItems: CartItem[] = [];

  constructor(private flowerService: FlowerService, private router: Router) { }

  ngOnInit(): void {
    this.getCartItems();
  }

  getCartItems(): void {
    this.flowerService.getTempFlowers().subscribe(flowers => {
      this.cartItems = flowers.map(flower => ({ flower, quantity: 1 }));
    });
  }

  increaseQuantity(item: CartItem): void {
    item.quantity++;
    this.updateCartItem(item);
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 0) {
      item.quantity--;
      this.updateCartItem(item);
    }
  }

  updateCartItem(item: CartItem): void {
    // Optionally call backend to update item quantity in the cart
    // this.flowerService.updateCartItem(item).subscribe();
  }

  checkout(): void {
    console.log('Checkout:', this.cartItems);
    this.router.navigate(['/checkout']);
  }
}
