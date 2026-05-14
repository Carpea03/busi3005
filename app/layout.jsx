import './globals.css';

export const metadata = {
  title: 'BUSI3005 — AI for Business Transformation',
  description: 'Adelaide University course hub: group formation, workshop quizzes, lecturer dashboard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
