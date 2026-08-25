import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MemoryService, LikeRequest, CommentRequest } from './memory';
import { environment } from '../../environments/environment';
import { TripMemory, MemoryComment } from '../models/memory.model';

describe('MemoryService', () => {
  let service: MemoryService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/memories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MemoryService]
    });
    service = TestBed.inject(MemoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get memories by userId', () => {
    const mockMemories: TripMemory[] = [
      {
        id: '1',
        title: 'Test Memory',
        locationName: 'Kandy',
        imageUrl: 'http://example.com/img.jpg',
        description: 'Nice place',
        latitude: 7.29,
        longitude: 80.63,
        startDate: new Date(),
        endDate: new Date(),
        visibility: 'public',
        userId: 'user1',
        likeCount: 5,
        likedByUsers: []
      }
    ];

    service.getMemories('user1').subscribe(data => {
      expect(data).toEqual(mockMemories);
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/user/user1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMemories);
  });

  it('should get memory count', () => {
    const mockCount = { count: 12 };

    service.getMemoryCount('user1').subscribe(data => {
      expect(data.count).toBe(12);
    });

    const req = httpMock.expectOne(`${apiUrl}/user/user1/count`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCount);
  });

  it('should get public memories', () => {
    const mockPublic: TripMemory[] = [];

    service.getPublicMemories().subscribe(data => {
      expect(data).toEqual(mockPublic);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockPublic);
  });

  it('should get trip memories', () => {
    const mockTripMemories: TripMemory[] = [];

    service.getTripMemories('trip123').subscribe(data => {
      expect(data).toEqual(mockTripMemories);
    });

    const req = httpMock.expectOne(`${apiUrl}/trip/trip123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTripMemories);
  });

  it('should toggle like', () => {
    const mockResponse: any = { id: 'mem1', likeCount: 6, likedByUsers: ['John'] };

    service.toggleLike('mem1', 'user1', 'John').subscribe(data => {
      expect(data.likeCount).toBe(6);
    });

    const req = httpMock.expectOne(`${apiUrl}/mem1/like`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'user1', fullName: 'John' });
    req.flush(mockResponse);
  });

  it('should delete memory', () => {
    service.deleteMemory('mem1').subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/mem1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should get comments', () => {
    const mockComments: MemoryComment[] = [
      {
        id: 'c1',
        memoryId: 'mem1',
        userId: 'u1',
        fullName: 'Alice',
        text: 'Beautiful!',
        createdAt: new Date()
      }
    ];

    service.getComments('mem1').subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].text).toBe('Beautiful!');
    });

    const req = httpMock.expectOne(`${apiUrl}/mem1/comments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockComments);
  });

  it('should add comment', () => {
    const mockComment: MemoryComment = {
      id: 'c2',
      memoryId: 'mem1',
      userId: 'u1',
      fullName: 'Bob',
      text: 'Nice photo',
      createdAt: new Date()
    };

    service.addComment('mem1', 'u1', 'Bob', 'Nice photo').subscribe(data => {
      expect(data.text).toBe('Nice photo');
    });

    const req = httpMock.expectOne(`${apiUrl}/mem1/comments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      userId: 'u1',
      fullName: 'Bob',
      text: 'Nice photo'
    });
    req.flush(mockComment);
  });

  it('should delete comment', () => {
    service.deleteComment('c1', 'u1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/comments/c1?userId=u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});