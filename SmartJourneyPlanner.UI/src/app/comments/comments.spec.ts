import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SignalrService } from '../services/signalr.service';

import { CommentsComponent } from './comments';

describe('Comments', () => {
  let component: CommentsComponent;
  let fixture: ComponentFixture<CommentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentsComponent],
      providers: [
        provideHttpClient(),
        {
          provide: SignalrService,
          useValue: {
            hubConnection: {
              invoke: () => Promise.resolve(),
              on: () => {},
              off: () => {},
              state: 'Connected'
            },
            messageReceived: of(null),
            connectionRestored: of(null)
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── formatFileSize() tests ──
  describe('formatFileSize()', () => {
    it('should format bytes under 1KB as B', () => {
      expect(component.formatFileSize(500)).toBe('500 B');
    });

    it('should format bytes as KB when under 1MB', () => {
      expect(component.formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format bytes as MB when 1MB or more', () => {
      expect(component.formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });

    it('should default to 0 B when no size given', () => {
      expect(component.formatFileSize()).toBe('0 B');
    });
  });

  // ── isNewDay() tests ──
  describe('isNewDay()', () => {
    it('should return true for the very first message (no previous date)', () => {
      expect(component.isNewDay(null, new Date('2026-06-20'))).toBeTrue();
    });

    it('should return false when both dates are the same day', () => {
      const d1 = new Date('2026-06-20T08:00:00');
      const d2 = new Date('2026-06-20T18:30:00');
      expect(component.isNewDay(d1, d2)).toBeFalse();
    });

    it('should return true when dates are on different days', () => {
      const d1 = new Date('2026-06-20');
      const d2 = new Date('2026-06-21');
      expect(component.isNewDay(d1, d2)).toBeTrue();
    });
  });

  // ── Search logic tests ──
  describe('search', () => {
    beforeEach(() => {
      component.allComments = [
        { id: '1', tripId: 't1', user: 'sandali', text: 'Kandy trip sounds great', createdAt: new Date(), messageType: 'text' },
        { id: '2', tripId: 't1', user: 'kasun', text: 'lets go to ella', createdAt: new Date(), messageType: 'text' },
        { id: '3', tripId: 't1', user: 'irushika', text: '', createdAt: new Date(), messageType: 'pdf', fileName: 'itinerary.pdf' }
      ] as any;
    });

    it('should find matches by message text (case-insensitive)', () => {
      component.searchQuery = 'KANDY';
      (component as any).runSearch();
      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].id).toBe('1');
    });

    it('should find PDF messages by file name', () => {
      component.searchQuery = 'itinerary';
      (component as any).runSearch();
      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].id).toBe('3');
    });

    it('should clear results when the query is empty', () => {
      component.searchQuery = '';
      component.onSearchInput();
      expect(component.searchResults.length).toBe(0);
      expect(component.currentMatchIndex).toBe(-1);
    });

    it('should return no matches for a term that does not exist', () => {
      component.searchQuery = 'nonexistentplace';
      (component as any).runSearch();
      expect(component.searchResults.length).toBe(0);
    });
  });
});
