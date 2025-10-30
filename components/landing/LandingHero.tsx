"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import IconFeather from "@/components/ui/IconFeather";

type LandingHeroProps = {
  title?: string;
  subtitle?: string;
};

export function LandingHero({
  title = "Doodle",
  subtitle = "Minimal notes, todos and an AI agent."
}: LandingHeroProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await authClient.signIn.social({ provider: "google", callbackURL: "/notes" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 text-center sm:px-8">
        <IconFeather aria-label="Doodle" size="48px" />
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Button onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? "Signing in…" : "Continue with Google"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default LandingHero;


