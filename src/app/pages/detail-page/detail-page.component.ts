import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { FlowerService } from 'src/app/service/flower.service';

@Component({
  selector: 'app-detail-page',
  templateUrl: './detail-page.component.html',
  styleUrls: ['./detail-page.component.css']
})
export class DetailPageComponent implements OnInit {
  flower: Flower = {
    name: 'Sample Product',
    meaning: 'This is a sample meaning',
    availablity: 'yes',
    info: 'This is some sample info bdnngghjhj fghrhbfgh hbbhfbhf r hbhb fbejbhfb hebf fhebfhebfhwe fh wefhbfh hbehfbhfb grgrgrg n fjnjfnjnfjnjef j jfjgjg jjnfj  j f fn fnfjf w fnfjenf jnjf ej fjfenfj ejf ej fj fjnefejhb fhef  hbfhfh',
    color: 'Red',
    price: 99.99,
    id: 0,
    imageUrl: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowerService: FlowerService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.flowerService.getFlower(+id).subscribe(flower => this.flower = flower);
    }
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }

  addFlowerToTemp(): void {
    this.flowerService.addFlowerToTemp(this.flower).subscribe(
      response => {
        console.log('Flower added to temp storage', response);
      },
      error => {
        console.error('Error adding flower to temp storage', error);
      }
    );
  }

  goBouquet(): void {
    this.router.navigate(['/custom']);
  }
}
