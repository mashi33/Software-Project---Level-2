using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using SmartJourneyPlanner.API.Models; 
using SmartJourneyPlanner.API.DTOs;
using BCryptNet = BCrypt.Net.BCrypt;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase 
    {
        private readonly IMongoCollection<User> _users;
        private readonly IConfiguration _configuration;

        public AuthController(IMongoDatabase database, IConfiguration configuration)
        {
            _users = database.GetCollection<User>("Users");
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDto model)
        {
            string passwordHash = BCryptNet.HashPassword(model.Password);

            var newUser = new User
            {
                FullName = model.FullName,
                Email = model.Email,
                PasswordHash = passwordHash,
                UserType = model.UserType, // "Traveller", "TransportProvider", or "Admin"
                IsBlocked = false // Default new users to unblocked
            };

            await _users.InsertOneAsync(newUser);
            var checkUser = await _users.Find(u => u.Email == model.Email).FirstOrDefaultAsync();

            if (checkUser != null)
            {
                return Ok(new { 
                    message = "User registered and verified in DB!", 
                    savedEmail = checkUser.Email,
                    databaseName = _users.Database.DatabaseNamespace.DatabaseName, 
                    collectionName = _users.CollectionNamespace.CollectionName     
                });
            }

            return BadRequest(new { message = "Data was sent but could not be verified in Database." });
        }
        
        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto request)
        {
            var user = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest("User not found.");
            }

            // ✅ SECURITY CHECK: Prevent blocked users from logging in
            if (user.IsBlocked)
            {
                return StatusCode(403, new { message = "Your account has been suspended. Please contact the administrator." });
            }

            if (!BCryptNet.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Wrong password.");
            }

            var token = CreateToken(user); 
            
            return Ok(new { 
                token = token,
                message = "Login successful!", 
                userType = user.UserType,
                userId = user.Id,
                username = user.FullName
            });
        }
        
        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] User user)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
            user.IsBlocked = false; // Ensure they aren't blocked by default
            await _users.InsertOneAsync(user);
            return Ok(new { message = "User saved successfully!" });
        }

        private string CreateToken(User user) 
        {
            var claims = new List<Claim>
            {
                // ✅ Using Null-Forgiving operator or fallback for strings that might be null
                new Claim(ClaimTypes.Name, user.FullName ?? "User"), 
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.UserType ?? "Traveller"),
                new Claim("userId", user.Id?.ToString() ?? ""),
                // Check if user is Admin for frontend role guards
                new Claim("isBlocked", user.IsBlocked.ToString())
            };

            // ✅ FIXED: Null-safe key retrieval to resolve CS8604
            var jwtKey = _configuration["Jwt:Key"] ?? "YourFallbackVeryLongSecretKeyHere_MustBe32Chars!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

