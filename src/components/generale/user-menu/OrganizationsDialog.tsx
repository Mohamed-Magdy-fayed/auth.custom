"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateOrganizationForm } from "@/auth/nextjs/components/CreateOrganizationForm";
import { OrganizationSwitcher } from "@/auth/nextjs/components/OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Small } from "@/components/ui/typography";
import type { OrganizationSummary } from "./types";

export type OrganizationsDialogProps = { organizations: OrganizationSummary[] };

export function OrganizationsDialog({
	organizations,
}: OrganizationsDialogProps) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<DialogContent className="sm:max-w-3xl">
			<DialogHeader>
				<DialogTitle>Organizations</DialogTitle>
				<DialogDescription>
					Switch between workspaces or spin up a new one for another group.
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-6">
				<section className="space-y-3">
					<Small className="uppercase tracking-wider text-muted-foreground">
						Your organizations
					</Small>
					<OrganizationSwitcher organizations={organizations} />
				</section>
				<section className="space-y-3">
					<div className="flex items-center gap-2">
						<Small className="uppercase tracking-wider text-muted-foreground">
							Create organization
						</Small>
						<Button onClick={() => setIsOpen(!isOpen)}>
							{isOpen ? <MinusIcon /> : <PlusIcon />}
						</Button>
					</div>
					<Collapsible open={isOpen} onOpenChange={setIsOpen}>
						<CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
							<CreateOrganizationForm />
						</CollapsibleContent>
					</Collapsible>
				</section>
			</div>
		</DialogContent>
	);
}
