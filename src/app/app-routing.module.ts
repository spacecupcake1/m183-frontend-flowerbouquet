import { HttpClientModule } from '@angular/common/http';
import { NgModule, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { PreloadAllModules, Route, RouterModule, Routes, UrlSerializer } from '@angular/router';

// Existing Components
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

// Add this component if you don't have it
import { NotFoundComponent } from './components/not-found/not-found.component';

// Existing Guards
import { AdminGuard } from './service/admin.guard';
import { AuthGuard } from './service/auth.guard';

// Role-based Guards
import { AdminOnlyGuard, ModeratorGuard, OwnerOrAdminGuard, RoleGuard } from './service/role.guard';

/**
 * Application routing configuration with comprehensive security controls.
 * Updated from basic routing to include role-based access control and proper route protection.
 */
const routes: Routes = [
  // Default redirect
  {
    path: '',
    redirectTo: '/main',
    pathMatch: 'full'
  },

  // Public routes (no authentication required)
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login',
      description: 'Sign in to your account'
    }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Register',
      description: 'Create a new account'
    }
  },

  // Semi-public routes (accessible but with different content based on auth)
  {
    path: 'main',
    component: MainComponent,
    data: {
      title: 'FlowerBouquet - Home',
      description: 'Welcome to FlowerBouquet'
    }
  },

  // Product detail page (public but enhanced for authenticated users)
  {
    path: 'detail/:id',
    component: DetailPageComponent,
    data: {
      title: 'Flower Details',
      description: 'View flower details and pricing'
    }
  },

  // Protected routes (authentication required)
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'My Profile',
      description: 'Manage your account settings'
    }
  },

  // User customization (authenticated users only)
  {
    path: 'custom',
    component: CustomicingComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Customize Bouquet',
      description: 'Create your custom flower arrangement'
    }
  },

  // Checkout (authenticated users only)
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard],
    data: {
      title: 'Checkout',
      description: 'Complete your purchase'
    }
  },

  // User-specific routes (owner or admin access)
  {
    path: 'user/:id',
    component: ProfileComponent,
    canActivate: [OwnerOrAdminGuard],
    data: {
      customCheck: 'adminOrOwner',
      title: 'User Profile',
      description: 'User account details'
    }
  },

  // Admin routes (admin role required)
  {
    path: 'admin',
    canActivate: [AdminOnlyGuard],
    children: [
      {
        path: '',
        component: AdminComponent,
        data: {
          title: 'Admin Dashboard',
          description: 'Administrative control panel'
        }
      },
      {
        path: 'flowers',
        component: AdminFlowersComponent,
        data: {
          title: 'Flower Management',
          description: 'Manage flower inventory and catalog'
        }
      }
    ]
  },

  // Alternative admin flowers route for backward compatibility
  {
    path: 'admin/flowers',
    component: AdminFlowersComponent,
    canActivate: [AdminOnlyGuard],
    data: {
      title: 'Flower Management',
      description: 'Manage flower inventory and catalog'
    }
  },

  // Error pages
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
    data: {
      title: 'Access Denied',
      description: 'You do not have permission to access this resource'
    }
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
    data: {
      title: 'Page Not Found',
      description: 'The requested page could not be found'
    }
  },

  // Development routes (only available in development mode)
  ...(isDevMode() ? [
    {
      path: 'dev-test',
      component: MainComponent, // Use existing component for testing
      data: {
        title: 'Development Test',
        description: 'Development testing route'
      }
    }
  ] : []),

  // Catch-all route (must be last) - redirect to not-found instead of main for better UX
  {
    path: '**',
    component: NotFoundComponent,
    data: {
      title: 'Page Not Found',
      description: 'The requested page could not be found'
    }
  }
];

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes, {
      // Enhanced router configuration for security and performance
      enableTracing: false, // Set to true for debugging
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
      scrollOffset: [0, 64], // Account for header height if you have one

      // Preloading strategy for better performance
      preloadingStrategy: PreloadAllModules,

      // URL handling
      urlUpdateStrategy: 'eager',

      // Router malformed URI error handling
      malformedUriErrorHandler: (error: URIError, urlSerializer: UrlSerializer, url: string) => {
        console.error('Malformed URI error:', error);
        return urlSerializer.parse('/not-found');
      },

      // Error handler for unhandled route errors
      errorHandler: (error: any) => {
        console.error('Router error:', error);
        // In production, you might want to send this to a logging service
      }
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {

  constructor() {
    // Log route configuration in development
    if (isDevMode()) {
      console.log('FlowerBouquet Routes configured:', routes.length);
      this.logRouteConfiguration();
    }
  }

  /**
   * Log route configuration for debugging in development.
   */
  private logRouteConfiguration(): void {
    const logRoute = (route: Route, level: number = 0): void => {
      const indent = '  '.repeat(level);
      const guards = this.getRouteGuards(route);
      const roles = route.data?.['roles'] || [];

      console.log(`${indent}${route.path || '/'} - ${route.component?.name || 'Lazy'} ${guards} ${roles.length ? `[${roles.join(', ')}]` : ''}`);

      if (route.children) {
        route.children.forEach(child => logRoute(child, level + 1));
      }
    };

    routes.forEach(route => logRoute(route));
  }

  /**
   * Get guard names for logging.
   */
  private getRouteGuards(route: Route): string {
    const guards: string[] = [];

    if (route.canActivate) {
      route.canActivate.forEach(guard => {
        if (guard === AuthGuard) guards.push('Auth');
        else if (guard === AdminGuard) guards.push('Admin');
        else if (guard === RoleGuard) guards.push('Role');
        else if (guard === AdminOnlyGuard) guards.push('AdminOnly');
        else if (guard === ModeratorGuard) guards.push('Moderator');
        else if (guard === OwnerOrAdminGuard) guards.push('OwnerOrAdmin');
        else guards.push('Custom');
      });
    }

    return guards.length ? `(${guards.join(', ')})` : '';
  }
}
