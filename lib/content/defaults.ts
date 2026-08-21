/**
 * Default editorial copy.
 *
 * IMPORTANT: nothing here states a fact about MONARCHS MC that has not been
 * supplied by the club. There are no founding dates, chapters, member counts,
 * officer names, locations, achievements or charitable claims. The copy
 * describes values and intent — statements the club itself will replace
 * through Admin → Settings → Page content.
 *
 * Every key below maps to a `sections` entry on pages/{pageId} in Firestore.
 */

export interface EditableSection {
  key: string;
  label: string;
  help: string;
  multiline: boolean;
  fallback: string;
}

export const HOME_SECTIONS: EditableSection[] = [
  {
    key: "heroKicker",
    label: "Hero kicker",
    help: "Small label above the club name in the hero.",
    multiline: false,
    fallback: "Motorcycle Club",
  },
  {
    key: "introTitle",
    label: "Introduction heading",
    help: "The heading of the first section under the hero.",
    multiline: false,
    fallback: "We ride together, or not at all",
  },
  {
    key: "introBody",
    label: "Introduction body",
    help: "Two or three sentences introducing the club. Replace with the club's own words.",
    multiline: true,
    fallback:
      "MONARCHS MC is a motorcycle club. What that means to us is simple: we look after the riders beside us, we keep our word, and we treat the road with the respect it demands.\n\nEverything else — the runs, the meets, the miles — grows out of that.",
  },
  {
    key: "missionTitle",
    label: "Community heading",
    help: "Heading for the community and mission section.",
    multiline: false,
    fallback: "Beyond the ride",
  },
  {
    key: "missionBody",
    label: "Community body",
    help: "How the club connects to its community. Replace with the club's actual activity.",
    multiline: true,
    fallback:
      "A club is measured by what it puts back. We show up for the people around us — riders and neighbours alike — and we hold ourselves to the same standard off the bike as on it.\n\nUse the admin area to describe the work this club actually does, and it will appear here.",
  },
];

export const ABOUT_SECTIONS: EditableSection[] = [
  {
    key: "storyTitle",
    label: "Our story heading",
    help: "Heading for the club's story.",
    multiline: false,
    fallback: "Our story",
  },
  {
    key: "storyBody",
    label: "Our story body",
    help: "The club's own history, in the club's own words. This copy is a placeholder until it is written.",
    multiline: true,
    fallback:
      "This section is where MONARCHS MC tells its own history — how the club started, who started it, and what it has become.\n\nWe have deliberately left it blank rather than invent it. An officer can write it in the admin area at any time and it will appear here.",
  },
  {
    key: "philosophyTitle",
    label: "Philosophy heading",
    help: "Heading for the philosophy section.",
    multiline: false,
    fallback: "Our philosophy",
  },
  {
    key: "philosophyBody",
    label: "Philosophy body",
    help: "What the club believes about riding and about each other.",
    multiline: true,
    fallback:
      "Riding is the reason we met. It is not the reason we stay.\n\nA motorcycle demands attention, judgement and humility — the same things a club demands. We ride in formation because it is safer. We ride as one because it is who we are.",
  },
  {
    key: "identityTitle",
    label: "Club identity heading",
    help: "Heading for the identity section.",
    multiline: false,
    fallback: "Club identity",
  },
  {
    key: "identityBody",
    label: "Club identity body",
    help: "What the colours, the name and the emblem mean to this club.",
    multiline: true,
    fallback:
      "The name, the emblem and the colours carry meaning that the club defines for itself. This section is where that meaning is set down.\n\nAn officer can record it in the admin area.",
  },
];

export const BROTHERHOOD_SECTIONS: EditableSection[] = [
  {
    key: "lede",
    label: "Opening statement",
    help: "The opening statement of the brotherhood page.",
    multiline: true,
    fallback:
      "Brotherhood is not a word we use lightly. It is the agreement that the rider ahead of you is watching the road for you, and the rider behind you is watching your back.",
  },
  {
    key: "responsibilityBody",
    label: "Responsibility",
    help: "What members owe one another.",
    multiline: true,
    fallback:
      "Every member carries the club's name. That is a responsibility before it is a privilege — on the road, at a meet, and anywhere the colours are seen.\n\nWe hold each other to it, plainly and without ceremony.",
  },
  {
    key: "respectBody",
    label: "Respect",
    help: "How the club treats riders, neighbours and the road.",
    multiline: true,
    fallback:
      "Respect is practical. It means riding within your ability and telling the truth about what that is. It means giving way, giving warning, and giving time.\n\nIt means treating other riders — in this club or any other — the way we would want our own treated.",
  },
  {
    key: "cultureBody",
    label: "Riding culture",
    help: "The club's riding culture.",
    multiline: true,
    fallback:
      "We ride in all weather and we ride to arrive. Formation, spacing, hand signals and a briefing before every run are not formalities — they are the difference between a ride and an incident.\n\nNew riders are taught, not tested.",
  },
];

export const JOIN_SECTIONS: EditableSection[] = [
  {
    key: "intro",
    label: "Join introduction",
    help: "What a prospective member should know before applying.",
    multiline: true,
    fallback:
      "Membership of MONARCHS MC is by application and review. Submitting this form starts a conversation — it does not create an account and it does not make you a member.\n\nAn officer will read every application. If it is a fit, we will contact you about the next step.",
  },
  {
    key: "expectations",
    label: "What we look for",
    help: "The qualities and commitments the club expects.",
    multiline: true,
    fallback:
      "- A valid motorcycle licence and a bike you ride regularly\n- Insurance and a machine kept in roadworthy condition\n- Respect for other riders, road users and the club's name\n- The willingness to show up — for runs, for meets, and for each other",
  },
];

export const CONTACT_SECTIONS: EditableSection[] = [
  {
    key: "intro",
    label: "Contact introduction",
    help: "What visitors should know before writing.",
    multiline: true,
    fallback:
      "Questions about the club, an event, media, or riding with us? Send a message and it will reach an officer.\n\nIf you are asking about membership, the application form gives us what we need to answer properly.",
  },
];

/** The four principles shown on the homepage and the brotherhood page. */
export const PRINCIPLES = [
  {
    index: "01",
    title: "Loyalty",
    body: "You stand by the people you ride with. Not conditionally, and not only when it is convenient.",
  },
  {
    index: "02",
    title: "Respect",
    body: "For the machine, for the road, for other riders, and for the name on your back.",
  },
  {
    index: "03",
    title: "Brotherhood",
    body: "A club is people. Everything else — the runs, the colours, the miles — follows from that.",
  },
  {
    index: "04",
    title: "The Ride",
    body: "The reason all of it exists. Ridden properly, ridden together, ridden with intent.",
  },
] as const;

export const SECTION_REGISTRY: Record<string, EditableSection[]> = {
  home: HOME_SECTIONS,
  about: ABOUT_SECTIONS,
  brotherhood: BROTHERHOOD_SECTIONS,
  join: JOIN_SECTIONS,
  contact: CONTACT_SECTIONS,
};
