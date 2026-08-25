import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  public hubConnection!: signalR.HubConnection;
  private retryInterval: any = null;
  private isManuallyReconnecting: boolean = false;

  public messageReceived      = new Subject<any>();
  public voteUpdated          = new Subject<any>();
  public discussionDeleted    = new Subject<string>();
  public newDiscussion        = new Subject<any>();
  public notificationReceived = new Subject<any>();
  public memoryLikeUpdated    = new Subject<any>();
  public memoryCommentUpdated = new Subject<any>();
  public memberLimitChanged   = new Subject<any>();
  public connectionFailed     = new Subject<string>();
  public connectionRestored   = new Subject<void>();

  constructor() {
    this.startConnection();
  }

  // Background retry loop — tries to restart the SignalR connection every 5 seconds
  // until it succeeds. Runs silently; only notifies the UI once when reconnected.
  private startManualReconnectLoop() {
    if (this.isManuallyReconnecting) return; // already retrying, don't start a second loop
    this.isManuallyReconnecting = true;

    this.retryInterval = setInterval(async () => {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        clearInterval(this.retryInterval);
        this.isManuallyReconnecting = false;
        return;
      }

      try {
        await this.hubConnection.start();

        clearInterval(this.retryInterval);
        this.isManuallyReconnecting = false;

        // Re-join the user's personal notification group after reconnecting
        const userId = localStorage.getItem('userId');
        if (userId) {
          await this.hubConnection.invoke('JoinUserGroup', userId);
        }

        this.connectionRestored.next();
      } catch (err) {
        // Swallow the error — the interval will simply try again in 5s
      }
    }, 5000);
  }

  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5233/chatHub')
      .withAutomaticReconnect()
      .build();

    // Re-join user group automatically on reconnection
    this.hubConnection.onreconnected(() => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        this.hubConnection.invoke('JoinUserGroup', userId)
          .catch((err: any) => console.warn('[SignalR] Failed to re-join user group on reconnect:', err));
      }
    });

    // Fires when SignalR gives up automatic reconnection attempts (connection permanently lost).
    // Instead of asking the user to refresh, we start our own background retry loop.
    this.hubConnection.onclose((err: any) => {
      console.warn('[SignalR] Connection closed:', err);
      this.connectionFailed.next('Live connection lost. Trying to reconnect...');
      this.startManualReconnectLoop();
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log('[SignalR] Connected Successfully! ✅');
        
        this.hubConnection.off('ReceiveComment');
        this.hubConnection.on('ReceiveComment', (data: any) => {
          this.messageReceived.next(data);
        });

        this.hubConnection.off('UpdateVotes');
        this.hubConnection.on('UpdateVotes', (data: any) => {
          this.voteUpdated.next(data);
        });

        this.hubConnection.off('DiscussionDeleted');
        this.hubConnection.on('DiscussionDeleted', (id: string) => {
          this.discussionDeleted.next(id);
        });

        this.hubConnection.off('NewDiscussion');
        this.hubConnection.on('NewDiscussion', (data: any) => {
          this.newDiscussion.next(data);
        });

        this.hubConnection.off('MemberLimitChanged');
        this.hubConnection.on('MemberLimitChanged', (data: any) => {
          this.memberLimitChanged.next(data);
        });

        this.hubConnection.off('ReceiveNotification');
        this.hubConnection.on('ReceiveNotification', (data: any) => {
          this.notificationReceived.next(data);
        });

        this.hubConnection.off('MemoryLikeUpdated');
        this.hubConnection.on('MemoryLikeUpdated', (data: any) => {
          console.log('[SignalR] Memory like updated:', data);
          this.memoryLikeUpdated.next(data);
        });

        this.hubConnection.off('MemoryCommentUpdated');
        this.hubConnection.on('MemoryCommentUpdated', (data: any) => {
          console.log('[SignalR] Memory comment updated:', data);
          this.memoryCommentUpdated.next(data);
        });
        
        // Auto-join the user group if already logged in when SignalR connects
        const userId = localStorage.getItem('userId');
        if (userId) {
          this.hubConnection.invoke('JoinUserGroup', userId)
            .catch((err: any) => console.warn('[SignalR] Failed to join user group:', err));
        }
      })
      .catch((err: any) => {
        this.connectionFailed.next('Cannot connect to live chat. Trying to reconnect...');
        this.startManualReconnectLoop();
      });
  }

  // Call this after login to join the user's personal notification group.
  // Backend uses Clients.Group(userId) to send targeted notifications.
  async joinUserGroup(userId: string) {
    if (!userId) return;
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('JoinUserGroup', userId);
      } else {
        // Queue group join once connection is established
        this.hubConnection.onreconnected(async () => {
          await this.hubConnection.invoke('JoinUserGroup', userId);
        });
      }
    } catch (err) {
      console.error('[SignalR] Error joining user group:', err);
    }
  }

  // Call this on logout to leave the user's notification group.
  async leaveUserGroup(userId: string) {
    if (!userId) return;
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('LeaveUserGroup', userId);
      }
    } catch (err) {
      console.error('[SignalR] Error leaving user group:', err);
    }
  }

  // Send a message from the frontend to the hub directly
  async sendMessage(comment: any) {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('SendMessage', comment);
      } else {
        console.warn('SignalR is not connected. Re-attempting...');
        await this.hubConnection.start();
        await this.hubConnection.invoke('SendMessage', comment);
      }
    } catch (err) {
      console.error('Error while invoking SendMessage:', err);
    }
  }
}