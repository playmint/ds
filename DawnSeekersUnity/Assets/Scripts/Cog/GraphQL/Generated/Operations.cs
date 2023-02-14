namespace Cog.GraphQL.Generated {

    public class GetAccountGQL {
      /// <summary>
      /// GetAccountGQL.Request 
      /// <para>Required variables:<br/> { id=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetAccountDocument,
          OperationName = "getAccount",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetAccountGQL() {
        return Request();
      }
      
      public static string GetAccountDocument = @"
        query getAccount($id: String!) {
          account(id: $id) {
            id
            address
            seekers {
              id
            }
            sessions {
              id
            }
          }
        }
        ";
    }
    

    public class GetAccountsGQL {
      /// <summary>
      /// GetAccountsGQL.Request 
      /// <para>Required variables:<br/> {  }</para>
      /// <para>Optional variables:<br/> { owner=(string) }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetAccountsDocument,
          OperationName = "getAccounts",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetAccountsGQL() {
        return Request();
      }
      
      public static string GetAccountsDocument = @"
        query getAccounts($owner: String) {
          accounts(owner: $owner) {
            id
            address
          }
        }
        ";
    }
    

    public class SignupGQL {
      /// <summary>
      /// SignupGQL.Request 
      /// <para>Required variables:<br/> { account=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = SignupDocument,
          OperationName = "signup",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getSignupGQL() {
        return Request();
      }
      
      public static string SignupDocument = @"
        mutation signup($account: String!) {
          signup(account: $account)
        }
        ";
    }
    

    public class SigninGQL {
      /// <summary>
      /// SigninGQL.Request 
      /// <para>Required variables:<br/> { account=(string), session=(string), authorization=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = SigninDocument,
          OperationName = "signin",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getSigninGQL() {
        return Request();
      }
      
      public static string SigninDocument = @"
        mutation signin($account: String!, $session: String!, $authorization: String!) {
          signin(account: $account, session: $session, authorization: $authorization)
        }
        ";
    }
    

    public class MintSeekerGQL {
      /// <summary>
      /// MintSeekerGQL.Request 
      /// <para>Required variables:<br/> { account=(string), session=(string), authorization=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = MintSeekerDocument,
          OperationName = "mintSeeker",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getMintSeekerGQL() {
        return Request();
      }
      
      public static string MintSeekerDocument = @"
        mutation mintSeeker($account: String!, $session: String!, $authorization: String!) {
          mintSeeker(account: $account, session: $session, authorization: $authorization)
        }
        ";
    }
    
}