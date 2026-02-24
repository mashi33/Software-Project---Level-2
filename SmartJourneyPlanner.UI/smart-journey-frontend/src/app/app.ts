import { Component } from '@angular/core';
import { DiscussionComponent } from './discussion/discussion';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DiscussionComponent], // Import the new component here
  template: `<app-discussion></app-discussion>` // Just call the selector here
})
export class AppComponent {}
