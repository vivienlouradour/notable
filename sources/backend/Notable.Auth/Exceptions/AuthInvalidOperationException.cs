namespace Notable.Auth.Exceptions
{
    public class AuthInvalidOperationException : AuthException
    {
        public static AuthInvalidOperationException NoLogin => new("Login is not handled by application in this auth mode.");

        public AuthInvalidOperationException()
            : base ("Invalid auth operation.")
        {
        }

        public AuthInvalidOperationException(string message) : base($"Invalid auth operation : {message}")
        {
        }
    }
}
