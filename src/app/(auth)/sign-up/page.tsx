import { SignUpForm } from "@/auth/nextjs/components/SignUpForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getConfiguredOAuthProviders,
  providerDisplayNames,
} from "@/auth/core/oauth/providers"

export default function SignUp() {
  const providers = getConfiguredOAuthProviders().map(provider => ({
    provider,
    label: providerDisplayNames[provider],
  }))

  return (
    <div className="container mx-auto p-4 max-w-[750px]">
      <Card>
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpForm providers={providers} />
        </CardContent>
      </Card>
    </div>
  )
}
