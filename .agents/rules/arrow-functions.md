# Rule: Arrow Functions for All New Functions

All new functions created across the codebase (both frontend and backend) MUST be defined as **arrow functions**.

## Syntax

```typescript
// ALWAYS: use arrow function syntax for all new functions
export const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// React component / helper
export const MyComponent: React.FC<Props> = ({ title }) => {
  const handleClick = (): void => {
    // ...
  };

  return <button onClick={handleClick}>{title}</button>;
};

// Fastify route handler / service helper
export const getPatientById = async (patientId: string): Promise<Patient> => {
  // ...
};
```

## Anti-Pattern (Do NOT use `function` declarations for new functions)

```typescript
// NEVER: traditional function keyword for new functions
function calculateTotal(items: Item[]): number {
  // ...
}
```
