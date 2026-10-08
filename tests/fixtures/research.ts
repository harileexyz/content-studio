export const draft = {
  title: "Safer dictionary access",
  script:
    "Use dictionary get to read a key without a missing-key error. Try a default value when the key is absent.",
  headline: "Handle missing keys",
  points: [{ text: "Choose a default", sourceIndices: [0] }],
  sources: [
    {
      title: "Python dictionary methods",
      url: "https://docs.python.org/3/library/stdtypes.html#dict.get",
      claims: ["get returns the default for missing keys."],
    },
  ],
  captions: {
    youtube_short: "Read missing keys with a default.",
    instagram_reel: "Try dictionary get.",
    instagram_feed_post: "Choose a default for missing keys.",
  },
  limitations: ["This example was not executed."],
  kind: "evergreen",
  eventDate: null,
};
