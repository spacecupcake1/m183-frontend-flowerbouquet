import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Flower } from 'src/app/data/flower';
import { FlowerService, FlowerStats } from 'src/app/service/flower.service';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-admin-flowers',
  templateUrl: './admin-flowers.component.html',
  styleUrls: ['./admin-flowers.component.css'],
})
export class AdminFlowersComponent implements OnInit {
  flowers: Flower[] = [];
  stats: FlowerStats | null = null;
  isEditing = false;
  isCreating = false;
  editingFlower: Flower = this.getEmptyFlower();

  // Form validation
  formErrors: { [key: string]: string } = {};

  constructor(
    private flowerService: FlowerService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if user is admin
    if (!this.userService.isAdmin()) {
      alert('Access denied. Admin privileges required.');
      this.router.navigate(['/main']);
      return;
    }

    this.loadFlowers();
    this.loadStats();
  }

  loadFlowers(): void {
    this.flowerService.getFlowers().subscribe({
      next: (data) => this.flowers = data,
      error: (error) => console.error('Error loading flowers:', error)
    });
  }

  loadStats(): void {
    const userId = this.userService.getCurrentUserId();
    if (userId) {
      this.flowerService.getFlowerStats(userId).subscribe({
        next: (data) => this.stats = data,
        error: (error) => console.error('Error loading stats:', error)
      });
    }
  }

  // ========== CREATE OPERATIONS ==========

  startCreating(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.editingFlower = this.getEmptyFlower();
    this.formErrors = {};
  }

  cancelCreate(): void {
    this.isCreating = false;
    this.editingFlower = this.getEmptyFlower();
    this.formErrors = {};
  }

  createFlower(): void {
    if (!this.validateFlower(this.editingFlower)) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.flowerService.createFlower(this.editingFlower, userId).subscribe({
      next: (createdFlower) => {
        console.log('Flower created successfully:', createdFlower);
        this.loadFlowers();
        this.loadStats();
        this.cancelCreate();
        alert('Flower created successfully!');
      },
      error: (error) => {
        console.error('Error creating flower:', error);
        alert('Error creating flower: ' + (error.error?.error || error.message));
      }
    });
  }

  // ========== UPDATE OPERATIONS ==========

  startEditing(flower: Flower): void {
    this.isEditing = true;
    this.isCreating = false;
    this.editingFlower = { ...flower }; // Create a copy
    this.formErrors = {};
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingFlower = this.getEmptyFlower();
    this.formErrors = {};
  }

  updateFlower(): void {
    if (!this.validateFlower(this.editingFlower)) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.flowerService.updateFlower(this.editingFlower.id, this.editingFlower, userId).subscribe({
      next: (updatedFlower) => {
        console.log('Flower updated successfully:', updatedFlower);
        this.loadFlowers();
        this.loadStats();
        this.cancelEdit();
        alert('Flower updated successfully!');
      },
      error: (error) => {
        console.error('Error updating flower:', error);
        alert('Error updating flower: ' + (error.error?.error || error.message));
      }
    });
  }

  // ========== DELETE OPERATIONS ==========

  deleteFlower(flower: Flower): void {
    if (!confirm(`Are you sure you want to delete "${flower.name}"?`)) {
      return;
    }

    const userId = this.userService.getCurrentUserId();
    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.flowerService.deleteFlower(flower.id, userId).subscribe({
      next: (response) => {
        console.log('Flower deleted successfully:', response);
        this.loadFlowers();
        this.loadStats();
        alert('Flower deleted successfully!');
      },
      error: (error) => {
        console.error('Error deleting flower:', error);
        alert('Error deleting flower: ' + (error.error?.error || error.message));
      }
    });
  }

  // ========== FORM VALIDATION ==========

  validateFlower(flower: Flower): boolean {
    this.formErrors = {};
    let isValid = true;

    if (!flower.name.trim()) {
      this.formErrors['name'] = 'Name is required';
      isValid = false;
    }

    if (!flower.meaning.trim()) {
      this.formErrors['meaning'] = 'Meaning is required';
      isValid = false;
    }

    if (!flower.info.trim()) {
      this.formErrors['info'] = 'Information is required';
      isValid = false;
    }

    if (!flower.color.trim()) {
      this.formErrors['color'] = 'Color is required';
      isValid = false;
    }

    if (!flower.availablity.trim()) {
      this.formErrors['availablity'] = 'Availability is required';
      isValid = false;
    }

    if (flower.price <= 0) {
      this.formErrors['price'] = 'Price must be greater than 0';
      isValid = false;
    }

    if (!flower.imageUrl.trim()) {
      this.formErrors['imageUrl'] = 'Image URL is required';
      isValid = false;
    }

    return isValid;
  }

  hasError(field: string): boolean {
    return !!this.formErrors[field];
  }

  getError(field: string): string {
    return this.formErrors[field] || '';
  }

  // ========== HELPER METHODS ==========

  private getEmptyFlower(): Flower {
    return {
      id: 0,
      name: '',
      meaning: '',
      availablity: 'Available',
      info: '',
      color: '',
      price: 0,
      imageUrl: ''
    };
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}
