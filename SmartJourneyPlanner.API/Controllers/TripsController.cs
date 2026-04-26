using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using MailKit.Net.Smtp;
using MimeKit;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;//Inject Trip collection
        private readonly IMongoCollection<TripHistory> _historyCollection;//Inject TripHistory collection

        public TripsController(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
            _historyCollection = database.GetCollection<TripHistory>("TripHistories");
        }

        [HttpPost] // Create a new trip and send invites to members
        public async Task<IActionResult> CreateTrip([FromBody]Trip newTrip) 
        {
            try
            {
                await _tripsCollection.InsertOneAsync(newTrip); // Save the new trip to MongoDB

                if (newTrip.Members != null)
                {
                    foreach (var member in newTrip.Members)
                    {
                        // call the mothod of send email
                        await SendInviteEmail(member.Email, newTrip.TripName, member.Role, newTrip.Id!);
                    }
                }

                return Ok(new { message = "Trip saved and invites sent!", tripId = newTrip.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error: " + ex.Message });
            }
        }

        [HttpGet("{id}")] // Get a trip by ID (for testing and verification)
        public async Task<IActionResult> GetTrip(string id)
        {
            try
           {
            var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync(); // Find the trip by ID in MongoDB

                 if (trip == null)
                 {
                   return NotFound(new { message = "Trip not found in database!" });
                }

                var history = await _historyCollection.Find(h => h.TripId == id)
                                              .SortByDescending(h => h.EditedAt)
                                              .ToListAsync();

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
            EditHistory = history 
        });
           }
            catch (Exception ex)
            {
                 return BadRequest(new { message = "Error: " + ex.Message });
            }
       }

       [HttpPut("{id}")]
       public async Task<IActionResult> UpdateTrip(string id, [FromBody] Trip updatedTrip) // Update a trip and log changes to history
       {
       try
       {
           var oldTrip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync(); // Get the existing trip data from MongoDB
           if (oldTrip == null) 
            return NotFound(new { message = "Trip not found!" });

           string changes = "";
                 // Compare each field and build a change log string
           if ((oldTrip.TripName?.Trim().ToLower() ?? "") != (updatedTrip.TripName?.Trim().ToLower() ?? ""))
           changes += $"Name: {oldTrip.TripName} -> {updatedTrip.TripName}. ";

           if ((oldTrip.Destination?.Trim().ToLower() ?? "") != (updatedTrip.Destination?.Trim().ToLower() ?? ""))
           changes += $"Dest: {oldTrip.Destination} -> {updatedTrip.Destination}. ";

           if ((oldTrip.DepartFrom?.Trim().ToLower() ?? "") != (updatedTrip.DepartFrom?.Trim().ToLower() ?? ""))
           changes += $"From: {oldTrip.DepartFrom} -> {updatedTrip.DepartFrom}. ";

           if ((oldTrip.BudgetLimit?.Trim().ToLower() ?? "") != (updatedTrip.BudgetLimit?.Trim().ToLower() ?? ""))
           changes += $"Budget: {oldTrip.BudgetLimit} -> {updatedTrip.BudgetLimit}. ";

           if (oldTrip.StartDate != updatedTrip.StartDate || oldTrip.EndDate != updatedTrip.EndDate)
           {
               changes += $"Dates: {oldTrip.StartDate:yyyy-MM-dd} to {oldTrip.EndDate:yyyy-MM-dd} -> {updatedTrip.StartDate:yyyy-MM-dd} to {updatedTrip.EndDate:yyyy-MM-dd}. ";
           }        

            Console.WriteLine($"Changes detected: '{changes}'");
       
            if (!string.IsNullOrEmpty(changes))
           {
                    var historyEntry = new TripHistory //   Create a new history record with the changes
                    {
                        TripId = id,
                        EditedAt = DateTime.Now,
                        EditedBy = "User", // In a real world application, replace with actual user info from auth context
                        Changes = changes
                    };
                    await _historyCollection.InsertOneAsync(historyEntry);
                    Console.WriteLine("✅ History record successfully saved to MongoDB!");
            }else
            {
                    Console.WriteLine("⚠️ No changes detected between old and new data.");
            }
        
             updatedTrip.Id = id; // Ensure the ID remains the same for the update
  
            // Update the trip in MongoDB with the new data
             var result = await _tripsCollection.ReplaceOneAsync(t => t.Id == id, updatedTrip);
             Console.WriteLine($"Update Result: Matched={result.MatchedCount}, Modified={result.ModifiedCount}");

             if (result.MatchedCount == 0)
            {
                return NotFound(new { message = "Trip not found in database!" });
           }

             return Ok(new { message = "Trip updated successfully!" });
         }
          catch (Exception ex)
         {
             // Handle any errors that occur during the update process
              return BadRequest(new { message = "Update error: " + ex.Message });
        }
        
        }

        // Get the edit history of a trip by its ID
         [HttpGet("{id}/history")]
        public async Task<IActionResult> GetTripHistory(string id)
        {
            try
            {   
                // Fetch all history records for the specified trip ID, sorted by most recent edits first
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

        private async Task SendInviteEmail(string receiverEmail, string tripName, string role, string tripId) // Method to send an email invitation to a trip member
        {
            try
            {   
                // Create the email message using MimeKit
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("Smart Journey", "dinuriththsarani@gmail.com"));
                message.To.Add(new MailboxAddress("", receiverEmail));
                message.Subject = "Trip Invitation - Smart Journey";
                
                string invitationLink = $"http://localhost:4200/login?tripId={tripId}&role={role.ToLower()}"; // link with trip id
                message.Body = new TextPart("html")

            {
                 Text = $@"
            <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
                <h2 style=""color: #007bff;"">Hi there!</h2>
                <p>You have been invited to join the trip <b>'{tripName}'</b> as a <b>{role}</b>.</p>
                <p>To view the trip details and join your friends, please click the button below:</p>
        
                <div style=""margin: 30px 0;"">
                <a href=""{invitationLink}"" 
                style=""background-color: #007bff; 
                      color: #ffffff !important; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold; 
                      display: inline-block;
                      font-size: 16px;"">
               Accept Invitation & View Details
               </a>
               </div>

               <p style=""font-size: 14px; color: #666;"">
                    If you don't have an account yet, you'll be asked to create one after clicking the button.
               </p>
               <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
              <p>Happy Journey!<br><b>Smart Journey Team</b></p>
            </div>"
            };

                using (var client = new SmtpClient())
                {
                    await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);// Use Gmail's SMTP server with STARTTLS on port 587
                    
                    // Authenticate with your email and app password (make sure to use an app password if you have 2FA enabled on your Gmail account)
                    await client.AuthenticateAsync("dinuriththsarani@gmail.com", "ejuh wevn elec dkpn");// Use your actual email and app password here
                    
                    await client.SendAsync(message);// Send the email message
                    await client.DisconnectAsync(true);// Disconnect from the SMTP server
                }
                Console.WriteLine($"✅ Email sent to {receiverEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to send email to {receiverEmail}: {ex.Message}");
            }
        }
    }
}