using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Bson;
using MongoDB.Driver.GridFS;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Controllers
{
    // Swagger ගැටලුව විසඳීමට අවශ්‍ය DTO (Data Transfer Object) පන්තිය
    public class FileUploadDto
    {
        public IFormFile File { get; set; } = null!;
        public string User { get; set; } = "Guest User";
    }

    [Route("api/[controller]")]
    [ApiController]
    public class FileController : ControllerBase
    {
        private readonly FileStorageService _fileStorage;
        private readonly CommentsService _commentsService;
        private readonly IHubContext<ChatHub> _hubContext;

        private const long MaxFileSize = 20 * 1024 * 1024; // 20 MB

        public FileController(
            FileStorageService fileStorage,
            CommentsService commentsService,
            IHubContext<ChatHub> hubContext)
        {
            _fileStorage = fileStorage;
            _commentsService = commentsService;
            _hubContext = hubContext;
        }

        // POST api/file/upload
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Upload([FromForm] FileUploadDto dto) // ✅ DTO භාවිතා කර Swagger ගැටලුව විසඳා ඇත
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest("No file provided.");

            if (dto.File.ContentType != "application/pdf")
                return BadRequest("Only PDF files are allowed.");

            if (dto.File.Length > MaxFileSize)
                return BadRequest("File size must not exceed 20 MB.");

            try
            {
                // 1. Store file in GridFS
                using var stream = dto.File.OpenReadStream();
                var fileId = await _fileStorage.UploadAsync(stream, dto.File.FileName);

                // 2. Save message record to MongoDB
                var comment = new CommentItem
                {
                    User = dto.User,
                    Text = string.Empty,
                    MessageType = "pdf",
                    FileId = fileId,
                    FileName = dto.File.FileName,
                    FileSize = dto.File.Length,
                    CreatedAt = DateTime.UtcNow
                };

                await _commentsService.CreateAsync(comment);

                // 3. Broadcast to all clients via SignalR
                await _hubContext.Clients.All.SendAsync("ReceiveComment", comment);

                return Ok(new { fileId, messageId = comment.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FileController] Upload error: {ex.Message}");
                return StatusCode(500, "File upload failed.");
            }
        }

        // GET api/file/download/{fileId}
        [HttpGet("download/{fileId}")]
        public async Task<IActionResult> Download(string fileId)
        {
            try
            {
                // check the object ID
                if (!ObjectId.TryParse(fileId, out var objectId))
                {
                    return BadRequest("Invalid file ID format.");
                }
                // var භාවිතා කිරීමෙන් compiler එක නිවැරදි වර්ගය තෝරා ගනී
                var stream = await _fileStorage.DownloadAsync(fileId);

                if (stream == null)
                {
                    return NotFound("File stream is null.");
                }

                // GridFS stream එකක් නම් පමණක් Filename එක ලබා ගැනීමට උත්සාහ කරන්න
                string fileName = "download.pdf";
                if (stream is GridFSDownloadStream<ObjectId> gridStream)
                {
                    fileName = gridStream.FileInfo.Filename;
                }

                return File(stream, "application/pdf", fileName);
            }
            catch (GridFSFileNotFoundException)
            {
                return NotFound("File not found in MongoDB GridFS.");
            }
            catch (Exception)
            {
                return NotFound("File not found.");
            }
        }

        // GET api/file/view/{fileId}
        [HttpGet("view/{fileId}")]
        public async Task<IActionResult> ViewFile(string fileId)
        {
            try
            {
                if (!ObjectId.TryParse(fileId, out _)) return BadRequest("Invalid ID");

                var stream = await _fileStorage.DownloadAsync(fileId);
                if (stream == null) return NotFound();

                // මෙහි 3 වැනි parameter එක (filename) ලබා නොදෙන්න. 
                // එවිට header එක Content-Disposition: inline ලෙස සැකසේ.
                return File(stream, "application/pdf");
            }
            catch (Exception) { return NotFound(); }
        }
    }
}