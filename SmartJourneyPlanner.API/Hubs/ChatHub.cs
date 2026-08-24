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

        // Adds a user to a specific trip's group so they receive that trip's
        // real-time updates. Called from the frontend when a user selects/changes a trip.
        public async Task JoinTripGroup(string tripId)
        {
            if (!string.IsNullOrEmpty(tripId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, tripId);
            }
        }

        // Adds a user to their personal notification group using their userId,
        // enabling Clients.Group(userId) targeted notifications. Called right after SignalR connects.
        public async Task JoinUserGroup(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            }
        }

        // Removes a user from their personal notification group on logout/disconnect
        public async Task LeaveUserGroup(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            }
        }

        // Broadcasts a chat message to all connected clients
        public async Task SendMessage(object comment)
        {
            try
            {
                await Clients.All.SendAsync("ReceiveComment", comment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] SendMessage error: {ex.Message}");
                throw new HubException("Failed to broadcast message.");
            }
        }

        // Broadcasts a vote update to all connected clients
        public async Task BroadcastVoteUpdate(object updatedDiscussion)
        {
            try
            {
                await Clients.All.SendAsync("UpdateVotes", updatedDiscussion);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub] BroadcastVoteUpdate error: {ex.Message}");
            }
        }
    }
}