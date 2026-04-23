using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Interfaces;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// ==========================================================
// DATABASE CONFIG
// ==========================================================

// 1. Tell the app to use MongoDBSettings
builder.Services.Configure<MongoDBSettings>(
    builder.Configuration.GetSection("MongoDBSettings"));

builder.Services.Configure<DatabaseSettings>(
    builder.Configuration.GetSection("DatabaseSettings"));

// 2. Get the settings section for connection logic
var mongoDbSettingsSection = builder.Configuration.GetSection("MongoDBSettings");

// 3. Extract the connection details
var connectionString = mongoDbSettingsSection["ConnectionString"];
var databaseName = mongoDbSettingsSection["DatabaseName"];

// 4. Register the Client and Database globally
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(databaseName);
});

// ==========================================================
// JWT AUTHENTICATION
// ==========================================================

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
  options.TokenValidationParameters = new TokenValidationParameters
  {
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,
    ValidIssuer = builder.Configuration["Jwt:Issuer"],
    ValidAudience = builder.Configuration["Jwt:Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? ""))
  };
});

// ==========================================================
// SIGNALR & CONTROLLERS
// ==========================================================

builder.Services.AddSignalR(options =>
{
  options.EnableDetailedErrors = true;
})
.AddJsonProtocol(options =>
{
  options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers()
.AddJsonOptions(options =>
{
  options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
  options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});

// ==========================================================
// CORS
// ==========================================================

builder.Services.AddCors(options =>
{
  options.AddPolicy("AllowAngularApp", policy =>
  {
    policy.WithOrigins("http://localhost:4200")
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials();
  });
});

// ==========================================================
// SERVICES REGISTRATION
// ==========================================================

builder.Services.AddSingleton<AdminService>(); 
builder.Services.AddSingleton<BudgetService>();
builder.Services.AddSingleton<TimelineService>();
builder.Services.AddSingleton<DiscussionsService>();
builder.Services.AddSingleton<CommentsService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddSingleton<FileStorageService>();
builder.Services.AddSingleton<TransportVehicleService>();
builder.Services.AddSingleton<TransportBookingService>();

// ==========================================================
// BUILD & MIDDLEWARE
// ==========================================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();
