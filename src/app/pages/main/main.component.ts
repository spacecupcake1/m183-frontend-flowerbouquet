import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Flower, FlowerService } from 'src/app/service/flower.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  flowers: Flower[] = [   {
    id: 1,
    name: 'Rose',
    imageUrl: 'https://cdn.stocksnap.io/img-thumbs/960w/single-red_Y5ZZNNK1YT.jpg',
    info: 'A beautiful red rose.',
    meaning: '',
    availablity: 'yes',
    color: '',
    price: 0
  },
  {
    id: 2,
    name: 'Tulip',
    imageUrl: 'https://cdn.stocksnap.io/img-thumbs/960w/tulip-flower_3AHTLNYV1U.jpg',
    info: 'A vibrant tulip.',
    meaning: '',
    availablity: 'no',
    color: '',
    price: 0
  },
  {
    id: 3,
    name: 'Sunflower',
    imageUrl: 'https://cdn.stocksnap.io/img-thumbs/960w/sunflower-field_EK0KVOG9M0.jpg',
    info: 'A bright sunflower.',
    meaning: '',
    availablity: 'yes',
    color: '',
    price: 0
  }];

  searchTerm: string = '';

  constructor(
    private flowerService: FlowerService,
    private router: Router,
  ) { }

  loadFlowers(): void {
    this.flowerService.getFlowers()
      .subscribe(data => this.flowers = data);
  }

  onSearch(): void {
    if (this.searchTerm.length > 0) {
      this.flowerService.searchFlowers(this.searchTerm)
        .subscribe(data => this.flowers = data);
    } else {
      this.loadFlowers();
    }
  }

  onFilter(): void {
    this.flowerService.filterFlowers('yes')
      .subscribe(data => this.flowers = data);
  }

  ngOnInit(): void {
    this.loadFlowers();
  }

  viewFlowerDetails(id: number): void {
    this.router.navigate(['/detail', id]);
  }
}
