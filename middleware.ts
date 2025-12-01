// 認証機能は後で実装するため、一時的に無効化
// import { withAuth } from "next-auth/middleware";

// export default withAuth({
//   callbacks: {
//     authorized: ({ token }) => !!token,
//   },
//   pages: {
//     signIn: "/login",
//   },
// });

// export const config = {
//   matcher: ["/", "/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
// };

// 認証なしでアクセス可能にするためのダミーミドルウェア
export default function middleware() {
  // 何もしない
}

export const config = {
  matcher: [],
};

