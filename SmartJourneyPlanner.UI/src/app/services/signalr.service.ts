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
      .then(() => console.log('SignalR Connected Successfully! ✅'))
      .catch((err: any) => console.log('SignalR Connection Error: ' + err));

    // --- Backend (Controller) එකේ නම් සමඟ 100% ගැලපිය යුතුයි ---

    // 1. Controller එකේ "ReceiveComment" ලෙස ඇති බැවින් එය මෙලෙස වෙනස් කළා
    this.hubConnection.on('ReceiveComment', (data: any) => {
      console.log("SignalR: New Comment Received", data);
      // data තුළ discussionId සහ comment පවතී
      this.messageReceived.next(data);
    });

    // 2. Vote update වීම (Controller: "UpdateVotes")
    this.hubConnection.on('UpdateVotes', (data: any) => {
      console.log("SignalR: Vote Updated", data);
      this.voteUpdated.next(data);
    });

    // 3. Delete වීම (Controller: "DiscussionDeleted")
    this.hubConnection.on('DiscussionDeleted', (id: string) => {
      console.log("SignalR: Discussion Deleted", id);
      this.discussionDeleted.next(id);
    });

    // 4. අලුත් Discussion (Controller: "NewDiscussion")
    // සටහන: Controller එකේ "NewDiscussion" ලෙස මම කලින් update කළා නම් මෙහිදීද එයම තිබිය යුතුයි
    this.hubConnection.on('NewDiscussion', (data: any) => {
      console.log("SignalR: New Discussion Created", data);
      this.newDiscussion.next(data);
    });
  }

  // මෙය භාවිතා කරන්නේ කෙලින්ම Hub එකට කතා කිරීමටයි (e.g., chat message)
  async sendMessage(discussionId: string, comment: any) {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        // පින්තූරයේ තිබූ Error එක වැළැක්වීමට arguments ගණන Backend Hub එකට සමාන විය යුතුයි
        await this.hubConnection.invoke('SendMessage', discussionId, comment);
      }
    } catch (err) {
      console.error('Error while invoking SendMessage: ', err);
    }
  }
}