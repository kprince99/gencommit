#!/usr/bin/env node

"use strict";

import { execSync } from "child_process";
import { checkGitRepository, getUserPromptFromConsole, getStagedDiff} from "./helpers.js";
import gemini from "./models/gemini.js";
import { AI_PROVIDER, MODEL, args } from "./config.js";

const language = args.language || "english";
const apiKey = process.env.API_KEY;

if (AI_PROVIDER == "gemini" && !apiKey) {
  console.error("Please set the Gemini_API KEY in the environment variable.");
  process.exit(1);
}

const provider = gemini;

const makeCommit = (input) => {
  console.log("Committing Message...");
  execSync(`git commit -F -`, { input });
  console.log("Commit Successful! 🎉");
};

const getPromptForCommit = (diff) => {
  return provider.getPromptForSingleCommit(diff, { language });
};

const generateCommit = async (diff) => {
  const prompt = getPromptForCommit(diff);
  // console.log(prompt);
  console.log("Generating commit message... 🤖");

  const text = await provider.generatePrompt(prompt, { apiKey, model: MODEL });

  if (!text) {
    console.log("Sorry, I can't generate a commit message. 😔");
    process.exit(1);
  }

  console.log(
    `Here is yout Commit Message: \n -------------------------------------\n
    ${text}
    \n---------------------------------------`
  );

  let answer;

  do {
    answer = await getUserPromptFromConsole(
      "Do you want to push this commit? [y/n] "
    );
    if (answer !== "y" && answer !== "n") {
      console.log("Please enter correct value [y/n]");
    }
  } while (answer !== "y" && answer !== "n");

  if (answer === "n") {
    console.log("Commit aborted by user.");
    process.exit(1);
  } else {
    makeCommit(text);
  }
};


async function generateAICommit() {
  const isGitRepository = checkGitRepository();

  if (!isGitRepository) {
    console.error("This is not a git repository.");
    process.exit(1);
  }

  const staged = await getStagedDiff();

  if (!staged.diff) {
    console.log("No changes to commit 🙅");
    console.log("Forgot to add files. Try git add . and then script again");
    process.exit(1);
  }

  await generateCommit(staged.diff);
}

await generateAICommit();
