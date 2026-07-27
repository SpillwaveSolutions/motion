# TopicRefiner/ContentInjector/TOCGenerator/SkillGenerator need llmClient.ts routing before UI wiring

`01KYJW5XJ5HTG7ESZ7DDDS8W0C` · subtask/bug · **open**

These modules call cliWrappers.ts's callLLM directly, which uses Bun.spawn -- only callable from a real Bun process, never from browser-executed React code (Bun is undefined in the browser; confirmed via typeof Bun === 'undefined' in a live browser test).
