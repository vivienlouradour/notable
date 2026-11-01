import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api/generated/api-client';

export const sessionCredentialsInterceptor: HttpInterceptorFn = (
  request,
  next
) => {
  const baseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  const isApiRequest =
    request.url === baseUrl || request.url.startsWith(`${baseUrl}/`);
  return next(
    isApiRequest ? request.clone({ withCredentials: true }) : request
  );
};
