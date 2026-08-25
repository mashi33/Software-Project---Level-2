import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

import { SlideshowComponent } from './slideshow'; // adjust path if needed
import { MemoryService } from '../services/memory';
import { TripService } from '../services/trip.service';
import { MapAnimationService } from '../services/map-animation.service';
import { TripMemory } from '../models/memory.model';

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
    hasLayer: jasmine.createSpy('hasLayer').and.returnValue(false),
    fitBounds: jasmine.createSpy('fitBounds'),
    invalidateSize: jasmine.createSpy('invalidateSize'),
    off: jasmine.createSpy('off'),
    remove: jasmine.createSpy('remove'),
    on: jasmine.createSpy('on')
  }),
  tileLayer: jasmine.createSpy('tileLayer').and.returnValue({
    addTo: jasmine.createSpy('addTo')
  }),
  marker: jasmine.createSpy('marker').and.returnValue({
    addTo: jasmine.createSpy('addTo').and.returnValue({
      on: jasmine.createSpy('on')
    }),
    on: jasmine.createSpy('on').and.returnValue({
      addTo: jasmine.createSpy('addTo')
    }),
    setZIndexOffset: jasmine.createSpy('setZIndexOffset'),
    getElement: jasmine.createSpy('getElement').and.returnValue({ style: {} })
  }),
  polyline: jasmine.createSpy('polyline').and.returnValue({
    addTo: jasmine.createSpy('addTo')
  }),
  divIcon: jasmine.createSpy('divIcon').and.returnValue({}),
  latLng: jasmine.createSpy('latLng').and.callFake((lat: number, lng: number) => ({ lat, lng })),
  latLngBounds: jasmine.createSpy('latLngBounds').and.returnValue({}),
  point: jasmine.createSpy('point').and.returnValue({}),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jasmine.createSpy('mergeOptions')
    }
  },
  markerClusterGroup: jasmine.createSpy('markerClusterGroup').and.returnValue({
    clearLayers: jasmine.createSpy('clearLayers'),
    addLayer: jasmine.createSpy('addLayer'),
    addTo: jasmine.createSpy('addTo')
  })
};

// ---------- SAMPLE DATA (complete TripMemory) ----------
const sampleMemory1: TripMemory = {
  id: 'm1',
  title: 'Galle Fort',
  imageUrl: 'https://example.com/galle.jpg',
  description: 'Sunset',
  latitude: 6.0535,
  longitude: 80.2210,
  locationName: 'Galle',
  startDate: new Date('2026-07-01') as any,
  endDate: new Date('2026-07-03') as any,
  visibility: 'public',
  likeCount: 5,
  likedByUsers: [],
  commentCount: 0,
  tripId: 'trip-123',
  tripName: 'Southern Tour',
  userId: 'user-1',
  fullName: 'Alice',
  createdAt: new Date('2026-07-01') as any
};

const sampleMemory2: TripMemory = {
  ...sampleMemory1,
  id: 'm2',
  title: 'Mirissa Beach',
  imageUrl: 'https://example.com/mirissa.jpg',
  latitude: 5.9483,
  longitude: 80.4560,
  locationName: 'Mirissa',
  startDate: new Date('2026-07-02') as any,
  endDate: new Date('2026-07-04') as any,
  visibility: 'tripMembers',
  createdAt: new Date('2026-07-02') as any
};

const sampleTrip = {
  id: 'trip-123',
  _id: 'trip-123',
  data: {
    duration: 5,
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    members: [
      { name: 'Alice', email: 'alice@example.com', role: 'Owner', id: 'user-1' },
      { name: 'Bob', email: 'bob@example.com', role: 'Member', id: 'user-2' }
    ]
  }
};

// ---------- SERVICE MOCKS ----------
class MockMemoryService {
  getTripMemories(tripId: string) {
    return of([sampleMemory1, sampleMemory2]);
  }
}

class MockTripService {
  getTripById(tripId: string) {
    return of(sampleTrip);
  }
}

class MockMapAnimationService {
  animateVehicleMovement() {
    return Promise.resolve();
  }
  triggerClusterSpiderify() {
    return Promise.resolve();
  }
  animateSlideshowBoxShow() {
    return Promise.resolve();
  }
  resetOpenCluster() {}
}

