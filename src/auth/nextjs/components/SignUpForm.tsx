"use client"

import { authMessage } from "@/auth/config"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { oAuthSignIn, signUp } from "../actions"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { signUpSchema } from "../schemas"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import type { OAuthProvider } from "@/auth/tables"

type OAuthOption = {
  provider: OAuthProvider
  label: string
}

type SignUpFormProps = {
  providers: OAuthOption[]
}

export function SignUpForm({ providers }: SignUpFormProps) {
  const [error, setError] = useState<string>()
  const [oauthError, setOauthError] = useState<string>()
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    const error = await signUp(data)
    setError(error)
  }

  async function handleOAuthClick(provider: OAuthProvider) {
    setOauthError(undefined)
    const result = await oAuthSignIn(provider)
    if (result && "error" in result && result.error) {
      setOauthError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && <p className="text-destructive">{error}</p>}
        {oauthError && <p className="text-destructive">{oauthError}</p>}
        {providers.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {providers.map(option => (
              <Button
                key={option.provider}
                type="button"
                onClick={async () => await handleOAuthClick(option.provider)}
              >
                {authMessage("auth.oauth.providerButton", option.label, {
                  provider: option.label,
                  providerKey: option.provider,
                })}
              </Button>
            ))}
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {authMessage("auth.signUp.nameLabel", "Name")}
              </FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {authMessage("auth.signUp.emailLabel", "Email")}
              </FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {authMessage("auth.signUp.passwordLabel", "Password")}
              </FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4 justify-end">
          <Button asChild variant="link">
            <Link href="/sign-in">
              {authMessage("auth.signUp.toSignIn", "Sign In")}
            </Link>
          </Button>
          <Button type="submit">
            {authMessage("auth.signUp.submit", "Sign Up")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
