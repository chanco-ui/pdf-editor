import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // メールアドレスのドメインをチェック
      const email = user.email;
      const allowedDomain = process.env.ALLOWED_DOMAIN || "it-plusone.com";

      if (!email) {
        return false;
      }

      // @it-plusone.com ドメインのみ許可
      if (!email.endsWith(`@${allowedDomain}`)) {
        return false;
      }

      return true;
    },
    async session({ session, token }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

