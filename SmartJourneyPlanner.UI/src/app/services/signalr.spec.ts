import { TestBed } from '@angular/core/testing';
import { SignalrService } from './signalr.service';

describe('SignalrService', () => {
  let service: SignalrService; // 'Signalr' වෙනුවට 'SignalrService' ලෙස වෙනස් කළා

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignalrService); // මෙතැනත් 'SignalrService' ලෙස වෙනස් කළා
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
