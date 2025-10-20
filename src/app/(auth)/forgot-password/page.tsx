import { authMessage } from "@/auth/config";
import { ForgotPasswordForm } from "@/auth/nextjs/components/ForgotPasswordForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
	return (
		<div className="container mx-auto p-4 max-w-[650px]">
			<Card>
				<CardHeader>
					<CardTitle>
						{authMessage("passwordReset.forgot.title", "Forgot password")}
					</CardTitle>
					<CardDescription>
						{authMessage(
							"passwordReset.forgot.description",
							"Enter the email on your account and we will send a 6-digit reset code.",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ForgotPasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
