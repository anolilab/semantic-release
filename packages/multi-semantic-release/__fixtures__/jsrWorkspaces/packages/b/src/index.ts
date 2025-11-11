import { greet } from "msr-test-jsr-a";

export function farewell(name: string): string {
    const greeting = greet(name);
    return `${greeting} Goodbye!`;
}
