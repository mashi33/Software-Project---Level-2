import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { CommunityMapComponent } from './community-map'; // adjust path if needed
import { MemoryService } from '../services/memory';
import { AuthService } from '../services/auth.service';
import { TripMemory, MemoryComment } from '../models/memory.model';

// ---------- GLOBAL MOCKS ----------
const mockSwal = {
  fire: jasmine.createSpy('fire').and.returnValue(Promise.resolve({ isConfirmed: true }))
};

// Minimal Leaflet mock
const mockLeaflet = {
  map: jasmine.createSpy('map').and.returnValue({
    setView: jasmine.createSpy('setView'),
    addLayer: jasmine.createSpy('addLayer'),
    removeLayer: jasmine.createSpy('removeLayer'),
    closePopup: jasmine.createSpy('closePopup'),
    stop: jasmine.createSpy('stop'),
    flyToBounds: jasmine.createSpy('flyToBounds'),
    once: jasmine.createSpy('once'),
    getZoom: jasmine.createSpy('getZoom').and.returnValue(8),
    getBounds: jasmine.createSpy('getBounds').and.returnValue({
      contains: () => true
    }),
    getBoundsZoom: jasmine.createSpy('getBoundsZoom').and.returnValue(12)
  }),
  tileLayer: jasmine.createSpy('tileLayer').and.returnValue({
    addTo: jasmine.createSpy('addTo')
  }),
  marker: jasmine.createSpy('marker').and.returnValue({
    bindPopup: jasmine.createSpy('bindPopup').and.returnValue({
      on: jasmine.createSpy('on')
    }),
    setPopupContent: jasmine.createSpy('setPopupContent'),
    getLatLng: () => ({ lat: 7.0, lng: 80.0 })
  }),
  divIcon: jasmine.createSpy('divIcon').and.returnValue({}),
  icon: jasmine.createSpy('icon').and.returnValue({}),
  point: jasmine.createSpy('point').and.returnValue({}),
  latLng: jasmine.createSpy('latLng').and.callFake((lat: number, lng: number) => ({ lat, lng })),
  latLngBounds: jasmine.createSpy('latLngBounds').and.returnValue({}),
  Marker: { prototype: { options: {} } },
  markerClusterGroup: jasmine.createSpy('markerClusterGroup').and.returnValue({
    addLayer: jasmine.createSpy('addLayer'),
    removeLayer: jasmine.createSpy('removeLayer'),
    addTo: jasmine.createSpy('addTo'),
    on: jasmine.createSpy('on'),
    unspiderfy: jasmine.createSpy('unspiderfy'),
    getVisibleParent: jasmine.createSpy('getVisibleParent')
  })
};

// GSAP mock
const mockGsap = {
  set: jasmine.createSpy('set'),
  to: jasmine.createSpy('to').and.returnValue({}),
  timeline: jasmine.createSpy('timeline').and.returnValue({
    to: jasmine.createSpy('to').and.returnValue({}),
    onComplete: null
  })
};

// ---------- SAMPLE DATA (matches MemoryComment interface) ----------
const sampleMemory: TripMemory = {
  id: 'm1',
  title: 'Beautiful Galle',
  imageUrl: 'https://example.com/img1.jpg',
  description: 'Sunset at the fort',
  latitude: 6.0535,
  longitude: 80.2210,
  locationName: 'Galle',
  startDate: new Date('2026-07-01') as any,
  endDate: new Date('2026-07-03') as any,
  visibility: 'public',
  likeCount: 12,
  likedByUsers: ['Test User'],
  commentCount: 3,
  tripId: 'trip-1',
  tripName: 'Southern Tour',
  userId: 'user-abc',
  fullName: 'Traveller One',
  createdAt: new Date('2026-07-02') as any
};

const sampleMemory2: TripMemory = {
  ...sampleMemory,
  id: 'm2',
  title: 'Kandy Lake',
  locationName: 'Kandy',
  latitude: 7.2906,
  longitude: 80.6337,
  likeCount: 5,
  likedByUsers: [],
  tripId: 'trip-2',
  tripName: 'Hill Country'
};

// Correct MemoryComment shape (includes required fullName, no userName)
const sampleComment: MemoryComment = {
  id: 'c1',
  memoryId: 'm1',
  userId: 'user-abc',
  fullName: 'Traveller One',
  text: 'Amazing photo!',
  createdAt: new Date()
};

