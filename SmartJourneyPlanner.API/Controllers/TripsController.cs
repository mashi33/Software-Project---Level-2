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

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/trips")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;
        private readonly IMongoCollection<TripHistory> _historyCollection;
        private readonly SmartJourneyPlanner.API.Services.EmailService _emailService;

        // Constructor to initialize MongoDB collections
        public TripsController(IMongoClient mongoClient, SmartJourneyPlanner.API.Services.EmailService emailService)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
            _historyCollection = database.GetCollection<TripHistory>("TripHistories");
            _emailService = emailService;
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
                var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
                if (trip == null) return NotFound(new { message = "Trip not found in database!" });

                var history = await _historyCollection.Find(h => h.TripId == id)
                                                      .SortByDescending(h => h.EditedAt)
                                                      .ToListAsync();

                // Returning trip details combined with its edit history
                return Ok(new {
                    trip.Id,
                    trip.TripName,
                    trip.DepartFrom,
                    trip.Destination,
                    trip.StartDate,
                    trip.EndDate,
                    trip.BudgetLimit,
                    trip.TransportMode,
                    trip.Description,
                    trip.Members,
                    trip.SavedPlaces,
                    trip.CreatedBy,
                    EditHistory = history
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching trip: " + ex.Message });
            }
        }

        // Fetch trips where the user is either the creator or a member
        [HttpGet("by-email/{email}")]
        public async Task<ActionResult<List<Trip>>> GetTripsByEmail(string email)
        {
            try
            {
                var filter = Builders<Trip>.Filter.Or(
                    Builders<Trip>.Filter.Eq(t => t.CreatedBy, email),
                    Builders<Trip>.Filter.ElemMatch(t => t.Members, m => m.Email == email)
                );
                var trips = await _tripsCollection.Find(filter).ToListAsync();
                return Ok(trips);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching trips: " + ex.Message });
            }
        }

        // Dashboard data for logged-in user only
[Authorize] // 🔥 CRITICAL: Force .NET to validate the JWT token header before running this code
[HttpGet("dashboard")] // Notice we removed "/{userId}" from the route path!
public async Task<IActionResult> GetDashboardData()
{
    try
    {

        // 🔥 SAFEST WAY: Extract the User ID safely from the cryptographically verified token claims matrix
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

        // 2. If that fails or fetches an email, try checking for your custom 'userId' claim key payload
        if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(userEmail))
            return Unauthorized(new { message = "Invalid user identity." });

        var builder = Builders<Trip>.Filter;
       // 🔥 FIX: This filter now includes Creator (ID or Email) OR Member status
        var userFilter = builder.Or(
            builder.Eq(t => t.CreatedBy, userId),
            builder.Eq(t => t.CreatorEmail, userEmail),
            builder.ElemMatch(t => t.Members, m => m.Email == userEmail)
        );
                var userTrips = await _tripsCollection
                    .Find(userFilter)
                    .ToListAsync();

                // 🔥 FIX 2: Compute UTC baseline cleanly to prevent localized time shift bugs
                var today = DateTime.Today;
        // Upcoming trips
        var upcomingTrips = userTrips
            .Where(t => t.StartDate.Date > today)
            .ToList();

        // Completed trips
        var completedTrips = userTrips
            .Where(t => t.EndDate.Date < today)
            .ToList();

        // Ongoing trips
        var ongoingTrips = userTrips
            .Where(t => t.StartDate.Date <= today && t.EndDate.Date >= today)
            .ToList();

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
        lon = t.Lon
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
                lon = t.Lon
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
                lon = t.Lon
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
// =========================================================================================

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

                string changes = "";
                if ((oldTrip.TripName?.Trim().ToLower() ?? "") != (updatedTrip.TripName?.Trim().ToLower() ?? ""))
                    changes += $"Name: {oldTrip.TripName} -> {updatedTrip.TripName}. ";

                if ((oldTrip.Destination?.Trim().ToLower() ?? "") != (updatedTrip.Destination?.Trim().ToLower() ?? ""))
                    changes += $"Dest: {oldTrip.Destination} -> {updatedTrip.Destination}. ";

                if (oldTrip.StartDate != updatedTrip.StartDate || oldTrip.EndDate != updatedTrip.EndDate)
                    changes += $"Dates: {oldTrip.StartDate:yyyy-MM-dd} to {oldTrip.EndDate:yyyy-MM-dd} -> {updatedTrip.StartDate:yyyy-MM-dd} to {updatedTrip.EndDate:yyyy-MM-dd}. ";

                if (!string.IsNullOrEmpty(changes))
                {
                    var historyEntry = new TripHistory
                    {
                        TripId = id,
                        EditedAt = DateTime.Now,
                        EditedBy = "User", 
                        Changes = changes
                    };
                    await _historyCollection.InsertOneAsync(historyEntry);
                }

                updatedTrip.Id = id;
                var result = await _tripsCollection.ReplaceOneAsync(t => t.Id == id, updatedTrip);
                if (result.MatchedCount == 0) return NotFound(new { message = "Trip not found in database!" });

                return Ok(new { message = "Trip updated successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Update error: " + ex.Message });
            }
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

                return Ok(new { message = "Trip deleted successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error deleting trip: " + ex.Message });
            }
        }

    }
}