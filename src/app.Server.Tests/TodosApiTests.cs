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
