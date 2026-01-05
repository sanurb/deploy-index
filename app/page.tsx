"use client";

import { ArrowRight, Building2, Package, Search, Shield } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      {/* Hero Section */}
      <main className="flex flex-1 flex-col">
        <section className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-24 text-center">
          <div className="flex flex-col gap-6">
            <h1 className="font-extrabold text-4xl tracking-tight sm:text-5xl md:text-6xl">
              <span className="font-extrabold">Deploy</span>
              <span className="font-normal"> Index</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Centralize, standardize, and govern information about all software
              deployed within your organization&apos;s infrastructure.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="font-bold text-3xl tracking-tight">
                Why Deploy Index?
              </h2>
              <p className="mt-4 text-muted-foreground">
                A single source of truth for all deployed software
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <Package className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Software Inventory</CardTitle>
                  <CardDescription>
                    Track all deployed applications, services, and system
                    components in one place.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Search className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Search & Filter</CardTitle>
                  <CardDescription>
                    Quickly find software by name, owner, repository, domain, or
                    environment.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Access Control</CardTitle>
                  <CardDescription>
                    Invitation-based access with role-based permissions for
                    secure collaboration.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Building2 className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>Organization Scoped</CardTitle>
                  <CardDescription>
                    Multi-team ownership with clear accountability and
                    governance.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-16">
          <div className="container mx-auto px-4">
            <Card className="mx-auto max-w-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  Ready to get started?
                </CardTitle>
                <CardDescription>
                  Join your organization&apos;s software inventory platform.
                  Request an invitation or sign up to create your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/auth/sign-up">
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
