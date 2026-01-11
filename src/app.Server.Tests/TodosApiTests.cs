using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Xunit;

public class TodosApiTests : IClassFixture<MsSqlFixture>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly MsSqlFixture _fixture;

    public TodosApiTests(MsSqlFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task TodoLifecycleWorksAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var databaseName = $"todos_{Guid.NewGuid():N}";

        using var factory = CreateFactory(databaseName);
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Container item", null, null, null),
            cancellationToken);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<TodoItemDto>(JsonOptions, cancellationToken);
        Assert.NotNull(created);

        var updateResponse = await client.PatchAsJsonAsync(
            $"/api/todos/{created!.Id}",
            new UpdateTodoRequest(null, null, null, null, true, false),
            cancellationToken);

        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<TodoItemDto>(JsonOptions, cancellationToken);
        Assert.NotNull(updated);
        Assert.True(updated!.IsCompleted);

        var deleteResponse = await client.DeleteAsync($"/api/todos/{created.Id}", cancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getDeletedResponse = await client.GetAsync($"/api/todos/{created.Id}", cancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, getDeletedResponse.StatusCode);

        var restoreResponse = await client.PostAsync($"/api/todos/{created.Id}/restore", null, cancellationToken);
        restoreResponse.EnsureSuccessStatusCode();

        var getRestoredResponse = await client.GetAsync($"/api/todos/{created.Id}", cancellationToken);
        getRestoredResponse.EnsureSuccessStatusCode();

        var listResponse = await client.GetAsync("/api/todos", cancellationToken);
        listResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<List<TodoItemDto>>(JsonOptions, cancellationToken);
        Assert.NotNull(list);
        Assert.Contains(list!, item => item.Id == created.Id);
    }

    [Fact]
    public async Task FilteringByCompletedReturnsOnlyCompletedAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var databaseName = $"todos_{Guid.NewGuid():N}";

        using var factory = CreateFactory(databaseName);
        using var client = factory.CreateClient();

        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("First", null, null, null),
            cancellationToken);
        var second = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Second", null, null, null),
            cancellationToken);

        var secondItem = await second.Content.ReadFromJsonAsync<TodoItemDto>(JsonOptions, cancellationToken);
        Assert.NotNull(secondItem);

        await client.PatchAsJsonAsync(
            $"/api/todos/{secondItem!.Id}",
            new UpdateTodoRequest(null, null, null, null, true, false),
            cancellationToken);

        var listResponse = await client.GetAsync("/api/todos?completed=true", cancellationToken);
        listResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<List<TodoItemDto>>(JsonOptions, cancellationToken);
        Assert.NotNull(list);
        Assert.All(list!, item => Assert.True(item.IsCompleted));
    }

    [Fact]
    public async Task SearchFiltersByTitleOrNotesAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var databaseName = $"todos_{Guid.NewGuid():N}";

        using var factory = CreateFactory(databaseName);
        using var client = factory.CreateClient();

        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Alpha task", "needle note", null, null),
            cancellationToken);
        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Needle title", null, null, null),
            cancellationToken);
        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Other", "no match", null, null),
            cancellationToken);

        var listResponse = await client.GetAsync("/api/todos?q=needle&pageSize=100", cancellationToken);
        listResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<List<TodoItemDto>>(JsonOptions, cancellationToken);
        Assert.NotNull(list);
        Assert.Equal(2, list!.Count);
        Assert.Contains(list, item => item.Title == "Alpha task");
        Assert.Contains(list, item => item.Title == "Needle title");
    }

    [Fact]
    public async Task SortByDueOrdersSoonestFirstAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var databaseName = $"todos_{Guid.NewGuid():N}";

        using var factory = CreateFactory(databaseName);
        using var client = factory.CreateClient();

        var now = DateTimeOffset.UtcNow;
        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("No due", null, null, null),
            cancellationToken);
        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Due tomorrow", null, now.AddDays(1), null),
            cancellationToken);
        _ = await client.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("Due today", null, now, null),
            cancellationToken);

        var listResponse = await client.GetAsync("/api/todos?sort=due&pageSize=100", cancellationToken);
        listResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<List<TodoItemDto>>(JsonOptions, cancellationToken);
        Assert.NotNull(list);
        Assert.Equal(3, list!.Count);

        Assert.Equal("Due today", list[0].Title);
        Assert.Equal("Due tomorrow", list[1].Title);
        Assert.Equal("No due", list[2].Title);
    }

    private WebApplicationFactory<Program> CreateFactory(string databaseName)
    {
        var connectionString = BuildConnectionString(databaseName);

        Environment.SetEnvironmentVariable("ConnectionStrings__database", connectionString);

        return new WebApplicationFactory<Program>();
    }

    private string BuildConnectionString(string databaseName)
    {
        var builder = new SqlConnectionStringBuilder(_fixture.ConnectionString)
        {
            InitialCatalog = databaseName
        };

        return builder.ConnectionString;
    }

    private sealed record CreateTodoRequest(string? Title, string? Notes, DateTimeOffset? DueDate, int? SortOrder);

    private sealed record UpdateTodoRequest(
        string? Title,
        string? Notes,
        DateTimeOffset? DueDate,
        int? SortOrder,
        bool? IsCompleted,
        bool ClearDueDate = false);

    private sealed record TodoItemDto(
        int Id,
        string Title,
        string? Notes,
        bool IsCompleted,
        int SortOrder,
        DateTimeOffset? DueDate,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);
}
