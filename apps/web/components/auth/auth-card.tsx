import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

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
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="spark" />
          </span>
          <span>
            Interview<span className="brand-ai">AI</span>
          </span>
        </div>
        <div>
          <p className="eyebrow">PREPARE FOR WHAT’S NEXT</p>
          <h2>
            Your next chapter
            <br />
            starts with
            <br />
            <em>confidence.</em>
          </h2>
          <p>
            A space to practice, find your voice, and walk into your next
            interview ready.
          </p>
          <div className="auth-steps">
            <span>
              <Icon name="briefcase" /> Choose your role
            </span>
            <span>
              <Icon name="chat" /> Practice with AI
            </span>
            <span>
              <Icon name="chart" /> Learn and improve
            </span>
          </div>
        </div>
        <p className="auth-footer">
          Small steps today. Stronger answers tomorrow.
        </p>
      </section>
      <section className="auth-form-side">
        <div className={cn("auth-card", className)}>
          <span className="auth-form-icon">
            <Icon name="spark" />
          </span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <p className="auth-note">Your own pace. Your next opportunity.</p>
        </div>
      </section>
    </main>
  );
}
