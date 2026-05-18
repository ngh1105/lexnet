export function getPassportPublicationCopy() {
  return {
    publicationModelCopy:
      "Draft passports are calculated from reviewed case history. Create publish records to enable privacy-safe public previews.",
    publishButtonLabel: "Create publish records",
    draftPassportNote:
      "No publish record yet. Create a publish record to enable the public preview.",
  } as const;
}
