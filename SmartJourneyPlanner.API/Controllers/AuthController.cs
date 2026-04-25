using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using SmartJourneyPlanner.API.Models; // User සහ MongoDbSettings තියෙන්නේ මෙතන නම්
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
            //var client = new MongoClient(settings.Value.ConnectionString);
            //var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>("Users");
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDto model)
        {
            // hash the password
            string passwordHash = BCryptNet.HashPassword(model.Password);

            var newUser = new User
            {
                FullName = model.FullName,
                Email = model.Email,
                PasswordHash = passwordHash,
                UserType = model.UserType // "Traveller" or"TransportProvider"
            };
             await _users.InsertOneAsync(newUser);
            var checkUser = await _users.Find(u => u.Email == model.Email).FirstOrDefaultAsync();

    if (checkUser != null)
    {
        return Ok(new { 
            message = "User registered and verified in DB!", 
            savedEmail = checkUser.Email,
            databaseName = _users.Database.DatabaseNamespace.DatabaseName, // මෙතනින් DB එකේ නම පේනවා
            collectionName = _users.CollectionNamespace.CollectionName     // මෙතනින් Collection නම පේනවා
        });
    }

             return BadRequest(new { message = "Data was sent but could not be verified in Database." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto request)
        {
            // 1. select user by email
            var user = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest("User not found.");
            }

            // 2. check the password is correct(using Bcrypt)
           if (!BCryptNet.Verify(request.Password, user.PasswordHash))
           {
                    return BadRequest("Wrong password.");
                 }

            
            var token = CreateToken(user);
            
            return Ok(new { token = token, message = "Login successful!", userType = user.UserType });
        }

        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] User user)
        {
            
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
            // send the data to mongoDB
            await _users.InsertOneAsync(user);
            return Ok(new { message = "User saved successfully!" });
        }

        private string CreateToken(User user)
        {
            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.Name, user.FullName),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Role, user.UserType ?? "Traveler")
    };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
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

