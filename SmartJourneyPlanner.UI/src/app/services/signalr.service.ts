import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  public hubConnection!: signalR.HubConnection;
  
  public messageReceived = new Subject<any>();
  public voteUpdated = new Subject<any>();
  public discussionDeleted = new Subject<string>();
  public newDiscussion = new Subject<any>();
  public notificationReceived = new Subject<any>();
    public memberLimitChanged = new Subject<any>(); 

  constructor() {
    this.startConnection();
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
      .catch((err: any) => console.log('SignalR Connection Error: ' + err));
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
