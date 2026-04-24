using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using MailKit.Net.Smtp;
using MimeKit;
using System.Collections.Generic; // ✅ Required for List<>
using System.Threading.Tasks;    // ✅ Required for Task<>
using System;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;

        public TripsController(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
        }
    
     

        

        [HttpPost]
        public async Task<IActionResult> CreateTrip([FromBody]Trip newTrip)
        {
            try
            {
                await _tripsCollection.InsertOneAsync(newTrip);

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


        [HttpGet("{id}")]
public async Task<IActionResult> GetTrip(string id)
{
    try
    {
        // MongoDB එකේ ID එක අනුව Trip එක හොයනවා
        var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();

        if (trip == null)
        {
            return NotFound(new { message = "Trip not found in database!" });
        }

        return Ok(trip);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = "Error: " + ex.Message });
    }
}

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrip(string id, [FromBody] Trip updatedTrip)
        {
            try
            {
                // 1. URL එකේ තියෙන ID එක Trip එකේ ඇතුළටත් දානවා (ෂුවර් වෙන්න)
                updatedTrip.Id = id;

                // 2. MongoDB Update එක කරනවා
                var result = await _tripsCollection.ReplaceOneAsync(t => t.Id == id, updatedTrip);

                if (result.MatchedCount == 0)
                {
                    return NotFound(new { message = "Trip not found in database!" });
                }

                return Ok(new { message = "Trip updated successfully!" });
            }
            catch (Exception ex)
            {
                // මොකක් හරි error එකක් ආවොත් ඒක මෙතනින් බලාගන්න පුළුවන්
                return BadRequest(new { message = "Update error: " + ex.Message });
            }
        }
        private async Task SendInviteEmail(string receiverEmail, string tripName, string role, string tripId)
        {
            try
            {
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
                    await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
                    
           
                    await client.AuthenticateAsync("dinuriththsarani@gmail.com", "ejuh wevn elec dkpn");
                    
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
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