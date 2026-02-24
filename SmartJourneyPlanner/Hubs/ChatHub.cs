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

        // පණිවිඩයක් ලැබුණු විට එය සියලුම සාමාජිකයින්ට දැනුම් දීම (Broadcast)
        // දැන් පණිවිඩ සහ ඡන්ද පෙට්ටි වෙන් කර ඇති නිසා discussionId අවශ්‍ය නොවේ
        public async Task SendMessage(object comment)
        {
            try
            {
                // පණිවිඩය පමණක් සියලුම clients ලා වෙත යවයි
                await Clients.All.SendAsync("ReceiveComment", comment);

                Console.WriteLine("[SignalR Hub] Global message broadcasted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Critical Error] SendMessage: {ex.Message}");
                throw new HubException("Failed to broadcast message.");
            }
        }

        // ඡන්ද දත්ත පමණක් (Votes only) broadcast කිරීමට මෙම method එක භාවිතා කළ හැක
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