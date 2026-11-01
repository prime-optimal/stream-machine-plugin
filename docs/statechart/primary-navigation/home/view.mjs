export const title = "Home: choose and resume work";
const names = {
  opening: "Open Stream Machine", home: "Home: tasks and recent work",
  selected: "Task, recipe, or recent item selected", workspace: "Selected workspace",
  connections: "Connections: keep selected task",
};
export const state = (v) => names[v.phase];
const steps = {
  ShowHome: "show Home without provider calls", ChooseTask: "choose a task",
  ChooseRecipe: "choose a recipe", ChooseRecent: "resume recent work",
  OpenWorkspace: "open selected workspace", OpenConnections: "open setup for selected task",
  ReturnToTask: "return to selected workspace", ReturnHome: "return Home with context saved",
  WaitForUser: "wait for user",
};
export const step = (action) => steps[action] ?? action;
