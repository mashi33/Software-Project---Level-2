import { Component, AfterViewInit, ElementRef, QueryList, ViewChildren, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { UserService } from '../services/user-profile.service';

export interface Destination {
  id: number;
  name: string;
  location: string;
  imageUrl: string;
}

export interface Feature {
  icon: string;
  bgColorClass: string;
  title: string;
  description: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
  image: string;
}

export interface NearbyPlace {
  name: string;
  rating: number;
  image: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css']
})
export class LandingPageComponent implements OnInit, AfterViewInit {

  @ViewChildren('animateSection') sections!: QueryList<ElementRef>;
  @ViewChild('feedbackTrack') feedbackTrack!: ElementRef;

  feedbacks: any[] = [];
  activeFeedbackIndex = 0;

  constructor(
    private userProfileService: UserService,
    private router: Router
  ) { }

  // Search form
  searchData = {
    destination: '',
    startDate: '',
    endDate: '',
    travelers: ''
  };

  // Stats
  stats = [
    { value: '120+', label: 'Trips Planned', icon: 'bi-briefcase-fill', colorClass: 'green' },
    { value: '500+', label: 'Happy Travelers', icon: 'bi-people-fill', colorClass: 'blue' },
    { value: '300+', label: 'Destinations', icon: 'bi-geo-alt-fill', colorClass: 'purple' },
    { value: '4.8', label: 'User Rating', icon: 'bi-star-fill', colorClass: 'yellow' }
  ];

  // Popular Destinations
  destinations: Destination[] = [
    {
      id: 1,
      name: 'Sigiriya',
      location: 'Central Province',
      imageUrl: 'https://www.bluelankatours.com/wp-content/uploads/2023/11/Pidurangala.png'
    },
    {
      id: 2,
      name: 'Ella',
      location: 'Uva Province',
      imageUrl: 'https://i.pinimg.com/1200x/c5/3f/b1/c53fb1849115dcf2d816a2b184b29270.jpg'
    },
    {
      id: 3,
      name: 'Galle Fort',
      location: 'Southern Province',
      imageUrl: 'https://i.pinimg.com/1200x/a6/6b/02/a66b027dba73a2ba3a500c731f23b100.jpg'
    },
    {
      id: 4,
      name: 'Mirissa',
      location: 'Southern Province',
      imageUrl: 'https://gretastravels.com/wp-content/uploads/2019/05/IMG_0051.jpg.webp'
    },
    {
      id: 5,
      name: 'Kandy',
      location: 'Central Province',
      imageUrl: 'https://i.pinimg.com/736x/b7/5a/d0/b75ad0e683e9322855014dcd51e81a04.jpg'
    },
    {
      id: 6,
      name: 'Nuwara Eliya',
      location: 'Central Province',
      imageUrl: 'https://cdn.audleytravel.com/1050/750/79/15979547-female-worker-at-tea-plantation-nuwara-eliya.webp'
    },
    {
      id: 7,
      name: 'Yala National Park',
      location: 'Southern Province',
      imageUrl: 'https://i.pinimg.com/736x/c5/be/07/c5be07ddd0156ae3446416d8de66cb71.jpg'
    },
    {
      id: 8,
      name: 'Anuradhapura',
      location: 'North Central',
      imageUrl: 'https://i.pinimg.com/736x/cf/4e/e1/cf4ee114c13f9c60958488b12f5eeded.jpg'
    }
  ];

  // Features
  features: Feature[] = [
    {
      icon: 'bi-people-fill',
      bgColorClass: 'blue-bg',
      title: 'Collaborate',
      description: 'Plan together in real-time with friends and family.'
    },
    {
      icon: 'bi-currency-dollar',
      bgColorClass: 'light-blue-bg',
      title: 'Budget Tracking',
      description: 'Estimate, track and manage expenses easily.'
    },
    {
      icon: 'bi-map-fill',
      bgColorClass: 'orange-bg',
      title: 'Smart Routes',
      description: 'Get optimized routes and travel time with interactive maps.'
    },
    {
      icon: 'bi-house-door-fill',
      bgColorClass: 'purple-bg',
      title: 'Hotels & Stays',
      description: 'Find the best hotels and stays that fit your budget.'
    },
    {
      icon: 'bi-shop',
      bgColorClass: 'warm-orange-bg',
      title: 'Restaurants',
      description: 'Discover top restaurants near you and your destinations.'
    },
    {
      icon: 'bi-camera-fill',
      bgColorClass: 'pink-bg',
      title: 'Memories',
      description: 'Capture moments and relive your journeys forever.'
    }
  ];

  // How It Works
  steps: Step[] = [
    {
      number: 1,
      title: 'Create a Trip',
      description: 'Add your destination, dates and travel details.',
      image: 'https://img.icons8.com/color/96/suitcase.png'
    },
    {
      number: 2,
      title: 'Plan Together',
      description: 'Invite friends, plan activities, track budget and itineraries.',
      image: 'https://img.icons8.com/color/96/conference-call.png'
    },
    {
      number: 3,
      title: 'Travel & Remember',
      description: 'Enjoy your trip and save memories that last forever.',
      image: 'https://img.icons8.com/color/96/photo-gallery.png'
    }
  ];

  // Nearby places
  nearbyPlaces: NearbyPlace[] = [
    {
      name: 'Seaside Hotel',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=120&q=80'
    },
    {
      name: 'Ocean Restaurant',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80'
    },
    {
      name: 'Blue Reef Beach',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80'
    }
  ];

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  loadFeedbacks() {
    this.userProfileService.getFeedbacks().subscribe({
      next: (res: any) => {
        this.feedbacks = res;
      },
      error: (err: any) => {
        console.error('Failed to load feedbacks', err);
      }
    });
  }

  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    this.sections.forEach(section => {
      observer.observe(section.nativeElement);
    });
  }

  onSearchTrip(): void {
    if (!this.searchData.destination.trim()) {
      alert('Please enter a destination to search.');
      return;
    }
    console.log('Searching trips:', this.searchData);
  }

  scrollDestinations(direction: 'left' | 'right'): void {
    const slider = document.querySelector('.destinations-slider') as HTMLElement;
    if (slider) {
      const amount = direction === 'left' ? -280 : 280;
      slider.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  // ========== Feedback carousel methods ==========
  scrollFeedbacks(direction: 'left' | 'right') {
    const track = this.feedbackTrack?.nativeElement as HTMLElement;
    if (!track) return;

    const cardWidth = 340; // approx card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  goToFeedback(index: number) {
    this.activeFeedbackIndex = index;
    const track = this.feedbackTrack?.nativeElement as HTMLElement;
    if (!track) return;

    const cardWidth = 340;
    track.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}