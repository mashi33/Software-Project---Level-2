using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using MailKit.Net.Smtp;
using MimeKit;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq; 
using System.Security.Claims; 
using Microsoft.AspNetCore.Authorization;
using SmartJourneyPlanner.Services;
using SmartJourneyPlanner.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/trips")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;
        private readonly IMongoCollection<TripHistory> _historyCollection;
        private readonly SmartJourneyPlanner.API.Services.EmailService _emailService;
        private readonly DiscussionsService _discussionsService;   
        private readonly IHubContext<ChatHub> _hubContext;  
        private readonly SmartJourneyPlanner.API.Services.BudgetService _budgetService;

        // Constructor to initialize MongoDB collections
        public TripsController(IMongoClient mongoClient, SmartJourneyPlanner.API.Services.EmailService emailService, DiscussionsService discussionsService, IHubContext<ChatHub> hubContext, SmartJourneyPlanner.API.Services.BudgetService budgetService)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
            _historyCollection = database.GetCollection<TripHistory>("TripHistories");
            _emailService = emailService;
            _discussionsService = discussionsService;
            _hubContext = hubContext;
            _budgetService = budgetService;
        }

        [HttpGet("my-trips")]
        [Authorize] // Requires a valid JWT token in the authorization header pipeline
        public async Task<IActionResult> GetUserSpecificTrips()
        {
            try
            {
                // 1. Contextually extract BOTH Identity Claims from the logged-in JWT Token
                // 🔑 Add "System.Security.Claims." right in front of ClaimTypes
                var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var currentUserEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(currentUserId) && string.IsNullOrEmpty(currentUserEmail))
                {
                    return Unauthorized(new { message = "Invalid user identity tokens." });
                }

                // 2. Build defensive filter conditions to catch all structural variations in Atlas
                var creatorConditions = new List<FilterDefinition<Trip>>();

                // If token contains an email, check CreatedBy, creatorEmail, and the Members sub-document array
                if (!string.IsNullOrEmpty(currentUserEmail))
                {
                    creatorConditions.Add(Builders<Trip>.Filter.Eq(t => t.CreatedBy, currentUserEmail));
                    creatorConditions.Add(Builders<Trip>.Filter.Eq("creatorEmail", currentUserEmail));
                    creatorConditions.Add(Builders<Trip>.Filter.ElemMatch(t => t.Members, m => m.Email == currentUserEmail));
                }

                // If token contains a database ID string, check CreatedBy for ID matches too
                if (!string.IsNullOrEmpty(currentUserId))
                {
                    creatorConditions.Add(Builders<Trip>.Filter.Eq(t => t.CreatedBy, currentUserId));
                }

                // Combine all conditions using a logical OR statement
                var combinedFilter = Builders<Trip>.Filter.Or(creatorConditions);

                // 3. Query your Atlas Cluster and return the user-isolated records
                var isolatedTrips = await _tripsCollection.Find(combinedFilter).ToListAsync();
                return Ok(isolatedTrips);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error loading secure user trip stream: " + ex.Message });
            }
        }

        // Fetch all trips available in the database
        [HttpGet]
        public async Task<ActionResult<List<Trip>>> GetAllTrips()
        {
            try
            {
                var trips = await _tripsCollection.Find(_ => true).ToListAsync();
                return Ok(trips);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching all trips: " + ex.Message });
            }
        }

        // Get detailed information of a specific trip including its edit history
       [HttpGet("{id}")]
