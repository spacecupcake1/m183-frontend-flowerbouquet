import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';

// Use your existing components
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
  { path: '', redirectTo: '/main', pathMatch: 'full' },
  { path: 'main', component: MainComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Protected routes - use existing components as aliases
  {
    path: 'flowers',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DetailPageComponent }, // Use DetailPageComponent as FlowerListComponent
      { path: ':id', component: DetailPageComponent } // Use DetailPageComponent as FlowerDetailComponent
    ]
  },
  {
    path: 'cart',
    component: CheckoutComponent, // Use CheckoutComponent as CartComponent
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'customizing',
    component: CustomicingComponent,
    canActivate: [AuthGuard]
  },

  // Admin routes - use existing components
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: '', component: AdminComponent }, // Use AdminComponent as AdminPanelComponent
      { path: 'flowers', component: AdminFlowersComponent }, // Use AdminFlowersComponent as FlowerManagementComponent
      { path: 'users', component: AdminComponent } // Use AdminComponent as UserManagementComponent
    ]
  },

  { path: '**', redirectTo: '/main' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
