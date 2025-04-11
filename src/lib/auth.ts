import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

export const NEXT_AUTH_CONFIG: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text", placeholder: "name@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.username || !credentials?.password) {
          console.error("Missing username or password");
          return null;
        }

        try {
          console.log(`Authorizing user: ${credentials.username} with password`);
          
          const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
                query GetUserByEmail($email: String!, $password: String!) {
                  user {
                    getUserByEmail(email: $email, password: $password) {
                      id
                      email
                      role
                    }
                  }
                }
              `,
              variables: {
                email: credentials.username,
                password: credentials.password,
              },
            }),
          });

          const { data, errors } = await response.json();
          
          console.log("Auth response:", JSON.stringify({ data, errors }, null, 2));
          
          if (errors || !data?.user?.getUserByEmail) {
            console.error("Authentication failed:", errors || "User not returned");
            return null; // Reject login
          }

          const user = data.user.getUserByEmail;
          console.log("User authenticated:", user.id);
          
          // Return a well-formed user object with ALL required fields
          return {
            id: user.id,
            name: user.email.split('@')[0], // Use part of email as name if needed
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Error in authorization:", error);
          return null; // Reject login
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login', // Error path redirects to login
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Debug the JWT token creation
    jwt: async ({ token, user }: any) => {
      console.log("JWT Callback - User:", user ? { id: user.id, role: user.role } : "No user");
      
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      
      console.log("JWT Callback - Token:", { uid: token.uid, role: token.role });
      return token;
    },
    
    // Debug the session creation
    session: ({ session, token }: any) => {
      console.log("Session Callback - Token:", { uid: token.uid, role: token.role });
      
      if (token && session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      
      console.log("Session Callback - Session user:", session.user);
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
}