describe('SlideshowComponent', () => {
  let component: SlideshowComponent;
  let fixture: ComponentFixture<SlideshowComponent>;
  let memoryService: MemoryService;
  let tripService: TripService;
  let mapAnimationService: MapAnimationService;
  let router: Router;

  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
    getCurrentNavigation: jasmine.createSpy('getCurrentNavigation').and.returnValue(null)
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          if (key === 'tripName') return encodeURIComponent('Southern Tour');
          return null;
        })
      },
      queryParamMap: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          if (key === 'tripId') return 'trip-123';
          return null;
        })
      }
    }
  };

  beforeEach(async () => {
    (window as any).L = mockLeaflet;
    (window as any).Swal = mockSwal;
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        SlideshowComponent,
        CommonModule,
        DragDropModule
      ],
      providers: [
        { provide: MemoryService, useClass: MockMemoryService },
        { provide: TripService, useClass: MockTripService },
        { provide: MapAnimationService, useClass: MockMapAnimationService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SlideshowComponent);
    component = fixture.componentInstance;

    memoryService = TestBed.inject(MemoryService);
    tripService = TestBed.inject(TripService);
    mapAnimationService = TestBed.inject(MapAnimationService);
    router = TestBed.inject(Router);

    // Prevent real map / animation side-effects
    spyOn(component as any, 'initMap').and.stub();
    spyOn(component as any, 'renderImageMarkers').and.stub();
    spyOn(component as any, 'refreshMapPath').and.stub();
    spyOn(component as any, 'executeSequentialAnimation').and.returnValue(Promise.resolve());

    // Mock ViewChild elements
    component.containerRef = {
      nativeElement: {
        requestFullscreen: jasmine.createSpy('requestFullscreen').and.returnValue(Promise.resolve()),
        classList: { add: jasmine.createSpy('add'), remove: jasmine.createSpy('remove') }
      }
    } as any;

    component.slideshowScreenRef = {
      nativeElement: {
        classList: { add: jasmine.createSpy('add'), remove: jasmine.createSpy('remove') }
      }
    } as any;

    mockSwal.fire.calls.reset();
    mockRouter.navigate.calls.reset();
  });

  afterEach(() => {
    if ((component as any).playbackInterval) {
      clearInterval((component as any).playbackInterval);
    }
    localStorage.clear();
  });

  // ====================== BASIC ======================
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ====================== ngOnInit ======================
  it('should read tripName and tripId from route on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.selectedTripName).toBe('Southern Tour');
    expect(component.tripId).toBe('trip-123');
  }));

  it('should load memories and trip metadata on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.allMemories.length).toBe(2);
    expect(component.filteredMemories.length).toBe(2);
    expect(component.tripDetails).toBeTruthy();
    expect(component.tripDurationDays).toBe(5);
  }));

  // ====================== MEMORY FILTERING ======================
  it('should keep only public and tripMembers memories', fakeAsync(() => {
    const privateMem: TripMemory = {
      ...sampleMemory1,
      id: 'm3',
      visibility: 'private'
    };
    spyOn(memoryService, 'getTripMemories').and.returnValue(
      of([sampleMemory1, sampleMemory2, privateMem])
    );

    component.tripId = 'trip-123';
    (component as any).loadAndFilterMemories();
    tick();

    expect(component.filteredMemories.length).toBe(2);
    expect(
      component.filteredMemories.every((m) =>
        ['public', 'tripmembers'].includes((m.visibility || '').toLowerCase())
      )
    ).toBeTrue();
  }));

  // ====================== TRIP MEMBERS ======================
  it('should build trip members list', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.tripMembers.length).toBe(2);
    expect(component.memberCount).toBe(2);
    expect(component.tripMembers[0].role).toBe('Owner');
  }));

  // ====================== SLIDE NAVIGATION ======================
  it('should go to next slide', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activeIndex = 0;
    component.nextSlide();
    tick();

    expect((component as any).executeSequentialAnimation).toHaveBeenCalled();
  }));

  it('should go to previous slide', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activeIndex = 1;
    component.prevSlide();
    tick();

    expect((component as any).executeSequentialAnimation).toHaveBeenCalled();
  }));

  it('should set active index when different', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.activeIndex = 0;
    component.setActiveIndex(1);
    tick();

    expect((component as any).executeSequentialAnimation).toHaveBeenCalled();
  }));

  it('should not change index when same index is selected', () => {
    component.activeIndex = 0;
    component.filteredMemories = [sampleMemory1, sampleMemory2];

    component.setActiveIndex(0);

    expect((component as any).executeSequentialAnimation).not.toHaveBeenCalled();
  });

  // ====================== PLAY / PAUSE ======================
  it('should toggle play and start interval', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.isPlaying = false;
    component.togglePlay();

    expect(component.isPlaying).toBeTrue();
    expect((component as any).playbackInterval).toBeTruthy();

    component.togglePlay();
    expect(component.isPlaying).toBeFalse();
  }));

  // ====================== THEME ======================
  it('should toggle light / dark theme', () => {
    component.isLightMode = true;
    component.toggleTheme();
    expect(component.isLightMode).toBeFalse();

    component.toggleTheme();
    expect(component.isLightMode).toBeTrue();
  });

  // ====================== FULLSCREEN ======================
  it('should request fullscreen', fakeAsync(() => {
    component.showCloseButton = true;
    component.toggleFullscreen();
    tick();

    expect(component.containerRef.nativeElement.requestFullscreen).toHaveBeenCalled();
  }));

  // ====================== CLOSE / REOPEN ======================
  it('should emit close and hide close button', () => {
    spyOn(component.close, 'emit');

    component.onClose();

    expect(component.showCloseButton).toBeFalse();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should reopen slideshow', () => {
    component.showCloseButton = false;
    component.onReopenSlideshow();
    expect(component.showCloseButton).toBeTrue();
  });

  // ====================== NAVIGATION BACK ======================
  it('should navigate to trip summary when tripId exists', () => {
    component.tripId = 'trip-123';
    component.goBackToSummary();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/trip-summary', 'trip-123']);
  });

  it('should navigate to dashboard when no tripId', () => {
    component.tripId = '';
    component.tripDetails = null;
    component.filteredMemories = [];
    component.goBackToSummary();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  // ====================== DRAG & DROP ORDER ======================
  it('should reorder memories on thumbnail drop and save order', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const dropEvent = {
      previousIndex: 0,
      currentIndex: 1
    } as CdkDragDrop<any[]>;

    component.onThumbnailDrop(dropEvent);

    expect(component.filteredMemories[0].id).toBe('m2');
    expect(component.filteredMemories[1].id).toBe('m1');

    const saved = localStorage.getItem('trip_order_trip-123');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!)).toEqual(['m2', 'm1']);
  }));

  // ====================== DOWNLOAD ALBUM ======================
  it('should show warning when no images to download', fakeAsync(() => {
    component.filteredMemories = [];
    component.downloadAlbumAsPhotos();
    tick();

    expect(mockSwal.fire).toHaveBeenCalled();
    const args = mockSwal.fire.calls.mostRecent().args[0];
    expect(args.icon).toBe('warning');
  }));

  it('should set isAlbumDownloading flag during download attempt', fakeAsync(() => {
    component.filteredMemories = [sampleMemory1];

    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['fake'], { type: 'image/jpeg' }))
      } as any)
    );

    const p = component.downloadAlbumAsPhotos();
    expect(component.isAlbumDownloading).toBeTrue();

    tick();
    expect(component.isAlbumDownloading).toBeFalse();
  }));

  // ====================== KEYBOARD ======================
  it('should handle keyboard shortcuts', () => {
    spyOn(component, 'togglePlay');
    spyOn(component, 'prevSlide');
    spyOn(component, 'nextSlide');

    (component as any).handleKeyboard(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(component.togglePlay).toHaveBeenCalled();

    (component as any).handleKeyboard(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(component.prevSlide).toHaveBeenCalled();

    (component as any).handleKeyboard(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    expect(component.nextSlide).toHaveBeenCalled();
  });

  // ====================== PIN COLOR ======================
  it('should return cycling pin colors', () => {
    const color0 = (component as any).getPinColor(0);
    const color6 = (component as any).getPinColor(6);
    expect(color0).toBe(color6);
    expect(typeof color0).toBe('string');
  });

  // ====================== CLEANUP ======================
  it('should clear interval and remove listeners on destroy', () => {
    component.isPlaying = true;
    (component as any).playbackInterval = setInterval(() => {}, 5000);

    const clearSpy = spyOn(window, 'clearInterval');
    component.ngOnDestroy();

    expect(clearSpy).toHaveBeenCalled();
  });
});