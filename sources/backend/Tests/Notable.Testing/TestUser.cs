namespace Notable.Testing;

public record TestUser(Guid Id, string Email, string? Password = null, string DisplayName = "Test User");
