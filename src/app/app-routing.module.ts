import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';

// Import all components
import { AdminComponent } from './components/admin/admin.component';
import { ProfileComponent } from './components/profile/profile.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { AdminFlowersComponent } from './pages/admin-flowers/admin-flowers.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { CustomicingComponent } from './pages/customicing/customicing.component';
import { DetailPageComponent } from './pages/detail-page/detail-page.component';
import { LoginComponent } from './pages/login/login.component';
import { MainComponent } from './pages/main/main.component';
import { RegisterComponent } from './pages/register/register.component';

const routes: Routes = [
  // Public routes
  { path: '', redirectTo: '/main', pathMatch: 'full' },
  { path: 'main', component: MainComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Protected routes - require authentication
  {
    path: 'flowers',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: MainComponent, // Show flower list on main page
        data: { title: 'Flowers' }
      },
      {
        path: ':id',
        component: DetailPageComponent,
        data: { title: 'Flower Details' }
      }
    ]
  },

  // Bouquet/Cart routes
  {
    path: 'customizing',
    component: CustomicingComponent,
    canActivate: [AuthGuard],
    data: { title: 'Customize Bouquet' }
  },
  {
    path: 'cart',
    component: CheckoutComponent,
    canActivate: [AuthGuard],
    data: { title: 'Shopping Cart' }
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard],
    data: { title: 'Checkout' }
  },

  // User profile routes
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: { title: 'My Profile' }
  },

  // Admin routes - require admin privileges
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    data: { title: 'Admin Panel' },
    children: [
      {
        path: '',
        component: AdminComponent,
        data: { title: 'Admin Dashboard' }
      },
      {
        path: 'flowers',
        component: AdminFlowersComponent,
        data: { title: 'Flower Management' }
      },
      {
        path: 'users',
        component: AdminComponent,
        data: { title: 'User Management' }
      }
    ]
  },

  // Fallback route - redirect to main
  { path: '**', redirectTo: '/main' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // Enable router logging in development
    enableTracing: false, // Set to true for debugging

    // Scroll to top on route change
    scrollPositionRestoration: 'top',

    // Preload all lazy loaded modules
    preloadingStrategy: undefined,

    // Hash location strategy for better compatibility
    useHash: false,

    // Router configuration
    onSameUrlNavigation: 'reload'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