// ---------- SERVICE MOCKS ----------
class MockMemoryService {
  getPublicMemories() {
    return of([sampleMemory, sampleMemory2]);
  }

  toggleLike(memoryId: string, userId: string, userName: string) {
    return of({
      ...sampleMemory,
      id: memoryId,
      likeCount: 13,
      likedByUsers: ['Test User']
    });
  }

  getComments(memoryId: string) {
    return of([
      {
        id: 'c1',
        memoryId,
        userId: 'user-abc',
        fullName: 'Traveller One',
        text: 'Amazing photo!',
        createdAt: new Date()
      } as MemoryComment
    ]);
  }

  addComment(memoryId: string, userId: string, userName: string, text: string) {
    return of({
      id: 'c-new',
      memoryId,
      userId,
      fullName: userName || 'Test User',
      text,
      createdAt: new Date()
    } as MemoryComment);
  }

  deleteComment(commentId: string, userId: string) {
    return of(void 0);
  }
}

class MockAuthService {
  getUserId() {
    return 'user-123';
  }
  getUserName() {
    return 'Test User';
  }
}

describe('CommunityMapComponent', () => {
  let component: CommunityMapComponent;
  let fixture: ComponentFixture<CommunityMapComponent>;
  let memoryService: MemoryService;
  let authService: AuthService;
  let router: Router;

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    (window as any).L = mockLeaflet;
    (window as any).leaflet = mockLeaflet;
    (window as any).Swal = mockSwal;
    (window as any).gsap = mockGsap;

    await TestBed.configureTestingModule({
      imports: [
        CommunityMapComponent,
        CommonModule,
        FormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: MemoryService, useClass: MockMemoryService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityMapComponent);
    component = fixture.componentInstance;

    memoryService = TestBed.inject(MemoryService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    spyOn(component as any, 'initMap').and.stub();
    spyOn(component as any, 'fixLeafletIcons').and.stub();
    spyOn(component as any, 'refreshMapMarkers').and.stub();
    spyOn(component as any, 'playGSAPStaggeredEntrance').and.stub();
    spyOn(component as any, 'playGSAPFlipAnimation').and.stub();
    spyOn(component as any, 'capturePopularCardRects').and.returnValue(new Map());

    mockSwal.fire.calls.reset();
    mockRouter.navigate.calls.reset();
  });

  afterEach(() => {
    component.groupedAlbums?.forEach(a => {
      if (a.slideshowInterval) {
        clearInterval(a.slideshowInterval);
      }
    });
  });

  // ====================== BASIC ======================
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ====================== DATA LOADING ======================
  it('should load public memories on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.allMemories.length).toBe(2);
    expect(component.filteredMemories.length).toBe(2);
    expect(component.topRatedMemories.length).toBeGreaterThan(0);
    expect(component.groupedAlbums.length).toBeGreaterThan(0);
  }));

  it('should handle load error gracefully', fakeAsync(() => {
    spyOn(memoryService, 'getPublicMemories').and.returnValue(
      throwError(() => new Error('Network error'))
    );
    spyOn(console, 'error');

    component.loadCommunityMemories();
    tick();

    expect(console.error).toHaveBeenCalled();
    expect(component.allMemories.length).toBe(0);
  }));

  // ====================== SEARCH / FILTER ======================
  it('should filter memories by location search', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchQuery = 'galle';
    component.filterMemories();
    tick(350);

    expect(component.filteredMemories.length).toBe(1);
    expect(component.filteredMemories[0].locationName.toLowerCase()).toContain('galle');
  }));

  it('should reset filter when search is empty', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchQuery = 'xyz';
    component.filterMemories();
    tick(350);

    component.searchQuery = '';
    component.filterMemories();
    tick(350);

    expect(component.filteredMemories.length).toBe(2);
  }));

  // ====================== SORTING ======================
  it('should change sort mode', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.setSortMode('likes');
    expect(component.sortMode).toBe('likes');

    component.setSortMode('date');
    expect(component.sortMode).toBe('date');
  }));

  it('should not change sort mode when already active', () => {
    component.sortMode = 'score';
    component.setSortMode('score');
    expect(component.sortMode).toBe('score');
  });

  // ====================== LIKES ======================
  it('should detect if current user has liked a memory', () => {
    const memory = { ...sampleMemory, likedByUsers: ['Test User'] };
    expect(component.hasUserLiked(memory)).toBeTrue();

    const notLiked = { ...sampleMemory, likedByUsers: [] };
    expect(component.hasUserLiked(notLiked)).toBeFalse();
  });

  it('should toggle like and update local state', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    spyOn(memoryService, 'toggleLike').and.returnValue(
      of({ ...sampleMemory, likeCount: 13, likedByUsers: ['Test User'] })
    );

    component.toggleLike('m1');
    tick();

    expect(memoryService.toggleLike).toHaveBeenCalled();
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  it('should not toggle like when user is not logged in', () => {
    spyOn(authService, 'getUserId').and.returnValue(null);
    spyOn(memoryService, 'toggleLike');

    component.toggleLike('m1');

    expect(memoryService.toggleLike).not.toHaveBeenCalled();
  });

  // ====================== ALBUM LIKES ======================
  it('should check if album is fully liked', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const album = component.groupedAlbums[0];
    album.memories.forEach(m => (m.likedByUsers = ['Test User']));
    expect(component.isAlbumFullyLiked(album)).toBeTrue();
  }));

  it('should toggle album likes via forkJoin', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const album = component.groupedAlbums[0];
    album.memories.forEach(m => (m.likedByUsers = []));

    spyOn(memoryService, 'toggleLike').and.returnValue(
      of({ ...sampleMemory, likeCount: 1, likedByUsers: ['Test User'] })
    );

    component.toggleAlbumLike(album);
    tick();

    expect(memoryService.toggleLike).toHaveBeenCalled();
    expect(component.albumLikeInProgress).toBeFalse();
  }));

  // ====================== LIGHTBOX ======================
  it('should open album lightbox', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const album = component.groupedAlbums[0];
    component.openAlbum(album);

    expect(component.isLightboxOpen).toBeTrue();
    expect(component.selectedAlbum).toBe(album);
    expect(component.selectedMemory).toBeTruthy();
  }));

  it('should open single memory lightbox', () => {
    component.openLightboxForMemory(sampleMemory);

    expect(component.isLightboxOpen).toBeTrue();
    expect(component.selectedMemory).toBe(sampleMemory);
    expect(component.selectedAlbum).toBeNull();
  });

  it('should navigate next / prev memory inside album', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const album = {
      tripName: 'Test Trip',
      memories: [sampleMemory, sampleMemory2],
      latestImage: '',
      latestDate: new Date(),
      currentDisplayImage: '',
      slideIndex: 0
    };

    component.openAlbum(album);
    expect(component.currentMemoryIndex).toBe(0);

    component.nextMemory();
    expect(component.currentMemoryIndex).toBe(1);
    expect(component.selectedMemory?.id).toBe('m2');

    component.prevMemory();
    expect(component.currentMemoryIndex).toBe(0);
  }));

  it('should close lightbox and clear state', () => {
    component.isLightboxOpen = true;
    component.selectedMemory = sampleMemory;
    component.selectedAlbum = {} as any;
    component.comments = [sampleComment];
    component.newCommentText = 'hello';

    component.closeLightbox();

    expect(component.isLightboxOpen).toBeFalse();
    expect(component.selectedMemory).toBeNull();
    expect(component.selectedAlbum).toBeNull();
    expect(component.comments).toEqual([]);
    expect(component.newCommentText).toBe('');
  });

  // ====================== COMMENTS ======================
  it('should load comments for a memory', fakeAsync(() => {
    component.loadComments('m1');
    tick();

    expect(component.comments.length).toBe(1);
    expect(component.isLoadingComments).toBeFalse();
  }));

  it('should submit a new comment', fakeAsync(() => {
    component.selectedMemory = { ...sampleMemory };
    component.newCommentText = 'Great shot!';

    spyOn(memoryService, 'addComment').and.returnValue(
      of({
        id: 'c-new',
        memoryId: 'm1',
        userId: 'user-123',
        fullName: 'Test User',
        text: 'Great shot!',
        createdAt: new Date()
      } as MemoryComment)
    );

    component.submitComment();
    tick();

    expect(component.comments.length).toBe(1);
    expect(component.newCommentText).toBe('');
    expect(component.isSubmittingComment).toBeFalse();
  }));

  it('should not submit empty comment', () => {
    component.selectedMemory = sampleMemory;
    component.newCommentText = '   ';
    spyOn(memoryService, 'addComment');

    component.submitComment();

    expect(memoryService.addComment).not.toHaveBeenCalled();
  });

  it('should delete own comment', fakeAsync(() => {
    const comment: MemoryComment = {
      id: 'c1',
      memoryId: 'm1',
      userId: 'user-123',
      fullName: 'Test User',
      text: 'My comment',
      createdAt: new Date()
    };
    component.comments = [comment];
    component.selectedMemory = { ...sampleMemory, commentCount: 1 };

    spyOn(memoryService, 'deleteComment').and.returnValue(of(void 0));

    component.deleteComment(comment);
    tick();

    expect(component.comments.length).toBe(0);
  }));

  it('should allow delete only for own comments', () => {
    const own: MemoryComment = {
      id: 'c1',
      memoryId: 'm1',
      userId: 'user-123',
      fullName: 'Test User',
      text: 'Mine',
      createdAt: new Date()
    };
    const other: MemoryComment = {
      id: 'c2',
      memoryId: 'm1',
      userId: 'someone-else',
      fullName: 'Other User',
      text: 'Theirs',
      createdAt: new Date()
    };

    expect(component.canDeleteComment(own)).toBeTrue();
    expect(component.canDeleteComment(other)).toBeFalse();
  });

  // ====================== SLIDESHOW ======================
  it('should start and stop slideshow', fakeAsync(() => {
    const album = {
      tripName: 'Test',
      memories: [sampleMemory, sampleMemory2],
      latestImage: sampleMemory.imageUrl,
      latestDate: new Date(),
      currentDisplayImage: sampleMemory.imageUrl,
      slideIndex: 0,
      slideshowInterval: null as any
    };

    component.startSlideshow(album);
    expect(album.slideshowInterval).toBeTruthy();

    component.stopSlideshow(album);
    expect(album.slideshowInterval).toBeNull();
  }));

  // ====================== TABS & SEE MORE ======================
  it('should switch active tab', () => {
    component.setActiveTab('albums');
    expect(component.activeTab).toBe('albums');

    component.setActiveTab('popular');
    expect(component.activeTab).toBe('popular');
  });

  it('should toggle see more for albums and top-rated', () => {
    component.showAllAlbums = false;
    component.toggleSeeMore();
    expect(component.showAllAlbums).toBeTrue();

    component.showAllTopRated = false;
    component.toggleTopRatedSeeMore();
    expect(component.showAllTopRated).toBeTrue();
  });

  // ====================== HELPERS ======================
  it('should calculate total likes of an album', () => {
    const album = {
      tripName: 'T',
      memories: [
        { likeCount: 5 } as TripMemory,
        { likeCount: 3 } as TripMemory
      ],
      latestImage: '',
      latestDate: new Date(),
      currentDisplayImage: '',
      slideIndex: 0
    };

    expect(component.getTotalLikes(album)).toBe(8);
  });

  it('should return priority score', () => {
    const mem = { ...sampleMemory, likeCount: 10 };
    (mem as any).priorityScore = 42.5;
    expect(component.getPriorityScore(mem)).toBe(42.5);
  });

  it('should track memory by id', () => {
    expect(component.trackByMemoryId(0, sampleMemory)).toBe('m1');
  });

  // ====================== NAVIGATION ======================
  it('should navigate back to memories welcome', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/memories-welcome']);
  });

  // ====================== LOGGED IN ======================
  it('should report logged-in status', () => {
    expect(component.isLoggedIn).toBeTrue();

    spyOn(authService, 'getUserId').and.returnValue(null);
    expect(component.isLoggedIn).toBeFalse();
  });

  // ====================== ENTER KEY COMMENT ======================
  it('should submit comment on Enter key (without Shift)', () => {
    component.selectedMemory = sampleMemory;
    component.newCommentText = 'Nice!';
    spyOn(component, 'submitComment');

    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    component.onEnterPress(event);

    expect(component.submitComment).toHaveBeenCalled();
  });

  it('should NOT submit on Shift+Enter', () => {
    component.selectedMemory = sampleMemory;
    component.newCommentText = 'Nice!';
    spyOn(component, 'submitComment');

    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    component.onEnterPress(event);

    expect(component.submitComment).not.toHaveBeenCalled();
  });
});