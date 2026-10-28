# Restore the LLM spy after each workspace synthesis test

`01M5GRYQY7ZAK975G44M0G6T6N` · task/bug · **done**

workspaceSynthesis.test.ts spies on callLLMFromUI in stubLLM() and never restores the spy.