public async Task<IActionResult> GetTrip(string id)
{
    try
    {
                // If the requester is an authenticated Transport Provider, explicitly forbid access
                var userTypeClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                                    ?? User?.FindFirst("UserType")?.Value;

                if (!string.IsNullOrEmpty(userTypeClaim) &&
                    userTypeClaim.Equals("TransportProvider", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, new { message = "Access Denied. Transport providers cannot view trip summaries. If you want to join this trip, please log in or register as a Traveller." });
                }

                var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();

                if (trip == null)
                    return NotFound(new { message = "Trip not found in database!" });


                var history = await _historyCollection
                    .Find(h => h.TripId == id)
                    .SortByDescending(h => h.EditedAt)
                    .ToListAsync();

                var usersCollection = _tripsCollection.Database.GetCollection<User>("Users");

                var allMembers = new List<object>();

                 // Add owner
                var ownerEmail = trip.CreatorEmail ?? trip.CreatedBy;
        
                var ownerUser = await usersCollection.Find(u => u.Email == ownerEmail || u.Id == trip.CreatedBy).FirstOrDefaultAsync();
        
                var ownerDisplayName = !string.IsNullOrEmpty(ownerUser?.FullName) ? ownerUser.FullName : ownerEmail;

                allMembers.Add(new
                {
                    Name = ownerDisplayName,
                    Email = ownerEmail, 
                    Role = "Owner"
                });

                foreach (var m in trip.Members)
                {
                    var memberEmail = m.Email;
            
                    var memberUser = await usersCollection.Find(u => u.Email == memberEmail).FirstOrDefaultAsync();
            
                    var memberDisplayName = !string.IsNullOrEmpty(memberUser?.FullName) ? memberUser.FullName : memberEmail;

                    allMembers.Add(new
                    {
                        Name = memberDisplayName,
                        Email = memberEmail, 
                        Role = m.Role
                    });
                }

                return Ok(new
                {
                    trip.Id,
                    trip.TripName,
                    trip.DepartFrom,
                    trip.Destination,
                    trip.StartDate,
                    trip.EndDate,
                    trip.BudgetLimit,
                    trip.TransportMode,
                    trip.Description,
                    trip.SavedPlaces,
                    trip.CreatedBy,
                    trip.CreatorEmail,
                    Members = allMembers,
                    EditHistory = history
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new 
                { 
                    message = "Error fetching trip: " + ex.Message 
                });
            }
        }

        // Fetch trips where the user is either the creator or a member
        [HttpGet("by-email/{email}")]
        public async Task<ActionResult<List<Trip>>> GetTripsByEmail(string email)
        {
            try
            {
                var filter = Builders<Trip>.Filter.Or(
                    Builders<Trip>.Filter.Eq(t => t.CreatorEmail, email),
                    Builders<Trip>.Filter.Eq(t => t.CreatedBy, email),  // fallback for old trips
                    Builders<Trip>.Filter.ElemMatch(t => t.Members, m => m.Email == email)
                );
                var trips = await _tripsCollection.Find(filter).ToListAsync();
                return Ok(trips);
            }
            catch (MongoDB.Driver.MongoConnectionException ex)
    {
        Console.WriteLine($"[MongoDB Connection Error]: {ex.Message}");
        // ✅ 503 return —in frontend  network error popup
        return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
    }
    catch (TimeoutException ex)
    {
        Console.WriteLine($"[MongoDB Timeout]: {ex.Message}");
        return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[TripsController Error]: {ex.Message}");
        return StatusCode(503, new { message = "Network error. Please check your internet connection." });
    }
        }

        // Dashboard data for logged-in user only
       [Authorize]
[HttpGet("dashboard")]
public async Task<IActionResult> GetDashboardData()
{
    try
    {
        // 1. Get current user identity from JWT
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(userEmail))
            return Unauthorized(new { message = "Invalid user identity." });

        // 2. Local helper function to determine the current user's role in a trip
        string GetUserRole(Trip t)
        {
            // Owner check
            if ((!string.IsNullOrEmpty(userId) && t.CreatedBy == userId) ||
                (!string.IsNullOrEmpty(userEmail) &&
                 (t.CreatorEmail == userEmail || t.CreatedBy == userEmail)))
            {
                return "Owner";
            }

            // Member check
            var member = t.Members?.FirstOrDefault(m =>
                m.Email != null &&
                m.Email.Equals(userEmail, StringComparison.OrdinalIgnoreCase));

            if (member != null)
                return member.Role ?? "Member";

            return "Member"; // fallback
        }

        // 3. Build filter – supports both creator + member, old email + userId
var builder = Builders<Trip>.Filter;
var conditions = new List<FilterDefinition<Trip>>();

if (!string.IsNullOrEmpty(userId))
{
    conditions.Add(builder.Eq(t => t.CreatedBy, userId));
}

if (!string.IsNullOrEmpty(userEmail))
{
    conditions.Add(builder.Eq(t => t.CreatorEmail, userEmail));
    conditions.Add(builder.Eq(t => t.CreatedBy, userEmail)); // old data that stored email in CreatedBy
    conditions.Add(builder.ElemMatch(t => t.Members, m => m.Email == userEmail));
}

if (conditions.Count == 0)
    return Unauthorized(new { message = "Invalid user identity." });

var userFilter = builder.Or(conditions);

var userTrips = await _tripsCollection
    .Find(userFilter)
    .ToListAsync();

var today = DateTime.Today;

var upcomingTrips = userTrips
    .Where(t => t.StartDate.Date > today)
    .ToList();

var completedTrips = userTrips
    .Where(t => t.EndDate.Date < today)
    .ToList();

var ongoingTrips = userTrips
    .Where(t => t.StartDate.Date <= today && t.EndDate.Date >= today)
    .ToList();

        // 4. Return data with role included
        return Ok(new
        {
            upcomingCount = upcomingTrips.Count,
            completedCount = completedTrips.Count,
            ongoingCount = ongoingTrips.Count,

            upcomingTrips = upcomingTrips.Select(t => new
            {
                id = t.Id,
                tripName = t.TripName,
                destination = t.Destination,
                startDate = t.StartDate,
                endDate = t.EndDate,
                budgetLimit = t.BudgetLimit,
                description = t.Description,
                lat = t.Lat,
                lon = t.Lon,
                role = GetUserRole(t)          // ← role is now included
            }),

            completedTrips = completedTrips.Select(t => new
            {
                id = t.Id,
                tripName = t.TripName,
                departFrom = t.DepartFrom,
                destination = t.Destination,
                startDate = t.StartDate,
                endDate = t.EndDate,
                budgetLimit = t.BudgetLimit,
                description = t.Description,
                lat = t.Lat,
                lon = t.Lon,
                role = GetUserRole(t)          // ← role is now included
            }),

            ongoingTrips = ongoingTrips.Select(t => new
            {
                id = t.Id,
                tripName = t.TripName,
                departFrom = t.DepartFrom,
                destination = t.Destination,
                startDate = t.StartDate,
                endDate = t.EndDate,
                budgetLimit = t.BudgetLimit,
                description = t.Description,
                lat = t.Lat,
                lon = t.Lon,
                role = GetUserRole(t)          // ← role is now included
            })
        });
    }
    catch (Exception ex)
    {
        return BadRequest(new
        {
            message = "Dashboard loading error: " + ex.Message
        });
    }
}

