import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GenerationService {
  private apiUrl = environment.apiUrl; // environment එකේ ඇති API URL එක

  constructor(private http: HttpClient) { }

  // Static Map එක Backend එකෙන් ලබාගැනීමේ Function එක
  getStaticMap(path: string, markers: string, apiKey: string) {
  const url = `${this.apiUrl}/Map/get-static-map`;
  
  // දත්ත Body එක ලෙස යැවිය යුතුය
  const body = {
    path: path,
    markers: markers,
    apiKey: apiKey
  };

  return this.http.post(url, body); 
}
}
