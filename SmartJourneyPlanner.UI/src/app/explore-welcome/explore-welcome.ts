import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common'; 

@Component({
    selector: 'app-explore-welcome',
    imports: [CommonModule],
    templateUrl: './explore-welcome.html',
    styleUrl: './explore-welcome.css'
})
export class ExploreWelcome {

  constructor(
    private router: Router, 
    private route: ActivatedRoute
  ) {}

 
  onSelect(path: string): void {
    this.router.navigate([path], { relativeTo: this.route });
  }
}



