import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BadgeProgress {
  id: string;
  name: string;
  rank: string;
  category: string;
  description: string;
  xpReward: number;
  icon: string;
  iconClass: string;
  isUnlocked: boolean;
  currentProgress: number;
  targetProgress: number;
  unlockedAt?: string;
}

export interface AchievementSummary {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  unlockedCount: number;
  totalBadges: number;
  progressPercent: number;
  badges: BadgeProgress[];
  newlyUnlocked: string[];
}

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private apiUrl = `${environment.apiUrl}/achievements`;

  constructor(private http: HttpClient) {}

  getAchievements(): Observable<AchievementSummary> {
    return this.http.get<AchievementSummary>(this.apiUrl);
  }

  getSummary(): Observable<AchievementSummary> {
    return this.http.get<AchievementSummary>(`${this.apiUrl}/summary`);
  }
}
