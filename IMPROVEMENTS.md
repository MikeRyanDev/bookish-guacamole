# Improvements

## Learning

With automatic learning, there's the ability to do automatic skill injection to inject the list of skills. The Intelligence SDK has methods that afford this. Please wire up automatic skill ingestion into the coding agent.

## UI

I did not intend for the frontend to be a CLI. Please entirely remove the CLI from this starter template.

Instead, I want you to implement a cohesive frontend

## Tooling

Please lean into modern tooling as much as possible. Take a look at what void0 is doing, for example (the company behind Vue I think). I want the build tooling to feel ultra modern, with very fast compilation times.

I also want to see best-in-class React conventions used and included in the sample via Repo-level skills. In fact, please make sure this starter is primed with all of the skills a developer would need to get started.

It's critical this is wired into agent tooling. Make sure AGENTS.md is appropriately scaffolded. Find and pick, again, best in class.

Make sure the local docs are primed for agents as well.

## Frontend

We need to completely reimagine the user interface. Obviously use the @copilotkit/react-core/v2 package to consume that Runtime. NEVER use v1 APIs.

For all React code, lean into functional, reactive programming. CRITICALLY, use and prefer latest, best TanStack libraries wherever possible.

The starter template should be for building your own coding agent. With that in mind, I want you to work on a UI design that makes sense for sophisticated developers building their own coding agent. It should be plain, minimal, clean, elegant. Not too much whitespace. Power user flavored. Light mode and dark mode. NO text labels unless absolutely necessary to the UX. Use the $imagegen tool to create concepts, moodboards, and individual designs for each component you will need to create or style. Work until you've fully built out a list of components for the user interface, each of them where you've cared about the craft and quality. Take inspiration from the UI/UX for Linear.

Be considerate of accessibility. Think about every detail of how elements animate, disable, hover, etc.

Use CopilotKit's generative UI features, but only a few of them. Probably useInterrupt for permissions, I think that'd be a neat one.

## Northstar

Remember, we are building a _starter_ template here. The goal is for sophisticated developers to get up and running building their own coding agents entirely on TanStack AI, CopilotKit, and CopilotKit Intelligence.

## Inspector

Make sure the CopilotKit Inspector is enabled in the frontend.

## TanStack Virtual Scroll

The output of the agent should work such that it automatically scrolls down to the bottom as new content streams in, _unless_ I've scrolled up a little and I'm exploring. Smart anchor behavior.

Also make sure the contents use virtual scroll. I'm certain TanStack as a utility for building virtual scroll views for this exact situation where the content is dynamic in size.

Also, please make the tool call renderer prettier when the command is a bash command. I want to see what the command looks like.

## Patches Tool

Please design a really pretty display for the patch command when that goes by on the screen.

## Read File Tool

Please design a really pretty display for the patch command when that goes by on the screen.

## Change Workspace

There must be a way to change my workspace, create new named workspaces, and manage my workspaces. Build out a fully workspace feautre. Again, design it intentioanlly using our encoded design philosophy and process.

---

## NEW!

## Tool Approval Redesign

When I have to approve Patch or Bash or whatever, it could look significantly better and match the other tool renderers.

## Routing

When I click on a thread by name, the thread list flickers. Makes me think it's re-rendering. Come up with a much better way to handle routing that keeps that element stable.

## Animations

Please add thoughtful animations that make the UX delightful.

## "Jump to Latest"

When i hover over this button, it turns into a square.

## README.md

Completely rewrite this. target audience? developer getting started with the starter template. Introduce them to what's going on, how to interact with it, how to get setup, etc. Research high quality README.md's.

## Replace Vercel

NO VERCEL references. Please replace the Vercel React best practices skill with a high quality, non-Vercel alternative.
