"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DocArticle } from "@/data/docs-content";
import { useTranslation } from "@/lib/i18n/useTranslation";

function normalize(value: string) {
	return value.toLowerCase();
}

type DocsSearchProps = { topics: DocArticle[] };

export function DocsSearch({ topics }: DocsSearchProps) {
	const { t, dir, locale } = useTranslation();
	const [query, setQuery] = useState("");

	const results = useMemo(() => {
		const normalizedQuery = normalize(query.trim());
		if (!normalizedQuery) return topics;

		return topics.filter((topic) => {
			const haystack = [
				topic.title,
				topic.summary,
				topic.category,
				topic.tags.join(" "),
				topic.body.join(" "),
			]
				.map(normalize)
				.join(" ");
			return haystack.includes(normalizedQuery);
		});
	}, [query, topics]);

	return (
		<div className="space-y-6" dir={dir} lang={locale}>
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
					{t("marketing.docsSearch.label")}
					<Input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("marketing.docsSearch.placeholder")}
						className="h-11"
					/>
				</label>
			</div>
			<div className="grid gap-6 md:grid-cols-2">
				{results.map((topic) => (
					<article
						key={topic.id}
						className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm"
					>
						<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
							<Badge variant="outline">{topic.category}</Badge>
							<span>{topic.tags.join(t("marketing.docsSearch.tagSeparator"))}</span>
						</div>
						<h3 className="mt-3 text-xl font-semibold text-foreground">
							{topic.title}
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">{topic.summary}</p>
						<ul className="mt-4 space-y-3 text-sm text-muted-foreground">
							{topic.body.map((paragraph, index) => (
								<li key={index} className="leading-relaxed">
									{paragraph}
								</li>
							))}
						</ul>
						{topic.actions && topic.actions.length > 0 && (
							<div className="mt-6 flex flex-wrap gap-3 text-sm">
								{topic.actions.map((action) => (
									<Link
										key={action.href}
										href={action.href}
										className="font-medium text-primary underline-offset-4 hover:underline"
									>
										{action.label}
									</Link>
								))}
							</div>
						)}
					</article>
				))}
				{results.length === 0 && (
					<div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
						{t("marketing.docsSearch.empty", { query })}
					</div>
				)}
			</div>
		</div>
	);
}
