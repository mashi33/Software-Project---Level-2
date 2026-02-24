import { TestBed } from '@angular/core/testing';
import { SignalrService } from './signalr.service';
import * as signalR from '@microsoft/signalr';

/**
 * We mock SignalR by spying on HubConnectionBuilder prototype methods and returning
 * a spy HubConnection. This avoids real network calls and gives us full control over
 * connection state and event dispatching.
 */
describe('SignalrService', () => {
  let service: SignalrService;

  // Spy hub connection and helpers to simulate events and state
  let hubConnectionSpy: jasmine.SpyObj<signalR.HubConnection>;
  let handlers: Record<string, Function>;
  let currentState: signalR.HubConnectionState;

  function setupSignalRSpies(startImpl?: () => Promise<void>) {
    handlers = {};
    currentState = signalR.HubConnectionState.Connected;

    hubConnectionSpy = jasmine.createSpyObj<signalR.HubConnection>('HubConnection', [
      'start',
      'invoke',
      'on',
      'off',
    ], {
      state: currentState,
    });

    // Keep state readable via property getter reflecting currentState variable
    Object.defineProperty(hubConnectionSpy, 'state', {
      get: () => currentState,
      configurable: true,
    });

    hubConnectionSpy.on.and.callFake((event: string, cb: Function) => {
      handlers[event] = cb;
    });
    hubConnectionSpy.off.and.callFake((event: string) => {
      delete handlers[event];
    });

    // Default: resolve start and set connected
    hubConnectionSpy.start.and.callFake(() => {
      if (startImpl) {
        return startImpl();
      }
      currentState = signalR.HubConnectionState.Connected;
      return Promise.resolve();
    });

    hubConnectionSpy.invoke.and.returnValue(Promise.resolve());

    // Spy on HubConnectionBuilder chain to return our spy connection
    spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.callFake(function () {
      return this as any;
    });
    spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.callFake(function () {
      return this as any;
    });
    spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(hubConnectionSpy as any);
  }

  beforeEach(() => {
    setupSignalRSpies();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignalrService);
  });

  it('should be created and start the connection', async () => {
    expect(service).toBeTruthy();
    expect(hubConnectionSpy.start).toHaveBeenCalled();
  });

  it('should register event handlers and emit to subjects on incoming events', (done) => {
    const received: any[] = [];

    const subs = [
      service.messageReceived.subscribe((v) => received.push(['ReceiveComment', v])),
      service.voteUpdated.subscribe((v) => received.push(['UpdateVotes', v])),
      service.discussionDeleted.subscribe((v) => received.push(['DiscussionDeleted', v])),
      service.newDiscussion.subscribe((v) => received.push(['NewDiscussion', v])),
    ];

    // Simulate server events
    handlers['ReceiveComment']?.({ id: 1, text: 'hello' });
    handlers['UpdateVotes']?.({ id: 1, votes: 5 });
    handlers['DiscussionDeleted']?.('abc');
    handlers['NewDiscussion']?.({ id: 2, title: 'topic' });

    // Small timeout to allow subjects to emit
    setTimeout(() => {
      try {
        expect(received).toEqual([
          ['ReceiveComment', { id: 1, text: 'hello' }],
          ['UpdateVotes', { id: 1, votes: 5 }],
          ['DiscussionDeleted', 'abc'],
          ['NewDiscussion', { id: 2, title: 'topic' }],
        ]);
      } finally {
        subs.forEach((s) => s.unsubscribe());
        done();
      }
    }, 0);
  });

  it('should call off before registering event handlers to avoid duplicates', () => {
    expect(hubConnectionSpy.off).toHaveBeenCalledWith('ReceiveComment');
    expect(hubConnectionSpy.off).toHaveBeenCalledWith('UpdateVotes');
    expect(hubConnectionSpy.off).toHaveBeenCalledWith('DiscussionDeleted');
    expect(hubConnectionSpy.off).toHaveBeenCalledWith('NewDiscussion');

    expect(hubConnectionSpy.on).toHaveBeenCalledWith('ReceiveComment', jasmine.any(Function));
    expect(hubConnectionSpy.on).toHaveBeenCalledWith('UpdateVotes', jasmine.any(Function));
    expect(hubConnectionSpy.on).toHaveBeenCalledWith('DiscussionDeleted', jasmine.any(Function));
    expect(hubConnectionSpy.on).toHaveBeenCalledWith('NewDiscussion', jasmine.any(Function));
  });

  it('sendMessage should invoke directly when connected', async () => {
    currentState = signalR.HubConnectionState.Connected;
    await service.sendMessage({ text: 'hi' });
    expect(hubConnectionSpy.invoke).toHaveBeenCalledWith('SendMessage', { text: 'hi' });
    // Should not attempt to restart if already connected
    expect(hubConnectionSpy.start).toHaveBeenCalledTimes(1); // only the initial start in constructor
  });

  it('sendMessage should restart and invoke when disconnected', async () => {
    // Simulate a disconnected state before calling sendMessage
    currentState = signalR.HubConnectionState.Disconnected;

    await service.sendMessage({ text: 'reconnect' });

    // Should attempt to start again and then invoke
    expect(hubConnectionSpy.start).toHaveBeenCalled();
    expect(hubConnectionSpy.invoke).toHaveBeenCalledWith('SendMessage', { text: 'reconnect' });
  });

  it('should log connection error and not register handlers if start fails', async () => {
    // Reconfigure builder to create a connection whose start rejects
    const error = new Error('fail');

    // Reset spies and service for this scenario
    (signalR.HubConnectionBuilder.prototype.withUrl as jasmine.Spy).and.callThrough();
    (signalR.HubConnectionBuilder.prototype.withAutomaticReconnect as jasmine.Spy).and.callThrough();
    (signalR.HubConnectionBuilder.prototype.build as jasmine.Spy).and.callThrough();

    setupSignalRSpies(() => Promise.reject(error));

    const logSpy = spyOn(console, 'log');

    // Recreate service to trigger failing start
    service = TestBed.inject(SignalrService);

    // Allow microtask queue to flush
    await Promise.resolve();

    expect(logSpy).toHaveBeenCalledWith('SignalR Connection Error: ' + error);

    // Handlers should not have been registered as .then block didn't run
    expect(hubConnectionSpy.on).not.toHaveBeenCalledWith('ReceiveComment', jasmine.any(Function));
    expect(hubConnectionSpy.on).not.toHaveBeenCalledWith('UpdateVotes', jasmine.any(Function));
  });
});
