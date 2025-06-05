using Notable.Auth.Models.Domain;

namespace Notable.CouchDb
{
    internal static class CouchDbHelper
    {
        private const string CouchDbUserDbNameFormat = "user_{0}";

        public static string GetUserDbUrl(string couchDbBaseUrl, User user)
        {
            var dbName = string.Format(CouchDbUserDbNameFormat, GetFormattedUserName(user));

            return $"{couchDbBaseUrl}/{dbName}";
        }

        private static string GetFormattedUserName(User user)
        {
            return user.Name.ToLowerInvariant().Replace(" ", "-");
        }
    }
}
