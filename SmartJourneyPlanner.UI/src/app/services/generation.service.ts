import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GenerationService {
  private apiUrl = environment.apiUrl; // API URL from environment.ts

  constructor(private http: HttpClient) { }

  // Fetch static map image from backend
  getStaticMap(path: string, markers: string, apiKey: string) {
  const url = `${this.apiUrl}/Map/get-static-map`;
  
  // Data Body to be sent
  const body = {
    path: path,
    markers: markers,
    apiKey: apiKey
  };

  return this.http.post(url, body); 
}
}
