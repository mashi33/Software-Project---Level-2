using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text.Json;

namespace SmartJourneyPlanner.Hubs
{
    public class ChatHub : Hub
    {
        private readonly DiscussionsService _discussionsService;

        public ChatHub(DiscussionsService discussionsService)
        {
            _discussionsService = discussionsService;
        }

        // Binding Error එක වැළැක්වීමට JsonElement භාවිතා කිරීම වඩාත් සුදුසුයි
        public async Task SendMessage(string discussionId, System.Text.Json.JsonElement commentData)
        {
            try
            {
                // 1. ලැබුණු දත්ත වහාම Console එකේ පෙන්වන්න
                Console.WriteLine($"[SignalR] Received message for ID: {discussionId}");

                // 2. Database එකට සේව් කිරීම (Background task)
                // සටහන: මෙහිදී JsonElement එක CommentItem එකකට සිතියම් (Map) කරයි.
                _ = Task.Run(async () => {
                    try
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var comment = JsonSerializer.Deserialize<CommentItem>(commentData.GetRawText(), options);
                        if (comment != null)
                        {
                            await _discussionsService.AddCommentAsync(discussionId, comment);
                            Console.WriteLine("[SignalR] Saved to Database.");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[SignalR DB Error]: {ex.Message}");
                    }
                });

                // 3. වැදගත්ම කොටස: දත්ත එලෙසම සියලුම Clients වෙත යැවීම
                // මෙලෙස යැවීමෙන් Binding errors ඇති නොවේ.
                await Clients.All.SendAsync("ReceiveMessage", discussionId, commentData);

                Console.WriteLine("[SignalR] Broadcast successful.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Critical Error]: {ex.Message}");
                throw new HubException("Failed to process message.");
            }
        }
    }
}