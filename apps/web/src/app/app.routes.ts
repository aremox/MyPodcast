import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'library',
        pathMatch: 'full',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./features/library/library.component').then(m => m.LibraryComponent),
      },
      {
        path: 'podcast/:id',
        loadComponent: () =>
          import('./features/podcast-detail/podcast-detail.component').then(
            m => m.PodcastDetailComponent,
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/favorites/favorites.component').then(m => m.FavoritesComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then(m => m.HistoryComponent),
      },
      {
        path: 'downloads',
        loadComponent: () =>
          import('./features/downloads/downloads.component').then(m => m.DownloadsComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search.component').then(m => m.SearchComponent),
      },
      {
        path: 'playlist',
        loadComponent: () =>
          import('./features/playlist/playlist.component').then(m => m.PlaylistComponent),
      },
      {
        path: 'desktop-sync',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/desktop-sync/desktop-sync.component').then(m => m.DesktopSyncComponent),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'library' },
];
