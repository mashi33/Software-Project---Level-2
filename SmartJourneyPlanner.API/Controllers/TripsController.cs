using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using MailKit.Net.Smtp;
using MimeKit;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/trips")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;
        private readonly IMongoCollection<TripHistory> _historyCollection;

        // Constructor to initialize MongoDB collections
        public TripsController(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
            _historyCollection = database.GetCollection<TripHistory>("TripHistories");
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
                    trip.Description,
                    trip.Members,
                    trip.SavedPlaces,
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
                        await SendInviteEmail(member.Email, newTrip.TripName, member.Role, newTrip.Id!);
                    }
                }
                return Ok(new { message = "Trip saved and invites sent!", tripId = newTrip.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error creating trip: " + ex.Message });
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
        
        // Helper method to send invitation emails with full HTML styling
        private async Task SendInviteEmail(string receiverEmail, string tripName, string role, string tripId)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("Smart Journey", "dinuriththsarani@gmail.com"));
                message.To.Add(new MailboxAddress("", receiverEmail));
                message.Subject = "Trip Invitation - Smart Journey";

                string invitationLink = $"http://localhost:4200/login?tripId={tripId}&role={role.ToLower()}";

                // Your original HTML design maintained 100%
                message.Body = new TextPart("html")
                {
                    Text = $@"
                    <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
                        <h2 style=""color: #007bff;"">Hi there!</h2>
                        <p>You have been invited to join the trip <b>'{tripName}'</b> as a <b>{role}</b>.</p>
                        <p>To view the trip details and join your friends, please click the button below:</p>
                        <div style=""margin: 30px 0;"">
                            <a href=""{invitationLink}"" style=""background-color: #007bff; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"">Accept Invitation & View Details</a>
                        </div>
                        <p style=""font-size: 14px; color: #666;"">If you don't have an account yet, you'll be asked to create one after clicking the button.</p>
                        <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
                        <p>Happy Journey!<br><b>Smart Journey Team</b></p>
                    </div>"
                };

                using (var client = new SmtpClient())
                {
                    await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
                    await client.AuthenticateAsync("dinuriththsarani@gmail.com", "ejuh wevn elec dkpn");
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }
                Console.WriteLine($"✅ Email sent successfully to {receiverEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to send email to {receiverEmail}: {ex.Message}");
            }
        }
    }
}