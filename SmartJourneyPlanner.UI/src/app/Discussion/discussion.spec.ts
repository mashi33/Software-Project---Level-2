import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SignalrService } from '../services/signalr.service';

import { DiscussionComponent } from './discussion';

describe('DiscussionComponent', () => {
  let component: DiscussionComponent;
  let fixture: ComponentFixture<DiscussionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscussionComponent],
      providers: [
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        },
        {
          provide: SignalrService,
          useValue: {
            hubConnection: {
              invoke: () => Promise.resolve(),
              on: () => {},
              off: () => {},
              state: 'Connected'
            },
            voteUpdated: of(null),
            discussionDeleted: of(null),
            newDiscussion: of(null),
            memberLimitChanged: of(null),
            connectionFailed: of(null),
            connectionRestored: of(null)
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── validateTitle() tests ──
  describe('validateTitle()', () => {
    it('should reject titles shorter than 3 characters', () => {
      expect(component.validateTitle('ab')).toBeFalse();
    });

    it('should reject titles longer than 50 characters', () => {
      const longTitle = 'a'.repeat(51);
      expect(component.validateTitle(longTitle)).toBeFalse();
    });

        it('should reject titles with no vowels', () => {
      expect(component.validateTitle('bcdfgh')).toBeFalse();  // no a,e,i,o,u,y at all
      });

        it('should reject titles with 5+ consecutive consonants', () => {
      expect(component.validateTitle('abcdfghjk')).toBeFalse();  // has vowel 'a' but 8 consonants in a row after
    });

    it('should accept a valid meaningful title', () => {
      expect(component.validateTitle('Kandy Trip')).toBeTrue();
    });

    it('should reject an empty title', () => {
      expect(component.validateTitle('')).toBeFalse();
    });

    it('should always accept a title when isPlaceValid is true, bypassing all checks', () => {
      component.isPlaceValid = true;
      expect(component.validateTitle('xyz')).toBeTrue();
    });
  });

  // ── getVotePercentage() tests ──
  describe('getVotePercentage()', () => {
    it('should return 0 when there are no votes at all', () => {
      const item = { options: [{ voteCount: 0 }, { voteCount: 0 }] };
      expect(component.getVotePercentage(item, 0)).toBe(0);
    });

    it('should calculate correct percentage for a simple majority', () => {
      const item = { options: [{ voteCount: 3 }, { voteCount: 1 }] };
      expect(component.getVotePercentage(item, 0)).toBe(75);
      expect(component.getVotePercentage(item, 1)).toBe(25);
    });

    it('should return 0 when item or options is missing', () => {
      expect(component.getVotePercentage(null, 0)).toBe(0);
      expect(component.getVotePercentage({}, 0)).toBe(0);
    });
  });

  // ── sortedDiscussions tests ──
  describe('sortedDiscussions', () => {
    it('should order Pending before Confirmed before Rejected', () => {
      component.discussions = [
        { id: '1', type: 'Trip', isConfirmed: true,  isRejected: false, createdAt: new Date('2026-01-01') } as any,
        { id: '2', type: 'Trip', isConfirmed: false, isRejected: true,  createdAt: new Date('2026-01-01') } as any,
        { id: '3', type: 'Trip', isConfirmed: false, isRejected: false, createdAt: new Date('2026-01-01') } as any,
      ];

      const sorted = component.sortedDiscussions;

      expect(sorted[0].id).toBe('3');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('2');
    });

    it('should show newest first within the same status group', () => {
      component.discussions = [
        { id: 'old', type: 'Trip', isConfirmed: false, isRejected: false, createdAt: new Date('2026-01-01') } as any,
        { id: 'new', type: 'Trip', isConfirmed: false, isRejected: false, createdAt: new Date('2026-06-01') } as any,
      ];

      const sorted = component.sortedDiscussions;

      expect(sorted[0].id).toBe('new');
      expect(sorted[1].id).toBe('old');
    });

    it('should treat "Other" type polls as Pending regardless of confirm/reject flags', () => {
      component.discussions = [
        { id: 'poll', type: 'Other', isConfirmed: false, isRejected: false, createdAt: new Date('2026-01-01') } as any,
        { id: 'rejected', type: 'Trip', isConfirmed: false, isRejected: true, createdAt: new Date('2026-01-01') } as any,
      ];

      const sorted = component.sortedDiscussions;

      expect(sorted[0].id).toBe('poll');
      expect(sorted[1].id).toBe('rejected');
    });
  });
});