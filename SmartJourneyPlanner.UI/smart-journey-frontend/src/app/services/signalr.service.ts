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

  constructor() {
    this.startConnection();
  }

  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5233/chatHub') 
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Connected Successfully! ✅');
        
        // 1. New Comments
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
      })
      .catch(err => console.log('SignalR Connection Error: ' + err));
  }

  // Frontend එකෙන් සෘජුවම Hub එකට පණිවිඩයක් යැවීමට (DiscussionId ඉවත් කරන ලදී)
  async sendMessage(comment: any) {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        // Backend හි ChatHub තුළ ඇති "SendMessage(object comment)" invoke කරයි
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