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
  public messageReceived = new Subject<any>();
  public voteUpdated = new Subject<any>();
  public discussionDeleted = new Subject<string>();
  public newDiscussion = new Subject<any>();
  public notificationReceived = new Subject<any>();
  public memberLimitChanged = new Subject<any>(); 
  public connectionFailed = new Subject<string>(); 
  public connectionRestored = new Subject<void>(); 

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
        console.log('[SignalR] Attempting manual reconnect...');
        await this.hubConnection.start();

        console.log('[SignalR] Manual reconnect successful ✅');
        clearInterval(this.retryInterval);
        this.isManuallyReconnecting = false;

        // Re-join the user's personal notification group after reconnecting
        const userId = localStorage.getItem('userId');
        if (userId) {
          await this.hubConnection.invoke('JoinUserGroup', userId);
        }

        this.connectionRestored.next();
      } catch (err) {
        console.log('[SignalR] Manual reconnect attempt failed, will retry...');
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
          .then(() => console.log('[SignalR] Re-joined user group after reconnect:', userId))
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
        console.log('SignalR Connected Successfully! ✅');
        
        // 1. New message
        // Backend: await Clients.All.SendAsync("ReceiveComment", comment)
        this.hubConnection.off('ReceiveComment');
        this.hubConnection.on('ReceiveComment', (data: any) => {
          console.log("SignalR: New Comment Received", data);
          this.messageReceived.next(data);
        });

        // 2. Vote update
        this.hubConnection.off('UpdateVotes');
        this.hubConnection.on('UpdateVotes', (data: any) => {
          console.log("SignalR: Vote Updated", data);
          this.voteUpdated.next(data);
        });

        // 3. Delete
        this.hubConnection.off('DiscussionDeleted');
        this.hubConnection.on('DiscussionDeleted', (id: string) => {
          console.log("SignalR: Discussion Deleted", id);
          this.discussionDeleted.next(id);
        });

        // 4. New Discussion
        this.hubConnection.off('NewDiscussion');
        this.hubConnection.on('NewDiscussion', (data: any) => {
          console.log("SignalR: New Discussion Created", data);
          this.newDiscussion.next(data);
        });


        // 4.5 Member Limit Changed — fired when a trip's member list changes
        this.hubConnection.off('MemberLimitChanged');
        this.hubConnection.on('MemberLimitChanged', (data: any) => {
          console.log("SignalR: Member Limit Changed", data);
          this.memberLimitChanged.next(data);
        });

        // 5. New Real-time Notification (user-targeted via Group)
        this.hubConnection.off('ReceiveNotification');
        this.hubConnection.on('ReceiveNotification', (data: any) => {
          console.log("SignalR: New Notification Received", data);
          this.notificationReceived.next(data);
        });

        // Auto-join the user group if already logged in when SignalR connects
        const userId = localStorage.getItem('userId');
        if (userId) {
          this.hubConnection.invoke('JoinUserGroup', userId)
            .then(() => console.log('[SignalR] Joined user group on connect:', userId))
            .catch((err: any) => console.warn('[SignalR] Failed to join user group:', err));
        }
      })
        .catch((err: any) => {
        console.log('SignalR Connection Error: ' + err);
        this.connectionFailed.next('Cannot connect to live chat. Trying to reconnect...');
        this.startManualReconnectLoop();   
      });
  }

  /**
   * Call this after login to join the user's personal notification group.
   * Backend uses Clients.Group(userId) to send targeted notifications.
   */
  async joinUserGroup(userId: string) {
    if (!userId) return;
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('JoinUserGroup', userId);
        console.log('[SignalR] Joined user group:', userId);
      } else {
        // Queue group join once connection is established
        this.hubConnection.onreconnected(async () => {
          await this.hubConnection.invoke('JoinUserGroup', userId);
          console.log('[SignalR] Joined user group after reconnect:', userId);
        });
      }
    } catch (err) {
      console.error('[SignalR] Error joining user group:', err);
    }
  }

  /**
   * Call this on logout to leave the user's notification group.
   */
  async leaveUserGroup(userId: string) {
    if (!userId) return;
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('LeaveUserGroup', userId);
        console.log('[SignalR] Left user group:', userId);
      }
    } catch (err) {
      console.error('[SignalR] Error leaving user group:', err);
    }
  }

  //  Send message from frontend to hub directly
  async sendMessage(comment: any) {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {

        // invoke "SendMessage(object comment)" on chatHub in backend
        await this.hubConnection.invoke('SendMessage', comment);
      } else {
        console.warn("SignalR is not connected. Re-attempting...");
        await this.hubConnection.start();
        await this.hubConnection.invoke('SendMessage', comment);
      }
    } catch (err) {
      console.error('Error while invoking SendMessage: ', err);
    }
  }
}
