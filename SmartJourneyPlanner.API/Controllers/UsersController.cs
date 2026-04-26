using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    // MongoDB collection for Users
    private readonly IMongoCollection<User> _usersCollection;

    // Constructor to inject MongoDB database and get the Users collection
    public UsersController(IMongoDatabase database)
    {
        _usersCollection = database.GetCollection<User>("Users");
    }

    // 1. GET: api/users/{id}
    // Retrieve user profile details by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUserProfile(string id)
    {
        // Find the user in the database using the given ID
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();

        // If user not found, return 404
        if (user == null) return NotFound();
        
        // Do NOT send password to the client (security best practice)
        user.PasswordHash = null; 
        
        // Return user data
        return Ok(user);
    }

    // 2. PUT: api/users/{id}
    // Update user profile information
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(string id, User updatedUser)
    {
        // Find existing user
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();

        // If user not found, return 404
        if (user == null) return NotFound();

        // Update only specific fields (avoid overwriting entire object unnecessarily)
        user.Bio = updatedUser.Bio;
        user.Location = updatedUser.Location;
        user.Interests = updatedUser.Interests;

        // Replace the existing user document with updated data
        await _usersCollection.ReplaceOneAsync(u => u.Id == id, user);

        // Return success message
        return Ok(new { message = "Profile updated successfully!" });
    }
}