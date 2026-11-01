using Notable.Identity.Common;

namespace Notable.CouchDb.Helpers;

internal static class CouchDbHelper
{
    private const string CouchDbUserDbNameFormat = "db_user_{0}";

    public static string GetUserDbUrl(string couchDbBaseUrl, ICurrentUser user)
    {
        var dbName = string.Format(CouchDbUserDbNameFormat, GetFormattedUserName(user));

        return $"{couchDbBaseUrl}/{dbName}";
    }

    private static string GetFormattedUserName(ICurrentUser user)
    {
        return user.Id.ToString();
    }
}
