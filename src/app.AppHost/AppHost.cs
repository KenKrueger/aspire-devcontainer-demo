var builder = DistributedApplication.CreateBuilder(args);

var sql = builder.AddSqlServer("sql")
    .WithLifetime(ContainerLifetime.Persistent);

var db = sql.AddDatabase("database");

var server = builder.AddProject<Projects.app_Server>("server")
    .WithReference(db)
    .WaitFor(db)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithUrlForEndpoint("https", url =>
    {
        url.DisplayText = "Scalar (HTTPS)";
        url.Url = "/scalar/v1";
    });


var clientgen = builder.AddJavaScriptApp("clientgen", "../frontend", runScriptName: "openapi-ts")
    .WithPnpm()
    .WithEnvironment("OPENAPI_URL", $"{server.GetEndpoint("https")}/openapi/v1.json")
    .WaitFor(server);

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithPnpm()
    .WithReference(server)
    .WaitFor(server)
    .WithOpenApiClientCommand(server.GetEndpoint("https"));

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
