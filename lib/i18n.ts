"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const supportedLocales = ["en", "fr"] as const;
export type Locale = (typeof supportedLocales)[number];
export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

const french = {
  Journal: "Journal",
  "I agree to receive occasional insights by email and accept the":
    "J’accepte de recevoir occasionnellement des analyses par e-mail et j’accepte la",
  "Unsubscribe anytime.": "Désabonnez-vous à tout moment.",
  Language: "Langue",
  English: "Anglais",
  French: "Français",
  "Skip to content": "Aller au contenu",
  "Aureon home": "Accueil Aureon",
  "Main navigation": "Navigation principale",
  "Mobile navigation": "Navigation mobile",
  "The Aureon approach": "L’approche Aureon",
  "Investment plans": "Offres d’investissement",
  "Market insights": "Analyses de marché",
  "Our security": "Notre sécurité",
  "Video guides": "Guides vidéo",
  "Aureon card concepts": "Concepts de cartes Aureon",
  "AUREON-branded gold Visa and black Mastercard front and back concepts": "Concepts recto et verso de cartes Visa dorées et Mastercard noires à l’identité AUREON",
  "THE AUREON CARD CONCEPT": "LE CONCEPT DE CARTE AUREON",
  "Our signature.": "Notre signature.",
  "A new dimension.": "Une nouvelle dimension.",
  "Gold and charcoal finishes. The AUREON mark. Explore our Visa and Mastercard design concepts in 3D, with front and back views crafted around the company’s identity.": "Des finitions dorées et anthracite. La marque AUREON. Découvrez nos concepts de cartes Visa et Mastercard en 3D, avec des vues recto et verso conçues autour de l’identité de l’entreprise.",
  "Choose your design preference, submit a pre-launch application and follow its preliminary review in your investor workspace.": "Choisissez votre design préféré, déposez une demande de pré-lancement et suivez son examen préliminaire dans votre espace investisseur.",
  "PRE-LAUNCH APPLICATIONS ONLY": "DEMANDES DE PRÉ-LANCEMENT UNIQUEMENT",
  "These cards are not issued and cannot be used for payments. No issuing-bank or network partnership is confirmed. Future availability and international use depend on an approved issuing program and country eligibility.": "Ces cartes ne sont pas émises et ne permettent aucun paiement. Aucun partenariat avec une banque émettrice ou un réseau n’est confirmé. Leur disponibilité future et leur utilisation internationale dépendent d’un programme d’émission approuvé et des pays admissibles.",
  "Explore the card designs": "Découvrir les designs de cartes",
  "Apply for pre-launch review": "Demander un examen de pré-lancement",
  "How value is generated": "Les sources de valeur",
  "Switch to light mode": "Activer le thème clair",
  "Switch to dark mode": "Activer le thème sombre",
  "Log in": "Connexion",
  "Get started": "Commencer",
  "Open menu": "Ouvrir le menu",
  "Close menu": "Fermer le menu",
  "DIGITAL WEALTH, REIMAGINED": "LE PATRIMOINE NUMÉRIQUE, RÉINVENTÉ",
  "A HIGHER STANDARD OF DIGITAL WEALTH":
    "UNE NOUVELLE EXIGENCE POUR LE PATRIMOINE NUMÉRIQUE",
  "Your wealth.": "Votre patrimoine.",
  "A new": "Un nouveau",
  "perspective.": "regard.",
  "Beyond the noise. Beyond the ordinary.":
    "Au-delà du bruit. Au-delà de l’ordinaire.",
  "A considered approach to digital assets, designed":
    "Une approche réfléchie des actifs numériques, conçue",
  "for those who see further.": "pour ceux qui voient plus loin.",
  "Explore opportunities": "Explorer les possibilités",
  "Security in the details": "La sécurité dans les détails",
  "A global perspective": "Une vision internationale",
  "PRECISION IN EVERY ORBIT": "LA PRÉCISION À CHAQUE ORBITE",
  "THE AUREON SPHERE — 001": "LA SPHÈRE AUREON — 001",
  "THE LONG VIEW ↗": "VOIR PLUS LOIN ↗",
  "A WORLD OF POSSIBILITY.": "UN MONDE DE POSSIBILITÉS.",
  "AN EXCEPTIONAL JOURNEY STARTS WITH PERSPECTIVE.":
    "UN PARCOURS D’EXCEPTION COMMENCE PAR UNE VISION.",
  "SCROLL TO DISCOVER": "DÉFILER POUR DÉCOUVRIR",
  "THE AUREON APPROACH": "L’APPROCHE AUREON",
  "Built on conviction.": "Bâti sur des convictions.",
  "Designed for clarity.": "Pensé pour la clarté.",
  "In a world that moves fast, perspective is everything.":
    "Dans un monde qui s’accélère, le recul fait la différence.",
  "We bring intention, clarity, and considered design":
    "Nous apportons intention, clarté et soin",
  "to your digital investment journey.":
    "à votre parcours d’investissement numérique.",
  "Confidence, by design.": "La confiance, dès la conception.",
  "Clear records. Deliberate controls. A transparent view of every step, from verification to settlement.":
    "Des registres clairs. Des contrôles réfléchis. Une vue transparente de chaque étape, de la vérification au règlement.",
  "Explore our security": "Découvrir notre sécurité",
  "Your ambition. Your approach.": "Votre ambition. Votre approche.",
  "Five distinct investment tiers. One considered experience. Explore an allocation that fits your perspective.":
    "Cinq niveaux d’investissement distincts. Une expérience réfléchie. Explorez une allocation adaptée à votre vision.",
  "Find your investment plan": "Trouver votre offre d’investissement",
  "A more personal perspective.": "Une perspective plus personnelle.",
  "Your portfolio in focus. Your decisions in context. A workspace built around the way you see the future.":
    "Votre portefeuille au premier plan. Vos décisions en contexte. Un espace conçu autour de votre vision de l’avenir.",
  "Discover your workspace": "Découvrir votre espace",
  "A COLLECTION OF OPPORTUNITIES": "UN ÉVENTAIL DE POSSIBILITÉS",
  "For every ambition,": "Pour chaque ambition,",
  "a considered path.": "un parcours réfléchi.",
  "Discover all five plans": "Découvrir les cinq offres",
  "THE FIRST CHAPTER": "LE PREMIER CHAPITRE",
  "A NEW PERSPECTIVE": "UN NOUVEAU REGARD",
  "THE SIGNATURE COLLECTION": "LA COLLECTION SIGNATURE",
  "Your first step towards a broader perspective.":
    "Votre premier pas vers une vision plus large.",
  "An elevated approach to your next chapter.":
    "Une approche plus ambitieuse pour votre prochain chapitre.",
  "A considered allocation. A wider horizon.":
    "Une allocation réfléchie. Un horizon plus vaste.",
  day: "jour",
  "7 days": "7 jours",
  "ILLUSTRATIVE TARGET RATE": "TAUX CIBLE INDICATIF",
  "Investment range": "Montant de l’investissement",
  "Investment duration": "Durée de l’investissement",
  Explore: "Découvrir",
  "A clear perspective on risk. Target returns are illustrative and never guaranteed.":
    "Une vision claire des risques. Les rendements cibles sont indicatifs et ne sont jamais garantis.",
  "Read our risk disclosure": "Lire notre déclaration des risques",
  "YOUR NEXT CHAPTER": "VOTRE PROCHAIN CHAPITRE",
  "An intentional start.": "Un départ réfléchi.",
  "A wider horizon.": "Un horizon plus vaste.",
  "A clear path from your first question":
    "Un parcours clair, de votre première question",
  "to your next investment decision.":
    "à votre prochaine décision d’investissement.",
  "Begin your journey": "Commencer votre parcours",
  "Make it yours.": "Créez votre espace.",
  "Create your account, verify your email, and set up your security preferences.":
    "Créez votre compte, vérifiez votre adresse e-mail et configurez vos préférences de sécurité.",
  "Establish your foundation.": "Posez vos fondations.",
  "Complete identity verification and review the investment terms and risks.":
    "Effectuez la vérification d’identité et consultez les conditions d’investissement et les risques.",
  "Move with perspective.": "Avancez avec une vision claire.",
  "Once approved, fund your account and manage your allocations from one clear workspace.":
    "Après approbation, approvisionnez votre compte et gérez vos allocations dans un espace clair.",
  "THE AUREON PERSPECTIVE": "LA VISION AUREON",
  "Modern investing.": "Investir aujourd’hui.",
  "More perspective.": "Prendre du recul.",
  "We believe modern investing should make room for informed decisions. Our approach brings investment information, account records and practical guidance into one connected experience.": "Nous pensons que l’investissement moderne doit favoriser des décisions éclairées. Notre approche réunit les informations sur les investissements, les données du compte et des guides pratiques dans une expérience cohérente.",
  "Understand before allocating.": "Comprendre avant d’investir.",
  "Explore plan terms, business activities and risks before committing funds. Our guides bring the process into view, from account setup to withdrawal requests.": "Explorez les conditions des offres, les activités de l’entreprise et les risques avant d’engager des fonds. Nos guides expliquent les étapes, de la création du compte aux demandes de retrait.",
  "Explore the investor journey": "Découvrir le parcours investisseur",
  "Follow each step.": "Suivre chaque étape.",
  "Review deposit instructions and transaction statuses in your workspace. Available funds, committed capital and illustrative targets are shown separately, so an estimate is never mistaken for money you can withdraw.": "Consultez les instructions de dépôt et le statut des transactions dans votre espace. Les fonds disponibles, le capital engagé et les objectifs indicatifs sont présentés séparément afin de distinguer une estimation des sommes pouvant être retirées.",
  "Watch the workspace guides": "Voir les guides de l’espace investisseur",
  "Stay in control.": "Garder le contrôle.",
  "Enable authenticator protection, review account activity and contact support when you need clarification. Sensitive financial actions require additional authentication, and funding requests follow an operator review process.": "Activez la protection par authentificateur, consultez l’activité du compte et contactez l’assistance pour toute question. Les opérations financières sensibles nécessitent une authentification supplémentaire et les demandes de financement sont examinées par un opérateur.",
  "Understand account protection": "Comprendre la protection du compte",
  "A considered investment starts with a clear view of the opportunity, the process and the risk.": "Un investissement réfléchi commence par une vision claire de l’opportunité, du processus et du risque.",
  "Read our company profile": "Lire notre présentation d’entreprise",
  "CLARITY COMES FIRST": "LA CLARTÉ AVANT TOUT",
  "A few questions.": "Quelques questions.",
  "Considered answers.": "Des réponses réfléchies.",
  "An informed decision starts with": "Une décision éclairée commence par",
  "a better understanding.": "une meilleure compréhension.",
  "Visit our help center": "Consulter notre centre d’aide",
  "What makes Aureon different?": "Qu’est-ce qui distingue Aureon ?",
  "Aureon brings investment records, digital-asset deposit instructions, and portfolio tracking into one considered workspace. You see what is settled, what is pending, and what is a target estimate.":
    "Aureon réunit les registres d’investissement, les instructions de dépôt d’actifs numériques et le suivi du portefeuille dans un espace réfléchi. Vous voyez ce qui est réglé, en attente ou estimé à titre indicatif.",
  "How do the investment plans work?":
    "Comment fonctionnent les offres d’investissement ?",
  "Each plan specifies an investment range, duration, and target rate. Review the plan and risk disclosure before allocating funds. Target returns are illustrative, are not guaranteed, and are separate from your available balance.":
    "Chaque offre précise une fourchette d’investissement, une durée et un taux cible. Consultez l’offre et la déclaration des risques avant d’allouer des fonds. Les rendements cibles sont indicatifs, non garantis et distincts de votre solde disponible.",
  "How are deposits verified?": "Comment les dépôts sont-ils vérifiés ?",
  "You submit the transaction hash and selected network. An authorized operator must independently verify the transfer and its confirmations before crediting the ledger. A submitted hash alone never increases your balance.":
    "Vous soumettez le hash de la transaction et le réseau choisi. Un opérateur autorisé doit vérifier indépendamment le transfert et ses confirmations avant de créditer le registre. Le simple envoi d’un hash n’augmente jamais votre solde.",
  "Can I withdraw my funds?": "Puis-je retirer mes fonds ?",
  "Verified users can request withdrawals from their available balance when funding is enabled. Requests are reviewed, and the transaction hash is recorded when a payment is sent. Funds allocated to an active investment are unavailable until settled.":
    "Les utilisateurs vérifiés peuvent demander un retrait sur leur solde disponible lorsque les opérations de financement sont activées. Les demandes sont examinées et le hash de transaction est enregistré à l’envoi du paiement. Les fonds alloués à un investissement actif restent indisponibles jusqu’au règlement.",
  "A PERSPECTIVE WORTH SHARING": "UNE VISION À PARTAGER",
  "Stay a step": "Gardez une longueur",
  "ahead.": "d’avance.",
  "Occasional insights. A considered point of view. Delivered to you.":
    "Des analyses occasionnelles. Un point de vue réfléchi. Directement dans votre boîte mail.",
  "Your email address": "Votre adresse e-mail",
  "Subscribe to insights": "S’abonner aux analyses",
  "By subscribing, you agree to our privacy policy. Unsubscribe anytime.":
    "En vous abonnant, vous acceptez notre politique de confidentialité. Désabonnez-vous à tout moment.",
  "You’re on the list. Thank you for your interest.":
    "Votre inscription est enregistrée. Merci de votre intérêt.",
  "Please try again.": "Veuillez réessayer.",
  "A considered approach.": "Une approche réfléchie.",
  "An extraordinary perspective.": "Une perspective d’exception.",
  EXPLORE: "DÉCOUVRIR",
  "About Aureon": "À propos d’Aureon",
  "Company profile": "Profil de l’entreprise",
  "YOUR CONFIDENCE": "VOTRE CONFIANCE",
  "Security & custody": "Sécurité et conservation",
  "Support & FAQs": "Assistance et FAQ",
  "Risk disclosure": "Déclaration des risques",
  "TAKE THE NEXT STEP": "PASSEZ À L’ÉTAPE SUIVANTE",
  "Create an account": "Créer un compte",
  "Investor access": "Espace investisseur",
  "Speak with us": "Nous contacter",
  "INVEST WITH PERSPECTIVE.": "INVESTISSEZ AVEC DISCERNEMENT.",
  "Digital assets involve substantial risk, including the possible loss of your entire investment. Target returns are illustrative and are not guaranteed. Past performance does not indicate future results. Review all terms and risks before investing.":
    "Les actifs numériques présentent des risques importants, dont la perte possible de la totalité de votre investissement. Les rendements cibles sont indicatifs et non garantis. Les performances passées ne préjugent pas des résultats futurs. Consultez toutes les conditions et tous les risques avant d’investir.",
  "Aureon. All rights reserved.": "Aureon. Tous droits réservés.",
  Privacy: "Confidentialité",
  "Terms of service": "Conditions d’utilisation",
  "AML policy": "Politique de lutte contre le blanchiment",
  "A DIFFERENT PERSPECTIVE ON WEALTH ↗":
    "UN AUTRE REGARD SUR LE PATRIMOINE ↗",
  "A DIFFERENT PERSPECTIVE": "UN AUTRE REGARD",
  "Your ambition.": "Votre ambition.",
  "A clearer": "Un horizon",
  "horizon.": "plus clair.",
  "A considered approach to digital assets, with the tools to keep you in control.":
    "Une approche réfléchie des actifs numériques, avec les outils pour garder le contrôle.",
  "Security at every step": "La sécurité à chaque étape",
  "Our approach": "Notre approche",
  "Back to home": "Retour à l’accueil",
  Terms: "Conditions",
  "WELCOME BACK": "HEUREUX DE VOUS RETROUVER",
  "Your next move starts here.": "Votre prochaine étape commence ici.",
  "Sign in to manage your portfolio and explore what comes next.":
    "Connectez-vous pour gérer votre portefeuille et découvrir la suite.",
  "Build your next chapter.": "Construisez votre prochain chapitre.",
  "Create your account. Take the first step toward a more considered portfolio.":
    "Créez votre compte. Faites le premier pas vers un portefeuille plus réfléchi.",
  "ACCOUNT RECOVERY": "RÉCUPÉRATION DU COMPTE",
  "A fresh start.": "Un nouveau départ.",
  "Enter the email address linked to your account. We’ll send you a secure password reset link.":
    "Saisissez l’adresse e-mail liée à votre compte. Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.",
  "Make it yours again.": "Reprenez le contrôle.",
  "Choose a strong, unique password to keep your account protected.":
    "Choisissez un mot de passe robuste et unique pour protéger votre compte.",
  "ONE MORE STEP": "ENCORE UNE ÉTAPE",
  "A good beginning.": "Un bon début.",
  "Confirm your email address to complete your account registration.":
    "Confirmez votre adresse e-mail pour terminer votre inscription.",
  Password: "Mot de passe",
  "Confirm password": "Confirmer le mot de passe",
  "New password": "Nouveau mot de passe",
  "Confirm new password": "Confirmer le nouveau mot de passe",
  "Show password": "Afficher le mot de passe",
  "Hide password": "Masquer le mot de passe",
  "Please wait": "Veuillez patienter",
  "Something went wrong. Please try again.":
    "Une erreur est survenue. Veuillez réessayer.",
  "Sign in could not be completed. Please try again.":
    "La connexion n’a pas pu aboutir. Veuillez réessayer.",
  "Enter the 6-digit code from your authenticator app to finish signing in.":
    "Saisissez le code à 6 chiffres de votre application d’authentification pour terminer la connexion.",
  "Authentication code": "Code d’authentification",
  "Email address": "Adresse e-mail",
  "Enter your password": "Saisissez votre mot de passe",
  "Secure sign in": "Connexion sécurisée",
  "Forgot password?": "Mot de passe oublié ?",
  "Verify & sign in": "Vérifier et se connecter",
  "Sign in to your account": "Se connecter à votre compte",
  "Use a different account": "Utiliser un autre compte",
  "YOUR NEXT CHAPTER STARTS HERE": "VOTRE PROCHAIN CHAPITRE COMMENCE ICI",
  "New to Aureon?": "Vous découvrez Aureon ?",
  "Your passwords do not match.": "Vos mots de passe ne correspondent pas.",
  "Check your inbox.": "Consultez votre boîte mail.",
  "Open your verification link to confirm your email address. If you cannot find the email, check your spam folder.":
    "Ouvrez le lien de vérification pour confirmer votre adresse e-mail. Si vous ne trouvez pas le message, consultez vos courriers indésirables.",
  "Continue to sign in": "Passer à la connexion",
  "Need a new verification link?": "Besoin d’un nouveau lien de vérification ?",
  "Full name": "Nom complet",
  "Your full name": "Votre nom complet",
  "Create a strong password": "Créez un mot de passe robuste",
  "At least 12 characters": "Au moins 12 caractères",
  "Re-enter your password": "Saisissez à nouveau votre mot de passe",
  "Have a referral code?": "Vous avez un code de parrainage ?",
  "Referral code": "Code de parrainage",
  "(optional)": "(facultatif)",
  "Enter referral code": "Saisissez le code de parrainage",
  "I agree to the": "J’accepte les",
  "Terms of Service": "Conditions d’utilisation",
  and: "et la",
  "Privacy Policy": "Politique de confidentialité",
  ". I understand that investing involves risk.":
    ". Je comprends que l’investissement comporte des risques.",
  "Create your account": "Créer votre compte",
  "Already have an account?": "Vous avez déjà un compte ?",
  "Sign in": "Se connecter",
  "For your security, reset links expire. Check your spam folder if the message has not arrived.":
    "Pour votre sécurité, les liens de réinitialisation expirent. Consultez vos courriers indésirables si le message n’est pas arrivé.",
  "Back to sign in": "Retour à la connexion",
  "Send reset link": "Envoyer le lien de réinitialisation",
  "Remember your password?": "Vous vous souvenez de votre mot de passe ?",
  "A fresh link is needed.": "Un nouveau lien est nécessaire.",
  "Open the password reset link from your email, or request a new one below.":
    "Ouvrez le lien de réinitialisation reçu par e-mail ou demandez-en un nouveau ci-dessous.",
  "Request reset link": "Demander un lien de réinitialisation",
  "Password updated.": "Mot de passe mis à jour.",
  "Sign in securely": "Se connecter en toute sécurité",
  "Re-enter your new password":
    "Saisissez à nouveau votre nouveau mot de passe",
  "Update password": "Mettre à jour le mot de passe",
  "Request a new reset link": "Demander un nouveau lien de réinitialisation",
  "Look for our email.": "Retrouvez notre e-mail.",
  "Open the verification link we sent when you registered to confirm your email address.":
    "Ouvrez le lien de vérification envoyé lors de votre inscription pour confirmer votre adresse e-mail.",
  "If you cannot find it, check your spam folder or request a new link.":
    "Si vous ne le trouvez pas, consultez vos courriers indésirables ou demandez un nouveau lien.",
  "Email confirmed.": "Adresse e-mail confirmée.",
  "Unable to verify.": "Vérification impossible.",
  "Confirming your email…": "Confirmation de votre adresse e-mail…",
  "This should only take a moment.": "Cela ne devrait prendre qu’un instant.",
  "Contact support": "Contacter l’assistance",
  "Send verification link": "Envoyer le lien de vérification",
  "Preparing your secure session…": "Préparation de votre session sécurisée…",
} as const;
export type TranslationKey = keyof typeof french;

/** Unknown copy, including untranslated server messages, stays in canonical English. */
export function translate(locale: Locale, text: string): string {
  return locale === "fr" && Object.hasOwn(french, text)
    ? french[text as TranslationKey]
    : text;
}

type LocalePreferences = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};
export const useLocale = create<LocalePreferences>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        if (isLocale(locale)) set({ locale });
      },
    }),
    {
      name: "aureon-language",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ locale: state.locale }),
      merge: (persisted, current) => {
        const locale = (persisted as { locale?: unknown } | undefined)?.locale;
        return { ...current, locale: isLocale(locale) ? locale : "en" };
      },
      // Server and first client render use English; hydrate after mount without markup mismatch.
      skipHydration: true,
    },
  ),
);

export function useTranslation() {
  const locale = useLocale((state) => state.locale);
  const t = useCallback((text: string) => translate(locale, text), [locale]);
  return { locale, t };
}
