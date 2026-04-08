using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text.Json;
using System;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Hubs
{
    public class ChatHub : Hub
    {
        private readonly DiscussionsService _discussionsService;

        public ChatHub(DiscussionsService discussionsService)
        {
            _discussionsService = discussionsService;
        }

        //  (Broadcast)
        public async Task SendMessage(object comment)
        {
            try
            {
                //only send messages to clients
                await Clients.All.SendAsync("ReceiveComment", comment);

                Console.WriteLine("[SignalR Hub] Global message broadcasted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Critical Error] SendMessage: {ex.Message}");
                throw new HubException("Failed to broadcast message.");
            }
        }

        //  (Votes only) broadcast 
        public async Task BroadcastVoteUpdate(object updatedDiscussion)
        {
            try
            {
                await Clients.All.SendAsync("UpdateVotes", updatedDiscussion);
                Console.WriteLine("[SignalR Hub] Vote update broadcasted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Critical Error] BroadcastVoteUpdate: {ex.Message}");
            }
        }
    }
}