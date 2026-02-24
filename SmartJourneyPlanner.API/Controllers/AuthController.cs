/*
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.API.DTOs;
using SmartJourneyPlanner.API.Models;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace SmartJourneyPlanner.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IMongoCollection<User> _users;
        private readonly IConfiguration _configuration;
        

        public AuthController(IOptions<MongoDbSettings> settings, IConfiguration configuration)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>("Users");
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDto model)
        {
           
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);

            var newUser = new User
            {
                FullName = model.FullName,
                Email = model.Email,
                PasswordHash = passwordHash,
                UserType = model.UserType // "Traveller" or "TransportProvider"
            };

            await _users.InsertOneAsync(newUser);
            return Ok(new { message = "User registered successfully!" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto request)
        {
            // 1. Email එක අනුව පරිශීලකයා සොයා ගැනීම
            var user = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest("User not found.");
            }

            // 2. Password එක නිවැරදිදැයි පරීක්ෂා කිරීම (BCrypt භාවිතා කරමින්)
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Wrong password.");
            }

            // 3. සාර්ථක නම් පිළිතුරක් ලබා දීම
            var token = CreateToken(user);
            // 66 වන පේළිය මෙසේ වෙනස් කරන්න
            return Ok(new { token = token, message = "Login successful!", userType = user.UserType });
        }

        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] User user)
        {
            // 1. Password එක සේව් කිරීමට පෙර Hash කිරීම හොඳ පුරුද්දකි
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
            // Frontend එකෙන් එවන දත්ත MongoDB එකට ඇතුළත් කිරීම
            await _users.InsertOneAsync(user);
            return Ok(new { message = "User saved successfully!" });
        }

        private string CreateToken(User user)
        {
            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.Name, user.FullName),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Role, user.UserType)
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
*/
