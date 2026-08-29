import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto mt-16 w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-black md:text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
