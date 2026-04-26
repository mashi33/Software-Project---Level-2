import { HttpInterceptorFn } from '@angular/common/http';

/* This interceptor acts as a global "middleware" for all HTTP calls.
 Instead of manually adding the JWT to every service, this function 
 handles it automatically in one central place */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Retrieve the token from localStorage
  const token = localStorage.getItem('token'); 

  // If the token exists, add it to the Authorization header
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  // If no token, just send the original request
  return next(req);
};