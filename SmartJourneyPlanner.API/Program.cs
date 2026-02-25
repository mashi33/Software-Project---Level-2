using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// --- DATABASE SETTINGS START ---
// Read settings from appsettings.json 
var dbSettingsSection = builder.Configuration.GetSection("DatabaseSettings");
builder.Services.Configure<DatabaseSettings>(dbSettingsSection);

// When system begin, Connection check and display on console
var connectionString = dbSettingsSection["ConnectionString"];
var databaseName = dbSettingsSection["DatabaseName"];

Console.WriteLine("================================================");
Console.WriteLine($"SERVER STARTING...");
Console.WriteLine($"TARGET CONNECTION: {connectionString}");
Console.WriteLine($"TARGET DATABASE: {databaseName}");
Console.WriteLine("================================================");

// register MongoDB Client as  Singleton
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    
    return new MongoClient(connectionString);
});
// --- DATABASE SETTINGS END ---

// 1. SignalR
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
})
.AddJsonProtocol(options => {
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// DiscussionsService
builder.Services.AddSingleton<DiscussionsService>();

// CommentsService
builder.Services.AddSingleton<CommentsService>();

// 4. CORS Setup
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 5. Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("AllowAngular");
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();