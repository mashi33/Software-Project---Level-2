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

        
        /// Adds a user to a specific Trip Group based on the trip ID.
        /// Should be called from the frontend when a user selects or changes a trip.
        
        public async Task JoinTripGroup(string tripId)
        {
            if (!string.IsNullOrEmpty(tripId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, tripId);
                Console.WriteLine($"[SignalR Hub] Connection {Context.ConnectionId} joined group: {tripId}");
            }
        }

        /// Broadcasts a message to all connected clients.
        /// Note: While this broadcasts globally, it can be modified to target specific groups.
        public async Task SendMessage(object comment)
        {
            try
            {
                // Currently broadcasts to all users. 
                // Consider using Clients.Group(tripId) for group-specific messaging.
                await Clients.All.SendAsync("ReceiveComment", comment);

                Console.WriteLine("[SignalR Hub] Global message broadcasted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Critical Error] SendMessage: {ex.Message}");
                throw new HubException("Failed to broadcast message.");
            }
        }

        /// Broadcasts vote updates to all connected clients.
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