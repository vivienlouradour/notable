using Notable.Identity.Common;

namespace Notable.CouchDb.UnitTests.Infrastructure;

internal sealed class FixedCurrentUser(Guid id) : ICurrentUser
{
    public Guid Id => id;
}