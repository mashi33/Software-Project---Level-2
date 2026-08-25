import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { of, Subject } from 'rxjs';
import { MemoriesMapComponent } from './memories-map';
import { SignalrService } from '../services/signalr.service';



describe('MemoriesMapComponent', () => {
  let component: MemoriesMapComponent;
  let fixture: ComponentFixture<MemoriesMapComponent>;
  let httpMock: HttpTestingController;
  let locationSpy: jasmine.SpyObj<Location>;
  let signalrServiceMock: any;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj('Location', ['back']);
    signalrServiceMock = {
      memoryLikeUpdated: new Subject(),
      memoryCommentUpdated: new Subject(),
      hubConnection: {
        state: 1, // Connected
        on: jasmine.createSpy('on'),
        off: jasmine.createSpy('off'),
        start: jasmine.createSpy('start').and.returnValue(Promise.resolve())
      }
    };

    await TestBed.configureTestingModule({
      imports: [
        MemoriesMapComponent,
        CommonModule,
        FormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: Location, useValue: locationSpy },
        { provide: SignalrService, useValue: signalrServiceMock },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoriesMapComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // localStorage mock
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'token') return 'fake-token';
      if (key === 'userId') return 'user123';
      if (key === 'userName') return 'Test User';
      return null;
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set active tab', () => {
    component.setActiveTab('albums');
    expect(component.activeTab).toBe('albums');

    component.setActiveTab('upload');
    expect(component.activeTab).toBe('upload');
  });

  it('should format memory data correctly', () => {
    const raw = {
      Id: 'abc',
      Title: 'Sunset',
      ImageUrl: 'img.jpg',
      Latitude: '7.5',
      Longitude: '80.5',
      Visibility: 'public',
      likeCount: 3
    };

    const formatted = (component as any).formatData(raw);

    expect(formatted.id).toBe('abc');
    expect(formatted.title).toBe('Sunset');
    expect(formatted.latitude).toBe(7.5);
    expect(formatted.longitude).toBe(80.5);
    expect(formatted.visibility).toBe('public');
    expect(formatted.likeCount).toBe(3);
  });

  it('should group memories by trip name', () => {
    component.allMemories = [
      { id: '1', tripName: 'Kandy Trip', imageUrl: 'a.jpg', title: 'A' },
      { id: '2', tripName: 'Kandy Trip', imageUrl: 'b.jpg', title: 'B' },
      { id: '3', tripName: 'Galle Trip', imageUrl: 'c.jpg', title: 'C' }
    ];

    component.groupMemoriesByTrip();

    expect(component.groupedAlbums.length).toBe(2);
    expect(component.groupedAlbums[0].tripName).toBe('Kandy Trip');
    expect(component.groupedAlbums[0].memories.length).toBe(2);
  });

  it('should calculate total likes of an album', () => {
    const album = {
      memories: [
        { likeCount: 5 },
        { likeCount: 3 },
        { likeCount: 2 }
      ]
    };

    expect(component.getTotalLikes(album)).toBe(10);
  });

  it('should return correct visibility label', () => {
    expect(component.getVisibilityLabel('public')).toBe('Public');
    expect(component.getVisibilityLabel('tripMembers')).toBe('Only for trip members');
    expect(component.getVisibilityLabel('private')).toBe('Private');
    expect(component.getVisibilityLabel(undefined as any)).toBe('Private');
  });

  it('should get initial letter correctly', () => {
    expect(component.getInitial('Nimal')).toBe('N');
    expect(component.getInitial('')).toBe('?');
    expect(component.getInitial(null)).toBe('?');
  });

  it('should toggle liked users list', () => {
    expect(component.showLikedUsers).toBeFalse();
    component.toggleLikedUsers();
    expect(component.showLikedUsers).toBeTrue();
  });

  it('should call location.back() when goBack is called', () => {
    component.goBack();
    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('should clear image when removeImage is called', () => {
    const fakeInput = { value: 'something' } as HTMLInputElement;
    component.newMemory.imageUrl = 'data:image/...';
    component.selectedFile = {} as File;

    component.removeImage(fakeInput);

    expect(component.newMemory.imageUrl).toBe('');
    expect(component.selectedFile).toBeNull();
    expect(fakeInput.value).toBe('');
  });

  it('should open and close lightbox correctly', () => {
    const fakeAlbum = {
      tripName: 'Test Trip',
      memories: [{ id: 'm1', title: 'Memory 1', visibility: 'public' }]
    };

    component.openAlbum(fakeAlbum);

    expect(component.isLightboxOpen).toBeTrue();
    expect(component.selectedAlbum).toEqual(fakeAlbum);
    expect(component.selectedMemory).toEqual(fakeAlbum.memories[0]);

    component.closeLightbox();

    expect(component.isLightboxOpen).toBeFalse();
    expect(component.selectedAlbum).toBeNull();
    expect(component.selectedMemory).toBeNull();
  });

  it('should navigate next and previous memory in album', () => {
    const album = {
      memories: [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
        { id: '3', title: 'Third' }
      ]
    };

    component.selectedAlbum = album;
    component.currentMemoryIndex = 0;
    component.selectedMemory = album.memories[0];

    component.nextMemory();
    expect(component.currentMemoryIndex).toBe(1);
    expect(component.selectedMemory.title).toBe('Second');

    component.nextMemory();
    expect(component.currentMemoryIndex).toBe(2);

    component.nextMemory();
    expect(component.currentMemoryIndex).toBe(0); // loop

    component.prevMemory();
    expect(component.currentMemoryIndex).toBe(2);
  });
});