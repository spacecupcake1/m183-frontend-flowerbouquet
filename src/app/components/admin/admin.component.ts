import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RoleService } from 'src/app/service/role.guard';
import { User } from '../../data/user';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { ValidationService } from '../../service/validation.service';

interface UserFilter {
  search: string;
  role: string;
  status: string;
}

interface UserManagementStats {
  totalUsers: number;
  adminUsers: number;
  moderatorUsers: number;
  regularUsers: number;
  activeUsers: number;
}

/**
 * Admin component for comprehensive user management.
 * Provides secure user administration with role-based access control.
 */
@Component({
  selector: 'app-admin',
  template: `
    <div class="admin-container">

      <!-- Admin Header -->
      <div class="admin-header">
        <div class="header-content">
          <h1 class="admin-title">
            <i class="icon-admin" aria-hidden="true"></i>
            User Management
          </h1>
          <p class="admin-subtitle">Manage user accounts, roles, and permissions</p>
        </div>

        <!-- Quick Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ stats.totalUsers }}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card admin">
            <div class="stat-number">{{ stats.adminUsers }}</div>
            <div class="stat-label">Administrators</div>
          </div>
          <div class="stat-card moderator">
            <div class="stat-number">{{ stats.moderatorUsers }}</div>
            <div class="stat-label">Moderators</div>
          </div>
          <div class="stat-card user">
            <div class="stat-number">{{ stats.regularUsers }}</div>
            <div class="stat-label">Regular Users</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="admin-filters">
        <div class="filter-group">
          <label for="search" class="filter-label">Search Users</label>
          <input
            type="text"
            id="search"
            class="filter-input"
            placeholder="Search by username, name, or email..."
            [(ngModel)]="filter.search"
            (input)="onFilterChange()"
            autocomplete="off">
        </div>

        <div class="filter-group">
          <label for="roleFilter" class="filter-label">Filter by Role</label>
          <select
            id="roleFilter"
            class="filter-select"
            [(ngModel)]="filter.role"
            (change)="onFilterChange()">
            <option value="">All Roles</option>
            <option value="ROLE_ADMIN">Administrators</option>
            <option value="ROLE_MODERATOR">Moderators</option>
            <option value="ROLE_USER">Regular Users</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="statusFilter" class="filter-label">Filter by Status</label>
          <select
            id="statusFilter"
            class="filter-select"
            [(ngModel)]="filter.status"
            (change)="onFilterChange()">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="filter-actions">
          <button
            class="btn btn-secondary"
            (click)="clearFilters()"
            type="button">
            <i class="icon-clear" aria-hidden="true"></i>
            Clear Filters
          </button>

          <button
            class="btn btn-primary"
            (click)="refreshUsers()"
            type="button"
            [disabled]="isLoading">
            <i class="icon-refresh" aria-hidden="true"></i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container" role="status" aria-live="polite">
        <div class="loading-spinner"></div>
        <p>Loading users...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !isLoading" class="error-container" role="alert">
        <div class="error-content">
          <i class="icon-error" aria-hidden="true"></i>
          <h3>Error Loading Users</h3>
          <p>{{ error }}</p>
          <button class="btn btn-primary" (click)="refreshUsers()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Users Table -->
      <div *ngIf="!isLoading && !error" class="users-section">

        <!-- Table Controls -->
        <div class="table-controls">
          <div class="table-info">
            <span class="results-count">
              Showing {{ filteredUsers.length }} of {{ allUsers.length }} users
            </span>
          </div>

          <div class="table-actions">
            <button
              class="btn btn-success"
              (click)="openCreateUserModal()"
              type="button">
              <i class="icon-add" aria-hidden="true"></i>
              Add New User
            </button>
          </div>
        </div>

        <!-- Users Table -->
        <div class="table-container">
          <table class="users-table" role="table">
            <thead>
              <tr>
                <th scope="col" class="sortable" (click)="sortBy('id')">
                  ID
                  <i class="sort-icon" [class]="getSortIcon('id')" aria-hidden="true"></i>
                </th>
                <th scope="col" class="sortable" (click)="sortBy('username')">
                  Username
                  <i class="sort-icon" [class]="getSortIcon('username')" aria-hidden="true"></i>
                </th>
                <th scope="col" class="sortable" (click)="sortBy('firstname')">
                  Name
                  <i class="sort-icon" [class]="getSortIcon('firstname')" aria-hidden="true"></i>
                </th>
                <th scope="col" class="sortable" (click)="sortBy('email')">
                  Email
                  <i class="sort-icon" [class]="getSortIcon('email')" aria-hidden="true"></i>
                </th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers; trackBy: trackByUserId" class="user-row">
                <td class="user-id">{{ user.id }}</td>

                <td class="user-username">
                  <div class="username-cell">
                    <div class="user-avatar-small">{{ getUserInitials(user) }}</div>
                    <span class="username-text">{{ user.username }}</span>
                  </div>
                </td>

                <td class="user-name">
                  {{ user.firstname }} {{ user.lastname }}
                </td>

                <td class="user-email">
                  <a [href]="'mailto:' + user.email" class="email-link">
                    {{ user.email }}
                  </a>
                </td>

                <td class="user-roles">
                  <div class="roles-container">
                    <span
                      *ngFor="let role of user.roles"
                      class="role-badge"
                      [class.admin-badge]="role === 'ROLE_ADMIN'"
                      [class.moderator-badge]="role === 'ROLE_MODERATOR'"
                      [class.user-badge]="role === 'ROLE_USER'">
                      {{ getRoleDisplayName(role) }}
                    </span>
                  </div>
                </td>

                <td class="user-status">
                  <span class="status-badge active">Active</span>
                </td>

                <td class="user-actions">
                  <div class="action-buttons">
                    <button
                      class="btn btn-sm btn-secondary"
                      (click)="editUser(user)"
                      type="button"
                      [attr.aria-label]="'Edit user ' + user.username">
                      <i class="icon-edit" aria-hidden="true"></i>
                    </button>

                    <button
                      class="btn btn-sm btn-info"
                      (click)="manageUserRoles(user)"
                      type="button"
                      [attr.aria-label]="'Manage roles for ' + user.username">
                      <i class="icon-roles" aria-hidden="true"></i>
                    </button>

                    <button
                      class="btn btn-sm btn-warning"
                      (click)="resetUserPassword(user)"
                      type="button"
                      [attr.aria-label]="'Reset password for ' + user.username"
                      [disabled]="user.id === currentUserId">
                      <i class="icon-key" aria-hidden="true"></i>
                    </button>

                    <button
                      class="btn btn-sm btn-danger"
                      (click)="deleteUser(user)"
                      type="button"
                      [attr.aria-label]="'Delete user ' + user.username"
                      [disabled]="user.id === currentUserId || user.isAdmin">
                      <i class="icon-delete" aria-hidden="true"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div *ngIf="filteredUsers.length === 0" class="empty-state">
            <i class="icon-empty" aria-hidden="true"></i>
            <h3>No Users Found</h3>
            <p *ngIf="hasActiveFilters()">
              Try adjusting your search criteria or clearing the filters.
            </p>
            <p *ngIf="!hasActiveFilters()">
              No users are currently available.
            </p>
          </div>
        </div>
      </div>

      <!-- User Details Modal -->
      <div *ngIf="showUserModal" class="modal-overlay" (click)="closeUserModal()">
        <div class="modal-content" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ isEditMode ? 'Edit User' : 'Create New User' }}
            </h2>
            <button
              class="modal-close"
              (click)="closeUserModal()"
              type="button"
              aria-label="Close modal">
              <i class="icon-close" aria-hidden="true"></i>
            </button>
          </div>

          <div class="modal-body">
            <form [formGroup]="userForm" (ngSubmit)="onSubmitUser()" class="user-form">

              <div class="form-group">
                <label for="modalUsername" class="form-label">
                  Username <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="modalUsername"
                  class="form-control"
                  formControlName="username"
                  [class.is-invalid]="isUserFormFieldInvalid('username')"
                  [readonly]="isEditMode"
                  autocomplete="username">
                <div *ngIf="isUserFormFieldInvalid('username')" class="invalid-feedback">
                  {{ getUserFormFieldError('username') }}
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="modalFirstname" class="form-label">
                    First Name <span class="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="modalFirstname"
                    class="form-control"
                    formControlName="firstname"
                    [class.is-invalid]="isUserFormFieldInvalid('firstname')"
                    autocomplete="given-name">
                  <div *ngIf="isUserFormFieldInvalid('firstname')" class="invalid-feedback">
                    {{ getUserFormFieldError('firstname') }}
                  </div>
                </div>

                <div class="form-group">
                  <label for="modalLastname" class="form-label">
                    Last Name <span class="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="modalLastname"
                    class="form-control"
                    formControlName="lastname"
                    [class.is-invalid]="isUserFormFieldInvalid('lastname')"
                    autocomplete="family-name">
                  <div *ngIf="isUserFormFieldInvalid('lastname')" class="invalid-feedback">
                    {{ getUserFormFieldError('lastname') }}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="modalEmail" class="form-label">
                  Email Address <span class="required">*</span>
                </label>
                <input
                  type="email"
                  id="modalEmail"
                  class="form-control"
                  formControlName="email"
                  [class.is-invalid]="isUserFormFieldInvalid('email')"
                  autocomplete="email">
                <div *ngIf="isUserFormFieldInvalid('email')" class="invalid-feedback">
                  {{ getUserFormFieldError('email') }}
                </div>
              </div>

              <div *ngIf="!isEditMode" class="form-group">
                <label for="modalPassword" class="form-label">
                  Password <span class="required">*</span>
                </label>
                <input
                  type="password"
                  id="modalPassword"
                  class="form-control"
                  formControlName="password"
                  [class.is-invalid]="isUserFormFieldInvalid('password')"
                  autocomplete="new-password">
                <div *ngIf="isUserFormFieldInvalid('password')" class="invalid-feedback">
                  {{ getUserFormFieldError('password') }}
                </div>
              </div>

              <div *ngIf="userModalError" class="alert alert-danger">
                <i class="icon-error" aria-hidden="true"></i>
                {{ userModalError }}
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              (click)="closeUserModal()"
              type="button"
              [disabled]="isSubmittingUser">
              Cancel
            </button>

            <button
              class="btn btn-primary"
              (click)="onSubmitUser()"
              type="button"
              [disabled]="userForm.invalid || isSubmittingUser">
              <i *ngIf="!isSubmittingUser" class="icon-save" aria-hidden="true"></i>
              <i *ngIf="isSubmittingUser" class="icon-loading" aria-hidden="true"></i>
              {{ isSubmittingUser ? 'Saving...' : (isEditMode ? 'Update User' : 'Create User') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Role Management Modal -->
      <div *ngIf="showRoleModal" class="modal-overlay" (click)="closeRoleModal()">
        <div class="modal-content" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">
              Manage Roles for {{ selectedUser?.username }}
            </h2>
            <button
              class="modal-close"
              (click)="closeRoleModal()"
              type="button"
              aria-label="Close modal">
              <i class="icon-close" aria-hidden="true"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="role-management">
              <p class="role-description">
                Select the roles for this user. Changes will be applied immediately.
              </p>

              <div class="available-roles">
                <div
                  *ngFor="let role of availableRoles"
                  class="role-option">
                  <label class="role-checkbox">
                    <input
                      type="checkbox"
                      [checked]="userHasRole(selectedUser, role.value)"
                      (change)="toggleUserRole(role.value, $event)"
                      [disabled]="isManagingRoles">
                    <span class="checkmark"></span>
                    <div class="role-info">
                      <div class="role-name">{{ role.label }}</div>
                      <div class="role-desc">{{ role.description }}</div>
                    </div>
                  </label>
                </div>
              </div>

              <div *ngIf="roleModalError" class="alert alert-danger">
                <i class="icon-error" aria-hidden="true"></i>
                {{ roleModalError }}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              (click)="closeRoleModal()"
              type="button">
              Close
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {

  allUsers: User[] = [];
  filteredUsers: User[] = [];
  currentUserId: number | null = null;

  // State management
  isLoading = false;
  error = '';

  // Filtering and sorting
  filter: UserFilter = { search: '', role: '', status: '' };
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Statistics
  stats: UserManagementStats = {
    totalUsers: 0,
    adminUsers: 0,
    moderatorUsers: 0,
    regularUsers: 0,
    activeUsers: 0
  };

  // Modal states
  showUserModal = false;
  showRoleModal = false;
  isEditMode = false;
  selectedUser: User | null = null;

  // Form states
  userForm: FormGroup;
  isSubmittingUser = false;
  userModalError = '';
  isManagingRoles = false;
  roleModalError = '';

  // Available roles
  availableRoles = [
    {
      value: 'ROLE_USER',
      label: 'User',
      description: 'Standard user with basic permissions'
    },
    {
      value: 'ROLE_MODERATOR',
      label: 'Moderator',
      description: 'Can moderate content and manage users'
    },
    {
      value: 'ROLE_ADMIN',
      label: 'Administrator',
      description: 'Full system access and administration rights'
    }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private validationService: ValidationService,
    private roleService: RoleService,
    private formBuilder: FormBuilder
  ) {
    this.userForm = this.createUserForm();
  }

  ngOnInit(): void {
    this.getCurrentUserId();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Get current user ID for security checks.
   */
  private getCurrentUserId(): void {
    this.currentUserId = this.userService.getCurrentUserId();
  }

  /**
   * Create user form with validation.
   */
  private createUserForm(): FormGroup {
    return this.formBuilder.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        ValidationService.usernameValidator()
      ]],
      firstname: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        ValidationService.nameValidator()
      ]],
      lastname: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        ValidationService.nameValidator()
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        ValidationService.emailValidator()
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        ValidationService.passwordValidator()
      ]]
    });
  }

  /**
   * Load all users from the server.
   */
  loadUsers(): void {
    this.isLoading = true;
    this.error = '';

    const usersSub = this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.applyFilters();
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = this.extractErrorMessage(error);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(usersSub);
  }

  /**
   * Refresh users list.
   */
  refreshUsers(): void {
    this.loadUsers();
  }

  /**
   * Apply filters to users list.
   */
  private applyFilters(): void {
    let filtered = [...this.allUsers];

    // Search filter
    if (this.filter.search.trim()) {
      const searchTerm = this.filter.search.toLowerCase().trim();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm) ||
        user.firstname.toLowerCase().includes(searchTerm) ||
        user.lastname.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Role filter
    if (this.filter.role) {
      filtered = filtered.filter(user =>
        user.roles.includes(this.filter.role)
      );
    }

    // Status filter (assuming all users are active for now)
    if (this.filter.status === 'active') {
      // Keep all users (assuming all are active)
    } else if (this.filter.status === 'inactive') {
      filtered = []; // No inactive users for now
    }

    // Apply sorting
    this.sortUsers(filtered);

    this.filteredUsers = filtered;
  }

  /**
   * Sort users by specified field.
   */
  private sortUsers(users: User[]): void {
    users.sort((a, b) => {
      let aValue = this.getUserFieldValue(a, this.sortField);
      let bValue = this.getUserFieldValue(b, this.sortField);

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Get user field value for sorting.
   */
  private getUserFieldValue(user: User, field: string): any {
    switch (field) {
      case 'id': return user.id;
      case 'username': return user.username;
      case 'firstname': return user.firstname;
      case 'lastname': return user.lastname;
      case 'email': return user.email;
      default: return '';
    }
  }

  /**
   * Calculate statistics for the dashboard.
   */
  private calculateStats(): void {
    this.stats = {
      totalUsers: this.allUsers.length,
      adminUsers: this.allUsers.filter(u => u.roles.includes('ROLE_ADMIN')).length,
      moderatorUsers: this.allUsers.filter(u => u.roles.includes('ROLE_MODERATOR')).length,
      regularUsers: this.allUsers.filter(u => u.roles.includes('ROLE_USER') && !u.roles.includes('ROLE_ADMIN') && !u.roles.includes('ROLE_MODERATOR')).length,
      activeUsers: this.allUsers.length // Assuming all users are active
    };
  }

  /**
   * Event handlers for filtering and sorting.
   */
  onFilterChange(): void {
    this.applyFilters();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'icon-sort';
    return this.sortDirection === 'asc' ? 'icon-sort-asc' : 'icon-sort-desc';
  }

  clearFilters(): void {
    this.filter = { search: '', role: '', status: '' };
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filter.search || this.filter.role || this.filter.status);
  }

  /**
   * User modal management.
   */
  openCreateUserModal(): void {
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userModalError = '';
    this.showUserModal = true;
  }

  editUser(user: User): void {
    this.isEditMode = true;
    this.selectedUser = user;
    this.populateUserForm(user);
    this.userModalError = '';
    this.showUserModal = true;
  }

  private populateUserForm(user: User): void {
    this.userForm.patchValue({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    });

    // Remove password validation for edit mode
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userModalError = '';
    this.isSubmittingUser = false;
  }

  onSubmitUser(): void {
    if (this.userForm.invalid) return;

    this.isSubmittingUser = true;
    this.userModalError = '';

    const userData = this.userForm.value;

    if (this.isEditMode && this.selectedUser) {
      // Update existing user
      const updateSub = this.userService.updateUser(this.selectedUser.id, userData).subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: (error) => {
          this.userModalError = this.extractErrorMessage(error);
          this.isSubmittingUser = false;
        }
      });
      this.subscriptions.push(updateSub);
    } else {
      // Create new user
      const createSub = this.userService.registerUser(userData).subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: (error) => {
          this.userModalError = this.extractErrorMessage(error);
          this.isSubmittingUser = false;
        }
      });
      this.subscriptions.push(createSub);
    }
  }

  /**
   * Role management modal.
   */
  manageUserRoles(user: User): void {
    this.selectedUser = user;
    this.roleModalError = '';
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.roleModalError = '';
    this.isManagingRoles = false;
  }

  userHasRole(user: User | null, role: string): boolean {
    return user?.roles?.includes(role) || false;
  }

  toggleUserRole(role: string, event: any): void {
    if (!this.selectedUser || this.isManagingRoles) return;

    this.isManagingRoles = true;
    this.roleModalError = '';

    const hasRole = this.userHasRole(this.selectedUser, role);

    if (hasRole) {
      // Remove role
      const removeSub = this.userService.removeRoleFromUser(this.selectedUser.id, role).subscribe({
        next: () => {
          if (this.selectedUser) {
            this.selectedUser.roles = this.selectedUser.roles.filter(r => r !== role);
            this.updateUserInList(this.selectedUser);
            this.calculateStats();
          }
          this.isManagingRoles = false;
        },
        error: (error) => {
          this.roleModalError = this.extractErrorMessage(error);
          this.isManagingRoles = false;
          // Revert checkbox state
          event.target.checked = hasRole;
        }
      });
      this.subscriptions.push(removeSub);
    } else {
      // Add role
      const addSub = this.userService.addRoleToUser(this.selectedUser.id, role).subscribe({
        next: () => {
          if (this.selectedUser) {
            this.selectedUser.roles.push(role);
            this.selectedUser.isAdmin = this.selectedUser.roles.includes('ROLE_ADMIN');
            this.updateUserInList(this.selectedUser);
            this.calculateStats();
          }
          this.isManagingRoles = false;
        },
        error: (error) => {
          this.roleModalError = this.extractErrorMessage(error);
          this.isManagingRoles = false;
          // Revert checkbox state
          event.target.checked = hasRole;
        }
      });
      this.subscriptions.push(addSub);
    }
  }

  private updateUserInList(updatedUser: User): void {
    const index = this.allUsers.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      this.allUsers[index] = { ...updatedUser };
      this.applyFilters();
    }
  }

  /**
   * User actions.
   */
  resetUserPassword(user: User): void {
    if (user.id === this.currentUserId) return;

    const confirmed = confirm(`Are you sure you want to reset the password for ${user.username}?`);
    if (!confirmed) return;

    // TODO: Implement password reset functionality
    alert('Password reset functionality will be implemented.');
  }

  deleteUser(user: User): void {
    if (user.id === this.currentUserId || user.isAdmin) return;

    const confirmed = confirm(
      `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    this.isLoading = true;
    const deleteSub = this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        this.error = this.extractErrorMessage(error);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(deleteSub);
  }

  /**
   * Utility methods.
   */
  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  getUserInitials(user: User): string {
    return this.userService.getUserInitials(user);
  }

  getRoleDisplayName(role: string): string {
    const roleObj = this.availableRoles.find(r => r.value === role);
    return roleObj ? roleObj.label : role.replace('ROLE_', '');
  }

  isUserFormFieldInvalid(fieldName: string): boolean {
    const control = this.userForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getUserFormFieldError(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (control && control.errors) {
      return this.validationService.getErrorMessage(control.errors);
    }
    return '';
  }

  private extractErrorMessage(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (error.status === 403) {
      return 'You do not have permission to perform this action';
    } else if (error.status === 404) {
      return 'User not found';
    } else {
      return 'An unexpected error occurred';
    }
  }
}
