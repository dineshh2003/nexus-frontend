import { ApolloClient,ApolloProvider,InMemoryCache } from "@apollo/client";

export const client = new ApolloClient({
    uri: "https://nexus-backend-uts0.onrender.com/graphql",
    cache: new InMemoryCache()
})