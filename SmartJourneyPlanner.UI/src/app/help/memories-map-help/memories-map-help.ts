import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-memories-map-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memories-map-help.html',
  styleUrls: ['./memories-map-help.css']
})
export class MemoriesMapHelpComponent {
  isLightboxOpen = false;
  selectedImage = '';

  openLightbox(image: string): void {
    this.selectedImage = image;
    this.isLightboxOpen = true;
  }

  closeLightbox(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isLightboxOpen = false;
  }
}