[Authorize]
[HttpGet("next-trip")] // Notice we removed "/{userId}" here too!
        public async Task<IActionResult> GetNextTrip()
        {
            try 
            {

// 🔥 SAFEST WAY: Read user identity from token context
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var now = DateTime.UtcNow;

                // 🔥 FIX 3: Push date filtering directly to MongoDB using Builders instead of pulling all records into RAM
                var filter = Builders<Trip>.Filter.And(
                    Builders<Trip>.Filter.Regex(t => t.CreatedBy, new MongoDB.Bson.BsonRegularExpression($"^{userId}$", "i")),
                    Builders<Trip>.Filter.Gte(t => t.StartDate, now)
                );

                // Find the single closest upcoming trip directly from the database server execution
                var nextTrip = await _tripsCollection
                    .Find(filter)
                    .SortBy(t => t.StartDate)
                    .FirstOrDefaultAsync();

                if (nextTrip == null)
                {
                    return Ok(null);
                }

                return Ok(new
                {
                    nextTrip.Id,
                    nextTrip.TripName,
                    nextTrip.Destination,
                    nextTrip.StartDate
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching next trip: " + ex.Message });
            }
}

        // Create a new trip and send invitation emails to all members
        [HttpPost]
        public async Task<IActionResult> CreateTrip([FromBody] Trip newTrip)
        {
            try
            {
                var validationError = ValidateTripData(newTrip, isUpdate: false);
        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }
                newTrip.Members = NormalizeMembers(newTrip.Members, newTrip.CreatorEmail ?? newTrip.CreatedBy ?? "");
                await _tripsCollection.InsertOneAsync(newTrip);
                if (newTrip.Members != null)
                {
                    foreach (var member in newTrip.Members)
                    {
                        await _emailService.SendInviteEmailAsync(member.Email, newTrip.TripName, member.Role, newTrip.Id!);
                    }
                }
                return Ok(new { message = "Trip saved and invites sent!", tripId = newTrip.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error creating trip: " + ex.Message });
            }
        }

// =========================================================================================
// === ADD THIS NEW ENDPOINT TO YOUR TRIPSCONTROLLER ===
// =========================================================================================
[Authorize]
[HttpGet("user-accessible")]
public async Task<ActionResult<List<Trip>>> GetUserAccessibleTrips()
{
    try
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(userEmail))
            return Unauthorized(new { message = "Invalid token claims." });

        var builder = Builders<Trip>.Filter;

        // Create a flexible filter:
        // 1. You are the creator (by ID)
        // 2. You are the creator (by Email)
        // 3. Your email is in the Members list
        var finalFilter = builder.Or(
            builder.Eq(t => t.CreatedBy, userId),
            builder.Eq(t => t.CreatorEmail, userEmail),
            builder.ElemMatch(t => t.Members, m => m.Email == userEmail)
        );

        // Simple fallback to see the filter structure
Console.WriteLine($"[DEBUG] Final Filter: {finalFilter.ToString()}");

        var trips = await _tripsCollection.Find(finalFilter).ToListAsync();
        
        return Ok(trips);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = "Error: " + ex.Message });
    }
}

        // Add a new place to an existing trip's saved places list
        [HttpPost("{tripId}/add-place")]
        public async Task<IActionResult> AddPlaceToTrip(string tripId, [FromBody] TripPlace place)
        {
            try
            {
                var filter = Builders<Trip>.Filter.Eq(t => t.Id, tripId);
                var update = Builders<Trip>.Update.Push(t => t.SavedPlaces, place);
                var result = await _tripsCollection.UpdateOneAsync(filter, update);

                if (result.MatchedCount == 0)
                    return NotFound(new { message = "Trip not found" });

                return Ok(new { message = "Place added successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error adding place: " + ex.Message });
            }
        }

        // Update existing trip details and log the changes in history
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrip(string id, [FromBody] Trip updatedTrip)
        {
            try
            {
                var oldTrip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
                if (oldTrip == null) return NotFound(new { message = "Trip not found!" });

                // Completed trip block
        var today = DateTime.UtcNow.Date;
        if (oldTrip.EndDate.Date < today)
        {
            return BadRequest(new { message = "This trip has already been completed. Editing is not allowed." });
        }

        // Field validations
        var validationError = ValidateTripData(updatedTrip, isUpdate: true);
        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

                // Prevent updating completed trips
                var todayDate = DateTime.UtcNow.Date;
                if (oldTrip.EndDate.Date < todayDate)
                {
                     return BadRequest(new { message = "This trip has already been completed. Editing is not allowed." });
                 }

                // Ownership and data that the edit form never sends stay as they are
                updatedTrip.CreatedBy = string.IsNullOrEmpty(oldTrip.CreatedBy) ? updatedTrip.CreatedBy : oldTrip.CreatedBy;
                updatedTrip.CreatorEmail = string.IsNullOrEmpty(oldTrip.CreatorEmail) ? updatedTrip.CreatorEmail : oldTrip.CreatorEmail;
                if (updatedTrip.SavedPlaces == null || updatedTrip.SavedPlaces.Count == 0)
                    updatedTrip.SavedPlaces = oldTrip.SavedPlaces;
                if (updatedTrip.Lat == 0 && updatedTrip.Lon == 0)
                {
                    updatedTrip.Lat = oldTrip.Lat;
                    updatedTrip.Lon = oldTrip.Lon;
                }

                var ownerEmail = updatedTrip.CreatorEmail ?? updatedTrip.CreatedBy ?? "";
                updatedTrip.Members = NormalizeMembers(updatedTrip.Members, ownerEmail);
                var oldMembers = NormalizeMembers(oldTrip.Members, ownerEmail);

                var oldEmails = oldMembers.Select(m => m.Email).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var newEmails = updatedTrip.Members.Select(m => m.Email).ToHashSet(StringComparer.OrdinalIgnoreCase);

                // Only members that were not on the trip before get an invitation email
                var addedMembers = updatedTrip.Members
                    .Where(m => !oldEmails.Contains(m.Email))
                    .ToList();
                var removedEmails = oldEmails.Where(e => !newEmails.Contains(e)).ToList();

                string changes = "";
                if (addedMembers.Count > 0)
                    changes += $"Members added: {string.Join(", ", addedMembers.Select(m => m.Email))}. ";

                if (removedEmails.Count > 0)
                    changes += $"Members removed: {string.Join(", ", removedEmails)}. ";

                if ((oldTrip.TripName?.Trim().ToLower() ?? "") != (updatedTrip.TripName?.Trim().ToLower() ?? ""))
                    changes += $"Name: {oldTrip.TripName} -> {updatedTrip.TripName}. ";

                if ((oldTrip.Destination?.Trim().ToLower() ?? "") != (updatedTrip.Destination?.Trim().ToLower() ?? ""))
                    changes += $"Dest: {oldTrip.Destination} -> {updatedTrip.Destination}. ";

                if ((oldTrip.DepartFrom?.Trim().ToLower() ?? "") != (updatedTrip.DepartFrom?.Trim().ToLower() ?? ""))
                    changes += $"Depart From: {oldTrip.DepartFrom} -> {updatedTrip.DepartFrom}. ";

                if ((oldTrip.BudgetLimit?.Trim() ?? "") != (updatedTrip.BudgetLimit?.Trim() ?? ""))
                    changes += $"Budget: {oldTrip.BudgetLimit} -> {updatedTrip.BudgetLimit}. ";

                if ((oldTrip.TransportMode?.Trim() ?? "") != (updatedTrip.TransportMode?.Trim() ?? ""))
                    changes += $"Transport: {oldTrip.TransportMode} -> {updatedTrip.TransportMode}. ";

                if ((oldTrip.Description?.Trim() ?? "") != (updatedTrip.Description?.Trim() ?? ""))
                    changes += $"Description updated. ";

                if (oldTrip.StartDate != updatedTrip.StartDate || oldTrip.EndDate != updatedTrip.EndDate)
                    changes += $"Dates: {oldTrip.StartDate:yyyy-MM-dd} to {oldTrip.EndDate:yyyy-MM-dd} -> {updatedTrip.StartDate:yyyy-MM-dd} to {updatedTrip.EndDate:yyyy-MM-dd}. ";

                if (!string.IsNullOrEmpty(changes))
                {
                    var editorName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Unknown User";
                    var historyEntry = new TripHistory
                    {
                        TripId = id,
                        EditedAt = DateTime.Now,
                        EditedBy = editorName, 
                        Changes = changes
                    };
                    await _historyCollection.InsertOneAsync(historyEntry);
                }

                updatedTrip.Id = id;
                var result = await _tripsCollection.ReplaceOneAsync(t => t.Id == id, updatedTrip);
                if (result.MatchedCount == 0) return NotFound(new { message = "Trip not found in database!" });

                foreach (var member in addedMembers)
                {
                    try
                    {
                        await _emailService.SendInviteEmailAsync(member.Email, updatedTrip.TripName ?? "", member.Role, id);
                    }
                    catch (Exception mailEx)
                    {
                        // A failed invite email must not fail the whole update
                        Console.WriteLine($"[Invite Email Error] {member.Email}: {mailEx.Message}");
                    }
                }

                // ── NEW: keep pending vote boxes in sync with the trip's actual member count.
                // updatedTrip.Members is owner-excluded (via NormalizeMembers), so +1 for the owner.
                // Only Pending discussions update — Confirmed/Rejected stay untouched.
                if (addedMembers.Count > 0 || removedEmails.Count > 0)
                {
                    int newLimit = updatedTrip.Members.Count + 1;
                    await _discussionsService.UpdatePendingMemberLimitsAsync(id, newLimit);

                    // Notify any open Group Chat pages so pending vote boxes update live
                    await _hubContext.Clients.Group(id).SendAsync("MemberLimitChanged", new { tripId = id, newLimit });
                }

                return Ok(new
                {
                    message = "Trip updated successfully!",
                    invitedMembers = addedMembers.Select(m => m.Email),
                    removedMembers = removedEmails
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Update error: " + ex.Message });
            }
        }

        private static string? ValidateTripData(Trip trip, bool isUpdate)
{
    if (trip == null)
        return "Invalid trip data.";

    if (string.IsNullOrWhiteSpace(trip.TripName))
        return "Trip name is required.";

    if (trip.TripName.Trim().Length < 3)
        return "Trip name must be at least 3 characters.";

    if (trip.TripName.Trim().Length > 60)
        return "Trip name cannot exceed 60 characters.";

    if (string.IsNullOrWhiteSpace(trip.DepartFrom))
        return "Departure location is required.";

    if (trip.DepartFrom.Trim().Length < 2 || trip.DepartFrom.Trim().Length > 60)
        return "Departure location must be between 2 and 60 characters.";

    if (string.IsNullOrWhiteSpace(trip.Destination))
        return "Destination is required.";

    if (trip.Destination.Trim().Length < 2 || trip.Destination.Trim().Length > 60)
        return "Destination must be between 2 and 60 characters.";

    // Same location
    if (trip.DepartFrom.Trim().Equals(trip.Destination.Trim(), StringComparison.OrdinalIgnoreCase))
        return "Departure and destination cannot be the same place.";

    // Dates
    if (trip.StartDate == default)
        return "Start date is required.";

    if (trip.EndDate == default)
        return "End date is required.";

    if (trip.EndDate.Date < trip.StartDate.Date)
        return "End date cannot be earlier than the start date.";

    // Start not in past (only on create)
    if (!isUpdate && trip.StartDate.Date < DateTime.UtcNow.Date)
        return "Start date cannot be in the past.";

    // Optional: max duration 60 days
    var duration = (trip.EndDate.Date - trip.StartDate.Date).TotalDays + 1;
    if (duration > 60)
        return "Trip duration cannot exceed 60 days.";

    if (string.IsNullOrWhiteSpace(trip.BudgetLimit))
        return "Budget limit is required.";

    if (string.IsNullOrWhiteSpace(trip.TransportMode))
        return "Transport type is required.";

    if (!string.IsNullOrEmpty(trip.Description) && trip.Description.Length > 500)
        return "Description cannot exceed 500 characters.";

    return null; // valid
}

        // Cleans a member list: trims and lowercases emails, drops blanks, the owner and duplicates
        private static List<TripMember> NormalizeMembers(List<TripMember>? members, string ownerEmail)
        {
            if (members == null) return new List<TripMember>();

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var cleaned = new List<TripMember>();

            foreach (var member in members)
            {
                var email = member.Email?.Trim().ToLowerInvariant() ?? "";
                if (email.Length == 0) continue;
                if (string.Equals(email, ownerEmail?.Trim(), StringComparison.OrdinalIgnoreCase)) continue;
                if (!seen.Add(email)) continue;

                cleaned.Add(new TripMember
                {
                    Email = email,
                    Role = string.IsNullOrWhiteSpace(member.Role) ? "Viewer" : member.Role
                });
            }

            return cleaned;
        }

        // Separate endpoint to get only the history of a specific trip
        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetTripHistory(string id)
        {
            try
            {
                var history = await _historyCollection.Find(h => h.TripId == id)
                                                      .SortByDescending(h => h.EditedAt)
                                                      .ToListAsync();
                return Ok(history);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching history: " + ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTrip(string id)
        {
            try
            {
                var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
                if (trip == null) return NotFound(new { message = "Trip not found!" });

                await _tripsCollection.DeleteOneAsync(t => t.Id == id);
                await _historyCollection.DeleteManyAsync(h => h.TripId == id);

                var db = _tripsCollection.Database;
                var budgetCollection = db.GetCollection<MongoDB.Bson.BsonDocument>("Budgets");

                var objectIdVal = MongoDB.Bson.ObjectId.TryParse(id, out var parsedObjId) ? parsedObjId : (object)id;
                
                var budgetFilter = Builders<MongoDB.Bson.BsonDocument>.Filter.Or(
                    Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("TripId", objectIdVal),
                    Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("TripId", id),
                    Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("tripId", objectIdVal),
                    Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("tripId", id)
                );

                await budgetCollection.DeleteManyAsync(budgetFilter);

                return Ok(new { message = "Trip deleted successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error deleting trip: " + ex.Message });
            }
        }

        [Authorize]
[HttpPost("{id}/leave")]
public async Task<IActionResult> LeaveTrip(string id)
{
    try
    {
        // 1. Get current user identity from JWT
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value;
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("userId")?.Value;
        var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Unknown User";

        if (string.IsNullOrEmpty(userEmail) && string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Invalid user identity." });
        }

        // 2. Load the trip
        var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
        if (trip == null)
        {
            return NotFound(new { message = "Trip not found." });
        }

        // 3. Prevent Owner from using Leave (Owner should Delete the trip instead)
        var isOwner = (!string.IsNullOrEmpty(userId) && trip.CreatedBy == userId) ||
                      (!string.IsNullOrEmpty(userEmail) &&
                       (string.Equals(trip.CreatorEmail, userEmail, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(trip.CreatedBy, userEmail, StringComparison.OrdinalIgnoreCase)));

        if (isOwner)
        {
            return BadRequest(new { message = "Owner cannot leave the trip. Please delete the trip or transfer ownership first." });
        }

        // 4. Check if the user is actually a member
        var memberToRemove = trip.Members?.FirstOrDefault(m =>
            m.Email != null &&
            m.Email.Equals(userEmail, StringComparison.OrdinalIgnoreCase));

        if (memberToRemove == null)
        {
            return BadRequest(new { message = "You are not a member of this trip." });
        }

        // 5. Remove the member from the list
        var updatedMembers = trip.Members
            .Where(m => m.Email == null || !m.Email.Equals(userEmail, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var update = Builders<Trip>.Update.Set(t => t.Members, updatedMembers);
        await _tripsCollection.UpdateOneAsync(t => t.Id == id, update);

        // 6. Log into Edit History
        var historyEntry = new TripHistory
        {
            TripId = id,
            EditedAt = DateTime.Now,
            EditedBy = userName,
            Changes = $"Member left the trip: {userEmail} (was {memberToRemove.Role})."
        };
        await _historyCollection.InsertOneAsync(historyEntry);

        // Optional: update pending vote member limits if you use DiscussionsService
        // int newLimit = updatedMembers.Count + 1; // +1 for owner
        // await _discussionsService.UpdatePendingMemberLimitsAsync(id, newLimit);
        // await _hubContext.Clients.Group(id).SendAsync("MemberLimitChanged", new { tripId = id, newLimit });

        return Ok(new { message = "You have successfully left the trip." });
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = "Error leaving trip: " + ex.Message });
    }
}

    }
}
