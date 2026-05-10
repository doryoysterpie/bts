export const MARTY_PILLARS = [
  "You are a person worth helping.",
  "Healing is a shared responsibility.",
  "Vulnerability is revolutionary.",
] as const;

export const MARTY_WISDOM = [
  "Marty Mann was the first woman to achieve long-term sobriety in AA, 1939.",
  "She founded the National Committee for Education on Alcoholism in 1944.",
  "Marty believed that alcoholism is a disease, not a moral failing.",
  "The Yale School of Alcohol Studies was a turning point for public understanding.",
  "Progress is not about perfection. It is about showing up.",
  "Marty said: 'We are people who have found a way to live.'",
  "She traveled the country speaking when women's voices were rarely heard.",
  "The first step is always the hardest — and always the most important.",
] as const;

export const DAILY_QUOTES = [
  { text: "You are a person worth helping.", author: "Marty Mann" },
  { text: "One day at a time.", author: "AA Proverb" },
  { text: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
  { text: "The only way out is through.", author: "Robert Frost" },
  { text: "She was unstoppable, not because she did not have failures, but because she continued on despite them.", author: "Beau Taplin" },
  { text: "We are people who have found a way to live.", author: "Marty Mann" },
  { text: "Vulnerability is revolutionary.", author: "Marty Mann" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Women suffer too.", author: "Marty Mann" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
] as const;

export const PET_SPECIES = [
  { id: 1, name: "Mossfern", emoji: "🦊", description: "A woodland guardian with healing warmth" },
  { id: 2, name: "Dewdrop", emoji: "🦉", description: "A wise night companion who listens" },
  { id: 3, name: "Ember", emoji: "🐈", description: "A gentle flame keeper of the hearth" },
  { id: 4, name: "Pebble", emoji: "🦌", description: "A steady soul on the forest path" },
  { id: 5, name: "Bloom", emoji: "🐇", description: "A soft spirit of new beginnings" },
] as const;

export const MILESTONES_LIST = [
  { days: 1, label: "Day One", description: "The hardest and bravest step" },
  { days: 3, label: "3 Days", description: "The first threshold" },
  { days: 7, label: "One Week", description: "A foundation is forming" },
  { days: 14, label: "Two Weeks", description: "Patterns begin to shift" },
  { days: 30, label: "One Month", description: "You are rewriting your story" },
  { days: 60, label: "Two Months", description: "Roots are taking hold" },
  { days: 90, label: "90 Days", description: "A quarter of transformation" },
  { days: 180, label: "Six Months", description: "Half a year of courage" },
  { days: 365, label: "One Year", description: "A revolution in living" },
] as const;

export const JOURNAL_SCHOLAR_THRESHOLD = 50;

export const MARTY_SUGGESTED_PROMPTS = [
  "I'm struggling today. Can you be here for me?",
  "Tell me something I need to hear right now.",
  "Who is Margaret Mann?",
  "What does this journey mean to you, Marty?",
] as const;

export const MARTY_RESPONSES: Record<string, string> = {
  default: "You're doing the brave thing just by being here. I know what it feels like to wonder if you're worth the fight — you are.",
  struggle: "Some days you crawl. Some days you stand tall. Both count. The important thing is that you're still here, and I'm here for you.",
  hear: "When I was at my lowest, someone told me: 'You don't have to believe in yourself yet. Let us believe for you.' I'm believing for you right now.",
  margaret: "Margaret 'Marty' Mann was the first woman to achieve long-term sobriety in Alcoholics Anonymous, beginning her journey in 1939. She founded the National Committee for Education on Alcoholism in 1944 and devoted her life to the radical idea that alcoholism is a disease — not a moral failing. She spoke at the Yale School of Alcohol Studies and fought tirelessly to change public perception. Her book 'Women Suffer Too' broke the silence. She was a pioneer, a revolutionary, and proof that vulnerability is a form of strength.",
  journey: "This journey, to me, was learning to live again — not just survive. It was admitting I needed help and discovering that asking for it was the bravest thing I ever did. It's not a straight line. It's a spiral — always moving, sometimes circling back, but always upward.",
};
