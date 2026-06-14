export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      {children}
    </div>
  );
}
