using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Load MongoDB Settings
builder.Services.Configure<MongoDBSettings>(
    builder.Configuration.GetSection("MongoDBSettings"));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Register Services (ONLY using what you have)
builder.Services.AddSingleton<TripService>();
builder.Services.AddSingleton<BudgetService>();

// 3. Add CORS (This lets your Frontend talk to this Backend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// 4. Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAngular"); // This turns on the connection for the UI
app.UseAuthorization();
app.MapControllers();

app.Run();