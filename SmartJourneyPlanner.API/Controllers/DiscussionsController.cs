using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SmartJourneyPlanner.Controllers
{
  // Handles all API requests related to discussions and voting within trips
  [Route("api/[controller]")]
  [ApiController]
  public class DiscussionsController : ControllerBase
  {
    private readonly DiscussionsService _discussionsService;  // Manages discussion data in the database
    private readonly IHubContext<ChatHub> _hubContext;        // Sends real-time updates to connected clients
    private readonly IMongoCollection<Trip> _tripsCollection; // Used to push confirmed places into the trip

    public DiscussionsController(DiscussionsService discussionsService, IHubContext<ChatHub> hubContext, IMongoDatabase mongoDatabase)
    {
      _discussionsService = discussionsService;
      _hubContext = hubContext;
      _tripsCollection = mongoDatabase.GetCollection<Trip>("Trips");
    }

    // GET api/discussions
    // Returns all discussions stored in the database
    [HttpGet]
    public async Task<ActionResult<List<DiscussionItem>>> Get()
    {
      try
      {
        var discussions = await _discussionsService.GetAsync();
        return Ok(discussions);
      }
      catch (Exception)
      {
        return StatusCode(500, "Can not fetch data.");
      }
    }

    // GET api/discussions/trip/{tripId}
    // Returns only the discussions that belong to a specific trip.
    // Also anonymizes votes: real voter names are replaced with "Voter N" placeholders
    // (length preserved so "Voted: X/Y" still works), and only the requesting user's
    // own vote is included, so nobody can see how anyone else voted.
    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<List<DiscussionItem>>> GetByTrip(string tripId, [FromQuery] string? requestingUser = null)
    {
      try
      {
        var discussions = await _discussionsService.GetByTripAsync(tripId);

        foreach (var d in discussions)
        {
          if (d.VotedUsers != null && d.VotedUsers.Count > 0)
          {
            d.VotedUsers = d.VotedUsers.Select((_, i) => $"Voter {i + 1}").ToList();
          }

          if (d.UserVotes != null)
          {
            d.UserVotes = string.IsNullOrEmpty(requestingUser)
              ? new List<UserVoteRecord>()
              : d.UserVotes
                  .Where(v => v.UserId.Trim().Equals(requestingUser.Trim(), StringComparison.OrdinalIgnoreCase))
                  .ToList();
          }
        }

        return Ok(discussions);
      }
      catch (MongoDB.Driver.MongoConnectionException ex)
      {
        Console.WriteLine($"[DiscussionsController] Mongo Connection Error: {ex.Message}");
        return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
      }
      catch (TimeoutException ex)
      {
        Console.WriteLine($"[DiscussionsController] Timeout: {ex.Message}");
        return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[DiscussionsController] GetByTrip Error: {ex.Message}");
        return StatusCode(503, new { message = "Network error. Please check your internet connection." });
      }
    }

    // POST api/discussions
    // Creates a new discussion, sets default values, and notifies the relevant trip group in real time
    [HttpPost]
    public async Task<IActionResult> Post(DiscussionItem newDiscussion)
    {
      try
      {
        newDiscussion.CreatedAt = DateTime.UtcNow;
        newDiscussion.IsConfirmed = false;
        newDiscussion.IsRejected = false;
        newDiscussion.VotedUsers = new List<string>();
        newDiscussion.UserVotes = new List<UserVoteRecord>();
        newDiscussion.Comments = new List<CommentItem>();

        if (newDiscussion.MemberLimit <= 0)
          newDiscussion.MemberLimit = 1;

        // Trip-type discussions always have Agree/Disagree options
        if (newDiscussion.Type == "Trip")
        {
          newDiscussion.Options = new List<VoteOption>
          {
            new VoteOption { OptionText = "Agree", VoteCount = 0 },
            new VoteOption { OptionText = "Disagree", VoteCount = 0 }
          };
        }
        else if (newDiscussion.Options == null)
        {
          newDiscussion.Options = new List<VoteOption>();
        }

        await _discussionsService.CreateAsync(newDiscussion);

        // Notify only the trip group, or everyone if no trip is linked
        if (!string.IsNullOrEmpty(newDiscussion.TripId))
        {
          await _hubContext.Clients.Group(newDiscussion.TripId).SendAsync("NewDiscussion", newDiscussion);
        }
        else
        {
          await _hubContext.Clients.All.SendAsync("NewDiscussion", newDiscussion);
        }

        return CreatedAtAction(nameof(Get), new { id = newDiscussion.Id }, newDiscussion);
      }
      catch (MongoDB.Driver.MongoConnectionException ex)
      {
        Console.WriteLine($"[DiscussionsController] Mongo Connection Error: {ex.Message}");
        return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
      }
      catch (TimeoutException ex)
      {
        Console.WriteLine($"[DiscussionsController] Timeout: {ex.Message}");
        return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[DiscussionsController] Post Error: {ex.Message}");
        return StatusCode(503, new { message = "Network error. Please check your internet connection." });
      }
    }

    // POST api/discussions/{id}/vote
    // Records a user's vote on a discussion option and updates the discussion outcome
    [HttpPost("{id}/vote")]
    public async Task<IActionResult> Vote(string id, [FromBody] VoteRequest request)
    {
      try
      {
        if (request == null || string.IsNullOrWhiteSpace(request.OptionText) || string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(id))
          return BadRequest(new { message = "Invalid vote request." });

        var discussion = await _discussionsService.GetAsync(id);
        if (discussion == null) return NotFound();

        // Verify the requester is an actual member of this trip (creator or invited
        // member) before allowing a vote — prevents fake votes with an arbitrary userName.
        if (!string.IsNullOrEmpty(discussion.TripId))
        {
          var trip = await _tripsCollection.Find(t => t.Id == discussion.TripId).FirstOrDefaultAsync();
          if (trip == null) return NotFound(new { message = "Trip not found." });

          if (string.IsNullOrWhiteSpace(request.UserEmail))
            return Forbid();

          bool isMember = (trip.CreatorEmail != null &&
                            trip.CreatorEmail.Trim().Equals(request.UserEmail.Trim(), StringComparison.OrdinalIgnoreCase))
                       || trip.Members.Any(m => m.Email != null &&
                            m.Email.Trim().Equals(request.UserEmail.Trim(), StringComparison.OrdinalIgnoreCase));

          if (!isMember)
            return Forbid();
        }

        // Only block if confirmed or rejected — a tie leaves both false, so voting stays open
        if (discussion.IsConfirmed || discussion.IsRejected)
          return BadRequest(new { message = "Voting is closed and finalized." });

        discussion.UserVotes ??= new List<UserVoteRecord>();
        discussion.Options ??= new List<VoteOption>();

        var existingVote = discussion.UserVotes.FirstOrDefault(v =>
            v.UserId.Trim().Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase));

        if (existingVote != null)
        {
          // Same option clicked again — no change needed
          if (existingVote.OptionText.Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase))
            return Ok(discussion);

          var oldOption = discussion.Options.FirstOrDefault(o => o.OptionText == existingVote.OptionText);
          if (oldOption != null && oldOption.VoteCount > 0)
            oldOption.VoteCount--;

          existingVote.OptionText = request.OptionText.Trim();
        }
        else
        {
          // Only allow a NEW voter if the member limit hasn't been reached —
          // existing voters (handled above) can always change their vote
          int limitCheck = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;
          if (discussion.UserVotes.Count >= limitCheck)
            return BadRequest(new { message = "Member limit reached. Only existing voters can change their vote." });

          discussion.UserVotes.Add(new UserVoteRecord { UserId = request.UserName.Trim(), OptionText = request.OptionText.Trim() });
          discussion.VotedUsers ??= new List<string>();
          discussion.VotedUsers.Add(request.UserName);
        }

        var option = discussion.Options.FirstOrDefault(o =>
            o.OptionText.Trim().Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase));

        if (option == null) return BadRequest(new { message = "Option not found." });
        option.VoteCount++;

        // Tracks whether this call is the one that flips the discussion to Confirmed,
        // so the place is only pushed to Trip.SavedPlaces once (not on every vote)
        bool justConfirmed = false;

        // Majority logic — outcome is decided once all members have voted
        if (discussion.Type == "Trip")
        {
          int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;

          var agreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Agree")?.VoteCount ?? 0;
          var disagreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Disagree")?.VoteCount ?? 0;

          if (discussion.UserVotes.Count >= limit)
          {
            if (agreeCount > disagreeCount)
            {
              if (!discussion.IsConfirmed) justConfirmed = true;
              discussion.IsConfirmed = true;
              discussion.IsRejected = false;
            }
            else if (disagreeCount > agreeCount)
            {
              discussion.IsConfirmed = false;
              discussion.IsRejected = true;
            }
            else
            {
              // Tie — stays Pending, votes remain editable
              discussion.IsConfirmed = false;
              discussion.IsRejected = false;
            }
          }
          else
          {
            // Not everyone has voted yet — always Pending
            discussion.IsConfirmed = false;
            discussion.IsRejected = false;
          }
        }

        await _discussionsService.UpdateAsync(id, discussion);

        // Once a Trip-type discussion is confirmed, push its place into Trip.SavedPlaces
        // so it shows up in the trip summary's Places dropdown
        if (justConfirmed && !string.IsNullOrEmpty(discussion.PlaceId) && !string.IsNullOrEmpty(discussion.PlaceName))
        {
          var place = new TripPlace
          {
            PlaceId = discussion.PlaceId,
            Name = discussion.PlaceName,
            Address = string.Empty,
            Rating = 0,
            Category = "Confirmed Vote"
          };

          var filter = Builders<Trip>.Filter.Eq(t => t.Id, discussion.TripId);
          var update = Builders<Trip>.Update.Push(t => t.SavedPlaces, place);
          await _tripsCollection.UpdateOneAsync(filter, update);
        }

        if (!string.IsNullOrEmpty(discussion.TripId))
        {
          await _hubContext.Clients.Group(discussion.TripId).SendAsync("UpdateVotes", discussion);
        }
        else
        {
          await _hubContext.Clients.All.SendAsync("UpdateVotes", discussion);
        }

        return Ok(discussion);
      }
      catch (MongoDB.Driver.MongoConnectionException ex)
      {
        Console.WriteLine($"[DiscussionsController] Mongo Connection Error: {ex.Message}");
        return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
      }
      catch (TimeoutException ex)
      {
        Console.WriteLine($"[DiscussionsController] Timeout: {ex.Message}");
        return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[DiscussionsController] Vote Error: {ex.Message}");
        return StatusCode(503, new { message = "Network error. Please check your internet connection." });
      }
    }

    // DELETE api/discussions/{id}
    // Deletes a discussion by ID and notifies the relevant trip group
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
      try
      {
        var discussion = await _discussionsService.GetAsync(id);
        await _discussionsService.RemoveAsync(id);

        if (discussion != null && !string.IsNullOrEmpty(discussion.TripId))
        {
          await _hubContext.Clients.Group(discussion.TripId).SendAsync("DiscussionDeleted", id);
        }
        else
        {
          await _hubContext.Clients.All.SendAsync("DiscussionDeleted", id);
        }

        return NoContent();
      }
      catch (MongoDB.Driver.MongoConnectionException ex)
      {
        Console.WriteLine($"[DiscussionsController] Mongo Connection Error: {ex.Message}");
        return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
      }
      catch (TimeoutException ex)
      {
        Console.WriteLine($"[DiscussionsController] Timeout: {ex.Message}");
        return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[DiscussionsController] Delete Error: {ex.Message}");
        return StatusCode(503, new { message = "Network error. Please check your internet connection." });
      }
    }

    // Represents the data sent by the client when casting a vote
    public class VoteRequest
    {
      public string OptionText { get; set; } = string.Empty;  // The option the user voted for
      public string UserName { get; set; } = string.Empty;    // The user who is voting (display name)
      public string UserEmail { get; set; } = string.Empty;   // Used to verify trip membership
    }
  }
}