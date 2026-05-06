import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoriesMapComponent } from '../memories-map/memories-map'; 

@Component({
  selector: 'app-memories-map',
  standalone: true,
  imports: [
    CommonModule,
    MemoriesMapComponent 
  ],
  templateUrl: './memories-map.html',
  styleUrls: ['./memories-map.css']
})
export class MemoryMapComponent { }