import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AchievementService, AchievementSummary, BadgeProgress } from '../services/achievement.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './achievements.html',
  styleUrls: ['./achievements.css']
})
export class AchievementsComponent implements OnInit {
  loading = true;
  activeTab: 'my' | 'all' = 'my';
  summary: AchievementSummary | null = null;
  userName = '';
  profilePic = '';

  constructor(
    private achievementService: AchievementService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = this.authService.getUserName() || 'Traveller';
    this.loadProfilePic();
    this.loadAchievements();
  }

  private loadProfilePic(): void {
    const savedPic = localStorage.getItem('profilePic');
    // Prefer the saved one, otherwise fall back to the same default the navbar uses
    this.profilePic = savedPic && savedPic.trim() !== ''
      ? savedPic
      : '/profilePic.jpg';
  }

  loadAchievements(): void {
    this.loading = true;
    this.achievementService.getAchievements().subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
        this.showNewBadgeAlerts(data.newlyUnlocked || []);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  showNewBadgeAlerts(newIds: string[]): void {
    if (!newIds.length || !this.summary) return;

    const names = this.summary.badges
      .filter(b => newIds.includes(b.id))
      .map(b => b.name);

    if (names.length === 1) {
      Swal.fire({
        icon: 'success',
        title: 'Badge Unlocked!',
        text: `You earned "${names[0]}"! +XP added.`,
        confirmButtonColor: '#004a99'
      });
    } else if (names.length > 1) {
      Swal.fire({
        icon: 'success',
        title: 'New Badges Unlocked!',
        html: names.map(n => `<span class="badge bg-primary me-1">${n}</span>`).join(''),
        confirmButtonColor: '#004a99'
      });
    }
  }

  get displayedBadges(): BadgeProgress[] {
    if (!this.summary) return [];
    return this.activeTab === 'my'
      ? this.summary.badges.filter(b => b.isUnlocked)
      : this.summary.badges;
  }

  get levelProgressPercent(): number {
    if (!this.summary) return 0;
    const xpInLevel = this.summary.totalXp % 150;
    return Math.round((xpInLevel / 150) * 100);
  }

  setTab(tab: 'my' | 'all'): void {
    this.activeTab = tab;
  }

  // Helper methods for badge icons and rank classes
  getBadgeIcon(badge: BadgeProgress): string {
    const icons: Record<string, string> = {
      'first-step': '/first_step.png',
      'budget-visionary': '/budget_visionary.png',
      'squad-leader': '/squad_leader.png',
      'eco-traveler': '/eco_traveler.png',
      'voyage-master': '/Voyage_master.png',
      'island-conqueror': '/Island_conqueror.png'
    };

    const rankFallback: Record<string, string> = {
      Bronze: 'bi-award-fill',
      Silver: 'bi-star-fill',
      Gold: 'bi-trophy-fill',
      Legend: 'bi-gem'
    };

    return icons[badge.id] || rankFallback[badge.rank] || 'bi-award-fill';
  }

  getRankClass(rank: string): string {
    const map: Record<string, string> = {
      Bronze: 'rank-bronze',
      Silver: 'rank-silver',
      Gold: 'rank-gold',
      Legend: 'rank-legend'
    };
    return map[rank] || 'rank-bronze';
  }
}
