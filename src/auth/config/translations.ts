type TranslationDictionary = Record<string, string>;

type TranslationConfig = {
    defaultLocale: string;
    messages: Record<string, TranslationDictionary>;
};

const translationConfig: TranslationConfig = {
    defaultLocale: "en",
    messages: {
        en: {},
    },
};

export function configureTranslations(config: Partial<TranslationConfig>) {
    if (config.defaultLocale) {
        translationConfig.defaultLocale = config.defaultLocale;
    }
    if (config.messages) {
        translationConfig.messages = {
            ...translationConfig.messages,
            ...config.messages,
        };
    }
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function authMessage(
    key: string,
    defaultMessage: string,
    replacements?: Record<string, string>,
): string {
    const { defaultLocale, messages } = translationConfig;
    const dictionary = messages[defaultLocale] ?? {};
    const template = dictionary[key] ?? defaultMessage;

    if (!replacements) {
        return template;
    }

    return Object.entries(replacements).reduce((acc, [name, value]) => {
        const pattern = new RegExp(`\\{${escapeRegExp(name)}\\}`, "g");
        return acc.replace(pattern, value);
    }, template);
}
