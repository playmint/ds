using Cog.GraphQL;

namespace AMMDemo.GraphQL.Generated {

    public class GetGameGQL {
      /// <summary>
      /// GetGameGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetGameDocument,
          OperationName = "getGame",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetGameGQL() {
        return Request();
      }
      
      public static string GetGameDocument = @"
        query getGame($gameID: ID!) {
          game(id: $gameID) {
            id
          }
        }
        ";
    }
    

    public class GetSessionsByOwnerGQL {
      /// <summary>
      /// GetSessionsByOwnerGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), owner=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetSessionsByOwnerDocument,
          OperationName = "getSessionsByOwner",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetSessionsByOwnerGQL() {
        return Request();
      }
      
      public static string GetSessionsByOwnerDocument = @"
        query getSessionsByOwner($gameID: ID!, $owner: String!) {
          game(id: $gameID) {
            router {
              sessions(owner: $owner) {
                id
              }
            }
          }
        }
        ";
    }
    

    public class GetSessionByIdGQL {
      /// <summary>
      /// GetSessionByIdGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), session=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetSessionByIdDocument,
          OperationName = "getSessionByID",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetSessionByIdGQL() {
        return Request();
      }
      
      public static string GetSessionByIdDocument = @"
        query getSessionByID($gameID: ID!, $session: ID!) {
          game(id: $gameID) {
            router {
              session(id: $session) {
                owner
                expires
              }
            }
          }
        }
        ";
    }
    

    public class GetSeekersGQL {
      /// <summary>
      /// GetSeekersGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetSeekersDocument,
          OperationName = "getSeekers",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetSeekersGQL() {
        return Request();
      }
      
      public static string GetSeekersDocument = @"
        query getSeekers($gameID: ID!) {
          game(id: $gameID) {
            state {
              seekers: nodes(kinds: [""SEEKER""]) {
                id
                kind: attributeString(name: ""kind"")
                position: node(rel: ""HAS_LOCATION"", kinds: [""TILE""]) {
                  x: attributeInt(name: ""x"")
                  y: attributeInt(name: ""y"")
                }
              }
            }
          }
        }
        ";
    }
    

    public class GetTransactionByIdGQL {
      /// <summary>
      /// GetTransactionByIdGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), id=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = GetTransactionByIdDocument,
          OperationName = "getTransactionByID",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getGetTransactionByIdGQL() {
        return Request();
      }
      
      public static string GetTransactionByIdDocument = @"
        query getTransactionByID($gameID: ID!, $id: ID!) {
          game(id: $gameID) {
            router {
              transaction(id: $id) {
                id
                status
                batch {
                  block
                  tx
                }
              }
            }
          }
        }
        ";
    }
    

    public class SigninGQL {
      /// <summary>
      /// SigninGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), session=(string), auth=(string) }</para>
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
        mutation signin($gameID: ID!, $session: String!, $auth: String!) {
          signin(gameID: $gameID, session: $session, ttl: 1000, scope: ""0xffffffff"", authorization: $auth)
        }
        ";
    }
    

    public class SignoutGQL {
      /// <summary>
      /// SignoutGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), session=(string), auth=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = SignoutDocument,
          OperationName = "signout",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getSignoutGQL() {
        return Request();
      }
      
      public static string SignoutDocument = @"
        mutation signout($gameID: ID!, $session: String!, $auth: String!) {
          signout(gameID: $gameID, session: $session, authorization: $auth)
        }
        ";
    }
    

    public class DispatchGQL {
      /// <summary>
      /// DispatchGQL.Request 
      /// <para>Required variables:<br/> { gameID=(string), action=(string), auth=(string) }</para>
      /// <para>Optional variables:<br/> {  }</para>
      /// </summary>
      public static GraphQLRequest Request(object variables = null) {
        return new GraphQLRequest {
          Query = DispatchDocument,
          OperationName = "dispatch",
          Variables = variables
        };
      }

      /// <remarks>This method is obsolete. Use Request instead.</remarks>
      public static GraphQLRequest getDispatchGQL() {
        return Request();
      }
      
      public static string DispatchDocument = @"
        mutation dispatch($gameID: ID!, $action: String!, $auth: String!) {
          dispatch(gameID: $gameID, action: $action, authorization: $auth) {
            id
            status
          }
        }
        ";
    }
    
}