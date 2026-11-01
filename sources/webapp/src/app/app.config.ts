import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { routes } from './app.routes';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { API_BASE_URL } from './core/server/api/generated/api-client';
import { environment } from '../environments/environment';
import { SyncCoordinatorService } from './core/server/pouchdb-sync/sync-coordinator.service';
import { sessionCredentialsInterceptor } from './core/server/authentication/session-credentials.interceptor';

const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (
  http: HttpClient
) => new TranslateHttpLoader(http, 'i18n/', '.json');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
      withXhr(),
      withInterceptors([sessionCredentialsInterceptor])
    ),
    {
      provide: API_BASE_URL,
      useValue: environment.apiUrl,
    },
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled' })
    ),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'en',
    }),
    provideAppInitializer(() => {
      inject(SyncCoordinatorService);
    }),
  ],
};
