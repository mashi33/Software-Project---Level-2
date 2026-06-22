using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class UserBlockService
    {
        private readonly IMongoCollection<User> _users;

        public UserBlockService(IMongoDatabase database)
        {
            _users = database.GetCollection<User>("Users");
        }

        public async Task ExpireTemporaryBlocksAsync()
        {
            var filter = Builders<User>.Filter.And(
                Builders<User>.Filter.Eq(u => u.IsBlocked, true),
                Builders<User>.Filter.Eq(u => u.BlockType, "Temporary"),
                Builders<User>.Filter.Lte(u => u.BlockedUntil, DateTime.UtcNow)
            );

            await _users.UpdateManyAsync(filter, BuildUnblockUpdate());
        }

        public async Task<(bool IsBlocked, string? Message)> ResolveBlockStatusAsync(User user)
        {
            if (!user.IsBlocked)
                return (false, null);

            if (user.BlockType == "Temporary" && user.BlockedUntil.HasValue)
            {
                if (DateTime.UtcNow >= user.BlockedUntil.Value)
                {
                    await UnblockUserAsync(user.Id!);
                    return (false, null);
                }

                return (true, $"Your account is suspended until {user.BlockedUntil.Value:MMMM dd, yyyy}. Please try again after that date.");
            }

            if (user.BlockType == "Permanent")
            {
                return (true, "Your account has been permanently suspended. Please contact the administrator.");
            }

            return (true, "Your account has been suspended. Please contact the administrator.");
        }

        public async Task<User?> BlockUserTemporaryAsync(string userId)
        {
            var user = await GetUserOrNull(userId);
            if (user == null) return null;
            if (user.UserType == "Admin") throw new InvalidOperationException("Cannot block an admin account.");

            var blockedUntil = DateTime.UtcNow.AddDays(14);
            var update = Builders<User>.Update
                .Set(u => u.IsBlocked, true)
                .Set(u => u.BlockType, "Temporary")
                .Set(u => u.BlockedAt, DateTime.UtcNow)
                .Set(u => u.BlockedUntil, blockedUntil);

            await _users.UpdateOneAsync(BuildIdFilter(userId), update);
            user.IsBlocked = true;
            user.BlockType = "Temporary";
            user.BlockedAt = DateTime.UtcNow;
            user.BlockedUntil = blockedUntil;
            return user;
        }

        public async Task<User?> BlockUserPermanentAsync(string userId)
        {
            var user = await GetUserOrNull(userId);
            if (user == null) return null;
            if (user.UserType == "Admin") throw new InvalidOperationException("Cannot block an admin account.");

            var update = Builders<User>.Update
                .Set(u => u.IsBlocked, true)
                .Set(u => u.BlockType, "Permanent")
                .Set(u => u.BlockedAt, DateTime.UtcNow)
                .Unset(u => u.BlockedUntil);

            await _users.UpdateOneAsync(BuildIdFilter(userId), update);
            user.IsBlocked = true;
            user.BlockType = "Permanent";
            user.BlockedAt = DateTime.UtcNow;
            user.BlockedUntil = null;
            return user;
        }

        public async Task<User?> UnblockUserAsync(string userId)
        {
            var user = await GetUserOrNull(userId);
            if (user == null) return null;

            await _users.UpdateOneAsync(BuildIdFilter(userId), BuildUnblockUpdate());
            user.IsBlocked = false;
            user.BlockType = null;
            user.BlockedAt = null;
            user.BlockedUntil = null;
            return user;
        }

        private async Task<User?> GetUserOrNull(string userId) =>
            await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();

        private static FilterDefinition<User> BuildIdFilter(string userId) =>
            Builders<User>.Filter.Eq(u => u.Id, userId);

        private static UpdateDefinition<User> BuildUnblockUpdate() =>
            Builders<User>.Update
                .Set(u => u.IsBlocked, false)
                .Unset(u => u.BlockType)
                .Unset(u => u.BlockedAt)
                .Unset(u => u.BlockedUntil);
    }
}
