import { TestBed } from '@angular/core/testing';

import { VotePlaces } from './vote-places';

describe('VotePlaces', () => {
  let service: VotePlaces;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VotePlaces);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
