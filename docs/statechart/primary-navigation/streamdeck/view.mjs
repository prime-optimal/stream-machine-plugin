export const title = "Stream Deck workspace";
const labels = {
  inventory: "Check devices", unavailable: "Device setup or support needed",
  inspect: "Inspect Stream Machine page", draft: "Edit layout draft", review: "Review changes",
  authorized: "Ready to apply", applying: "Apply once", stored: "Stored configuration verified",
  refused: "Apply refused", unknown: "Outcome unknown", physical: "User confirmed button press",
  released: "Device released",
};
export const state = (v) => labels[v.phase];
const steps = {
  DeviceAvailable: "supported device found", DeviceUnavailable: "device missing or unsupported",
  CheckAgain: "check devices again", ChooseRecipe: "choose a recipe", ReviewDraft: "preview changes",
  EditDraft: "edit draft and clear approval", Authorize: "authorize this preview", Apply: "press Apply",
  ApplyVerified: "stored configuration matches", ApplyRefused: "rejected before USB takeover",
  OutcomeUnknown: "acknowledgment is lost", ReviseAfterRefusal: "revise and preview again",
  InspectOriginal: "check original attempt and verify stored configuration",
  ConfirmPhysicalPress: "test button and confirm", Release: "release device and confirm cleanup",
  ReturnToInventory: "inspect page again", Navigate: "leave or return without device action", Wait: "wait for user",
};
export const step = (action) => steps[action] ?? action;
